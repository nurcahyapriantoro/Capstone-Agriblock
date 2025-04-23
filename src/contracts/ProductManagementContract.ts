import { SmartContract } from './ISmartContract';
import { Level } from 'level';
import { UserRole, ProductStatus, RecallReason } from '../enum';
import { ContractRegistry } from './ContractRegistry';

/**
 * Product data structure
 */
interface ProductData {
  id: string;
  ownerId: string;
  status: ProductStatus;
  name: string;
  description?: string;
  quantity?: number;
  price?: number;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Product verification criteria
 */
interface VerificationCriteria {
  qualityChecks: string[];
  requiredAttributes: string[];
  minimumStandards: Record<string, any>;
}

/**
 * Verification result
 */
interface VerificationResult {
  passes: boolean;
  issues: string[];
}

/**
 * Product management operation result
 */
interface ProductResult {
  success: boolean;
  message?: string;
  product?: ProductData;
  transactionId?: string;
}

/**
 * Smart contract for product management
 * Handles product creation, verification, and recalls
 */
export class ProductManagementContract extends SmartContract {
  // Contract dependency IDs
  private roleValidationContractId: string = 'role-validation-v1';
  private transactionHistoryContractId: string = 'transaction-history-v1';
  
  constructor(stateDB: Level<string, string>) {
    super(
      'product-management-v1',
      'ProductManagement',
      '1.0.0',
      stateDB
    );
  }
  
  /**
   * Initialize the contract
   */
  public async initialize(): Promise<boolean> {
    try {
      // Nothing specific to initialize for this contract
      return true;
    } catch (error) {
      console.error('Failed to initialize ProductManagement contract:', error);
      return false;
    }
  }
  
  /**
   * Execute a contract method
   * @param method Method to execute
   * @param params Method parameters
   * @param sender Identity of the caller
   */
  public async execute(method: string, params: any, sender: string): Promise<any> {
    // Verify sender is authorized to call this method
    const authorized = await this.verifySender(sender, method);
    if (!authorized) {
      throw new Error(`Unauthorized: User ${sender} cannot execute method ${method}`);
    }
    
    switch (method) {
      case 'createProduct':
        return this.createProduct(
          params.name,
          params.description,
          params.quantity,
          params.price,
          params.metadata,
          sender // ownerId is the sender
        );
      case 'updateProductStatus':
        return this.updateProductStatus(
          params.productId,
          params.newStatus,
          sender,
          params.details
        );
      case 'recallProduct':
        return this.recallProduct(
          params.productId,
          params.reason,
          sender,
          params.details
        );
      case 'verifyProduct':
        return this.verifyProduct(
          params.productId,
          params.criteria,
          sender,
          params.details
        );
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }
  
  /**
   * Query contract state
   * @param method Method to query
   * @param params Method parameters
   */
  public async query(method: string, params: any): Promise<any> {
    switch (method) {
      case 'getProduct':
        return this.getProduct(params.productId);
      case 'getProductsByOwner':
        return this.getProductsByOwner(params.ownerId);
      case 'getProductsByStatus':
        return this.getProductsByStatus(params.status);
      case 'getRecalledProducts':
        return this.getRecalledProducts();
      default:
        throw new Error(`Unknown query method: ${method}`);
    }
  }
  
  /**
   * Get schema for this contract's state
   */
  public getStateSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        products: {
          type: 'object',
          patternProperties: {
            '^.*$': {
              type: 'object',
              properties: {
                id: { type: 'string' },
                ownerId: { type: 'string' },
                status: { type: 'string', enum: Object.values(ProductStatus) },
                name: { type: 'string' },
                description: { type: 'string' },
                quantity: { type: 'number' },
                price: { type: 'number' },
                metadata: { type: 'object' },
                createdAt: { type: 'number' },
                updatedAt: { type: 'number' }
              },
              required: ['id', 'ownerId', 'status', 'name', 'createdAt', 'updatedAt']
            }
          }
        },
        ownerProducts: {
          type: 'object',
          patternProperties: {
            '^.*$': {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    };
  }
  
  /**
   * Create a new product
   * @param name Product name
   * @param description Product description
   * @param quantity Initial quantity
   * @param price Product price
   * @param metadata Additional product metadata
   * @param ownerId ID of the initial owner (creator)
   */
  private async createProduct(
    name: string,
    description: string,
    quantity: number,
    price: number,
    metadata: Record<string, any>,
    ownerId: string
  ): Promise<ProductResult> {
    // Validate owner exists and is a farmer
    const userRoleResult = await this.callContract(
      this.roleValidationContractId,
      'query',
      'getUserRole',
      { userId: ownerId },
      null
    );
    
    if (!userRoleResult.success) {
      return {
        success: false,
        message: `Owner validation failed: ${userRoleResult.message}`
      };
    }
    
    if (userRoleResult.role !== UserRole.FARMER) {
      return {
        success: false,
        message: "Only farmers can create new products."
      };
    }
    
    // Generate a unique product ID
    const productId = this.generateProductId();
    
    // Create product data
    const product: ProductData = {
      id: productId,
      ownerId,
      status: ProductStatus.CREATED,
      name,
      description,
      quantity,
      price,
      metadata,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Save product data
    await this.writeState(`product:${productId}`, product);
    
    // Add to owner's products list
    await this.addProductToOwner(productId, ownerId);
    
    // Record creation in transaction history
    const creationRecord = await this.callContract(
      this.transactionHistoryContractId,
      'execute',
      'recordProductCreation',
      {
        productId,
        farmerId: ownerId,
        details: {
          name,
          description,
          quantity,
          price,
          timestamp: product.createdAt
        }
      },
      ownerId
    );
    
    // Emit product creation event
    await this.emitEvent('ProductCreated', {
      productId,
      ownerId,
      name,
      timestamp: product.createdAt
    });
    
    return {
      success: true,
      message: `Product ${productId} created successfully.`,
      product,
      transactionId: creationRecord.transactionId
    };
  }
  
  /**
   * Update a product's status
   * @param productId ID of the product to update
   * @param newStatus New status for the product
   * @param userId ID of the user making the update
   * @param details Additional update details
   */
  private async updateProductStatus(
    productId: string,
    newStatus: ProductStatus,
    userId: string,
    details?: Record<string, any>
  ): Promise<ProductResult> {
    // Get product data
    const product = await this.readState<ProductData>(`product:${productId}`);
    if (!product) {
      return {
        success: false,
        message: `Product with ID ${productId} not found.`
      };
    }
    
    // Verify user role
    const userRoleResult = await this.callContract(
      this.roleValidationContractId,
      'query',
      'getUserRole',
      { userId },
      null
    );
    
    if (!userRoleResult.success) {
      return {
        success: false,
        message: `User validation failed: ${userRoleResult.message}`
      };
    }
    
    const userRole = userRoleResult.role;
    
    // Verify ownership or appropriate role for status updates
    if (product.ownerId !== userId) {
      // Special roles can update status without ownership
      const allowedRoles = [
        UserRole.ADMIN,
        UserRole.INSPECTOR
      ];
      
      if (!allowedRoles.includes(userRole)) {
        return {
          success: false,
          message: "Only the product owner or an authorized inspector/admin can update product status."
        };
      }
    }
    
    // Update product status
    product.status = newStatus;
    product.updatedAt = Date.now();
    
    // Save updated product
    await this.writeState(`product:${productId}`, product);
    
    // Record status update in transaction history
    const updateRecord = await this.callContract(
      this.transactionHistoryContractId,
      'execute',
      'recordProductStatusUpdate',
      {
        productId,
        userId,
        userRole,
        newStatus,
        details: {
          previousStatus: product.status,
          updatedAt: product.updatedAt,
          ...details
        }
      },
      userId
    );
    
    // Emit status update event
    await this.emitEvent('ProductStatusUpdated', {
      productId,
      userId,
      previousStatus: product.status,
      newStatus,
      timestamp: product.updatedAt
    });
    
    return {
      success: true,
      message: `Product ${productId} status updated to ${newStatus}.`,
      product,
      transactionId: updateRecord.transactionId
    };
  }
  
  /**
   * Recall a product due to issues
   * @param productId ID of the product to recall
   * @param reason Reason for the recall
   * @param userId ID of the user initiating the recall
   * @param details Additional recall details
   */
  private async recallProduct(
    productId: string,
    reason: RecallReason,
    userId: string,
    details?: Record<string, any>
  ): Promise<ProductResult> {
    // Get product data
    const product = await this.readState<ProductData>(`product:${productId}`);
    if (!product) {
      return {
        success: false,
        message: `Product with ID ${productId} not found.`
      };
    }
    
    // Verify user role
    const userRoleResult = await this.callContract(
      this.roleValidationContractId,
      'query',
      'getUserRole',
      { userId },
      null
    );
    
    if (!userRoleResult.success) {
      return {
        success: false,
        message: `User validation failed: ${userRoleResult.message}`
      };
    }
    
    const userRole = userRoleResult.role;
    
    // Validate permissions for recall - only the original creator (FARMER), current owner, or admin can recall
    const isFarmer = userRole === UserRole.FARMER;
    const isOwner = product.ownerId === userId;
    const isAdmin = userRole === UserRole.ADMIN;
    
    if (!isFarmer && !isOwner && !isAdmin) {
      return {
        success: false,
        message: "Only the product creator (farmer), current owner, or admin can recall a product."
      };
    }
    
    // Update product status to RECALLED
    product.status = ProductStatus.RECALLED;
    product.updatedAt = Date.now();
    
    // Save updated product
    await this.writeState(`product:${productId}`, product);
    
    // Add to recalled products index
    await this.addToRecalledProducts(productId);
    
    // Record recall in transaction history
    const recallRecord = await this.callContract(
      this.transactionHistoryContractId,
      'execute',
      'recordProductRecall',
      {
        productId,
        userId,
        userRole,
        reason,
        details: {
          recalledBy: userId,
          recallerRole: userRole,
          timestamp: product.updatedAt,
          ...details
        }
      },
      userId
    );
    
    // Emit recall event
    await this.emitEvent('ProductRecalled', {
      productId,
      reason,
      userId,
      userRole,
      timestamp: product.updatedAt
    });
    
    return {
      success: true,
      message: `Product ${productId} has been recalled due to ${reason}.`,
      product,
      transactionId: recallRecord.transactionId
    };
  }
  
  /**
   * Verify a product's authenticity and quality
   * @param productId ID of the product to verify
   * @param criteria Verification criteria
   * @param userId ID of the user verifying the product
   * @param details Additional verification details
   */
  private async verifyProduct(
    productId: string,
    criteria: VerificationCriteria,
    userId: string,
    details?: Record<string, any>
  ): Promise<ProductResult> {
    // Get product data
    const product = await this.readState<ProductData>(`product:${productId}`);
    if (!product) {
      return {
        success: false,
        message: `Product with ID ${productId} not found.`
      };
    }
    
    // Verify user role
    const userRoleResult = await this.callContract(
      this.roleValidationContractId,
      'query',
      'getUserRole',
      { userId },
      null
    );
    
    if (!userRoleResult.success) {
      return {
        success: false,
        message: `User validation failed: ${userRoleResult.message}`
      };
    }
    
    const userRole = userRoleResult.role;
    
    // Only inspectors or admins can verify products
    const allowedRoles = [UserRole.INSPECTOR, UserRole.ADMIN];
    if (!allowedRoles.includes(userRole)) {
      return {
        success: false,
        message: "Only inspectors or admins can verify products."
      };
    }
    
    // Conduct verification against the criteria
    const verificationResult = this.performVerification(product, criteria);
    
    // Update product status based on verification result
    product.status = verificationResult.passes 
      ? ProductStatus.VERIFIED 
      : ProductStatus.VERIFICATION_FAILED;
    
    product.updatedAt = Date.now();
    
    // Save updated product
    await this.writeState(`product:${productId}`, product);
    
    // Record verification in transaction history
    const verificationRecord = await this.callContract(
      this.transactionHistoryContractId,
      'execute',
      'recordProductVerification',
      {
        productId,
        userId,
        userRole,
        passed: verificationResult.passes,
        details: {
          verifiedBy: userId,
          verifierRole: userRole,
          timestamp: product.updatedAt,
          criteria,
          issues: verificationResult.issues,
          ...details
        }
      },
      userId
    );
    
    // Emit verification event
    await this.emitEvent('ProductVerified', {
      productId,
      passed: verificationResult.passes,
      userId,
      userRole,
      issues: verificationResult.issues,
      timestamp: product.updatedAt
    });
    
    return {
      success: true,
      message: verificationResult.passes
        ? `Product ${productId} has been successfully verified.`
        : `Product ${productId} failed verification: ${verificationResult.issues.join(", ")}`,
      product,
      transactionId: verificationRecord.transactionId
    };
  }
  
  /**
   * Get a product by ID
   * @param productId ID of the product to retrieve
   */
  private async getProduct(productId: string): Promise<ProductResult> {
    const product = await this.readState<ProductData>(`product:${productId}`);
    
    if (!product) {
      return {
        success: false,
        message: `Product with ID ${productId} not found.`
      };
    }
    
    return {
      success: true,
      product
    };
  }
  
  /**
   * Get all products owned by a specific user
   * @param ownerId ID of the owner
   */
  private async getProductsByOwner(ownerId: string): Promise<ProductResult> {
    const productIds = await this.readState<string[]>(`owner:${ownerId}:products`) || [];
    const products: ProductData[] = [];
    
    for (const productId of productIds) {
      const product = await this.readState<ProductData>(`product:${productId}`);
      if (product) {
        products.push(product);
      }
    }
    
    return {
      success: true,
      message: `Found ${products.length} products owned by ${ownerId}`
    };
  }
  
  /**
   * Get all products with a specific status
   * @param status Status to filter by
   */
  private async getProductsByStatus(status: ProductStatus): Promise<ProductResult> {
    const statusProductIds = await this.readState<string[]>(`status:${status}:products`) || [];
    const products: ProductData[] = [];
    
    for (const productId of statusProductIds) {
      const product = await this.readState<ProductData>(`product:${productId}`);
      if (product) {
        products.push(product);
      }
    }
    
    return {
      success: true,
      message: `Found ${products.length} products with status ${status}`
    };
  }
  
  /**
   * Get all recalled products
   */
  private async getRecalledProducts(): Promise<ProductResult> {
    return this.getProductsByStatus(ProductStatus.RECALLED);
  }
  
  /**
   * Perform product verification against criteria
   * @param product Product to verify
   * @param criteria Verification criteria
   */
  private performVerification(
    product: ProductData,
    criteria: VerificationCriteria
  ): VerificationResult {
    const issues: string[] = [];
    
    // Check required attributes
    for (const attr of criteria.requiredAttributes) {
      if (!product.metadata || !product.metadata[attr]) {
        issues.push(`Missing required attribute: ${attr}`);
      }
    }
    
    // Check minimum standards
    for (const [standard, minValue] of Object.entries(criteria.minimumStandards)) {
      const productValue = product.metadata?.[standard];
      
      if (productValue === undefined) {
        issues.push(`Missing standard measurement: ${standard}`);
      } else if (typeof productValue === 'number' && productValue < minValue) {
        issues.push(`Below minimum standard for ${standard}: ${productValue} < ${minValue}`);
      }
    }
    
    // Determine pass/fail
    const passes = issues.length === 0;
    
    return {
      passes,
      issues
    };
  }
  
  /**
   * Call another contract
   * @param contractId Contract to call
   * @param callType Type of call (execute or query)
   * @param method Method to call
   * @param params Parameters for the method
   * @param sender Identity of the caller (null for queries)
   */
  private async callContract(
    contractId: string,
    callType: 'execute' | 'query',
    method: string,
    params: any,
    sender: string | null
  ): Promise<any> {
    const registry = ContractRegistry.getInstance();
    
    try {
      if (callType === 'execute' && sender) {
        return await registry.executeContract(contractId, method, params, sender);
      } else if (callType === 'query') {
        return await registry.queryContract(contractId, method, params);
      } else {
        throw new Error('Invalid contract call type or missing sender for execute');
      }
    } catch (error) {
      console.error(`Error calling contract ${contractId}.${method}:`, error);
      throw new Error(`Contract call to ${contractId}.${method} failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Add a product to an owner's product list
   * @param productId ID of the product
   * @param ownerId ID of the owner
   */
  private async addProductToOwner(productId: string, ownerId: string): Promise<void> {
    const ownerProducts = await this.readState<string[]>(`owner:${ownerId}:products`) || [];
    
    if (!ownerProducts.includes(productId)) {
      ownerProducts.push(productId);
      await this.writeState(`owner:${ownerId}:products`, ownerProducts);
    }
  }
  
  /**
   * Add a product to the recalled products index
   * @param productId ID of the recalled product
   */
  private async addToRecalledProducts(productId: string): Promise<void> {
    const recalledProducts = await this.readState<string[]>(`status:${ProductStatus.RECALLED}:products`) || [];
    
    if (!recalledProducts.includes(productId)) {
      recalledProducts.push(productId);
      await this.writeState(`status:${ProductStatus.RECALLED}:products`, recalledProducts);
    }
  }
  
  /**
   * Generate a unique product ID
   */
  private generateProductId(): string {
    return `prod-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
} 