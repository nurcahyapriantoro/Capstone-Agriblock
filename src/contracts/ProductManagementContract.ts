import { SmartContract, LogLevel } from './ISmartContract';
import { Level } from 'level';
import { UserRole, ProductStatus, RecallReason } from '../enum';
import { ContractRegistry } from './ContractRegistry';
import { NotificationService, NotificationType } from '../services/NotificationService';

/**
 * Product data structure
 */
interface ProductData {
  id: string;
  farmerId: string;  // Changed from ownerId to farmerId
  status: ProductStatus;
  name: string;      // Farm/Store name
  productName: string;  // New field for product name
  description?: string;
  initialQuantity?: number;  // Changed from quantity
  quantity?: number;  // Current quantity
  unit?: string;      // New field for unit of measurement
  price?: number;
  productionDate?: string;  // New field
  expiryDate?: string;     // New field
  location?: string;       // New field
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  ownerId?: string;  // Menambahkan ownerId sebagai properti opsional untuk kompatibilitas
  verifications?: VerificationData[]; // List of verifications from different roles
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
 * Verification data from a specific role
 */
interface VerificationData {
  userId: string;
  userRole: UserRole;
  timestamp: number;
  passed: boolean;
  issues?: string[];
  details?: Record<string, any>;
}

/**
 * Consensus verification result
 */
interface ConsensusResult {
  achieved: boolean;
  verifiedRoles: UserRole[];
  totalVerifications: number;
  positiveVerifications: number;
  negativeVerifications: number;
  consensusRatio: number;
  requiredRoles: UserRole[];
  missingRoles: UserRole[];
}

/**
 * Product management operation result
 */
interface ProductResult {
  success: boolean;
  message?: string;
  product?: ProductData;
  transactionId?: string;
  errorCode?: string;  // Adding errorCode property for better error handling
  consensusResult?: ConsensusResult; // Added for verification consensus results
}

/**
 * Smart contract for product management
 * Handles product creation, verification, and recalls
 */
export class ProductManagementContract extends SmartContract {
  // Contract dependency IDs
  private roleValidationContractId: string = 'role-validation-v1';
  private transactionHistoryContractId: string = 'transaction-history-v1';
  
  // Threshold required for consensus (percentage as a decimal, e.g., 0.75 = 75%)
  private consensusThreshold: number = 0.75;
  
  // Minimum number of roles required for consensus
  private minRolesForConsensus: number = 3;
  
  // Roles that should participate in verification
  private verificationRoles: UserRole[] = [
    UserRole.FARMER,
    UserRole.COLLECTOR,
    UserRole.TRADER,
    UserRole.RETAILER
  ];
  
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
          params.farmerId,
          params.name,
          params.productName,
          params.description,
          params.initialQuantity,
          params.unit,
          params.price,
          params.productionDate,
          params.expiryDate,
          params.location,
          params.metadata
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
      case 'checkVerificationConsensus':
        return this.checkVerificationConsensus(
          params.productId
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
        return this.getProductsByOwner(params.farmerId);
      case 'getProductsByStatus':
        return this.getProductsByStatus(params.status);
      case 'getRecalledProducts':
        return this.getRecalledProducts();
      case 'getProductVerifications':
        return this.getProductVerifications(params.productId);
      case 'getVerificationConsensus':
        return this.getVerificationConsensus(params.productId);
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
                farmerId: { type: 'string' },
                status: { type: 'string', enum: Object.values(ProductStatus) },
                name: { type: 'string' },
                productName: { type: 'string' },
                description: { type: 'string' },
                initialQuantity: { type: 'number' },
                quantity: { type: 'number' },
                unit: { type: 'string' },
                price: { type: 'number' },
                productionDate: { type: 'string' },
                expiryDate: { type: 'string' },
                location: { type: 'string' },
                metadata: { type: 'object' },
                createdAt: { type: 'number' },
                updatedAt: { type: 'number' },
                verifications: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      userId: { type: 'string' },
                      userRole: { type: 'string', enum: Object.values(UserRole) },
                      timestamp: { type: 'number' },
                      passed: { type: 'boolean' },
                      issues: { type: 'array', items: { type: 'string' } },
                      details: { type: 'object' }
                    },
                    required: ['userId', 'userRole', 'timestamp', 'passed']
                  }
                }
              },
              required: ['id', 'farmerId', 'status', 'name', 'productName', 'createdAt', 'updatedAt']
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
   * @param farmerId ID of the farmer
   * @param name Farm/store name
   * @param productName Product name
   * @param description Product description
   * @param initialQuantity Initial quantity
   * @param unit Unit of measurement
   * @param price Product price
   * @param productionDate Production date
   * @param expiryDate Expiry date
   * @param location Production location
   * @param metadata Additional product metadata
   */
  private async createProduct(
    farmerId: string,
    name: string,
    productName: string,
    description: string,
    initialQuantity: number,
    unit: string,
    price: number,
    productionDate: string,
    expiryDate: string,
    location: string,
    metadata: Record<string, any>
  ): Promise<ProductResult> {
    // Validasi data produk sebelum dilanjutkan
    const validation = this.validateProductData({
      id: '',  // ID akan dibuat nanti 
      farmerId,
      name,
      productName,
      description,
      initialQuantity,
      quantity: initialQuantity, // Initial quantity equals current quantity at creation
      unit,
      price,
      productionDate,
      expiryDate,
      location,
      metadata,
      status: ProductStatus.CREATED,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    if (!validation.valid) {
      await this.logActivity(
        'ProductValidationFailed',
        { validationErrors: validation.errors, farmerId },
        LogLevel.WARNING
      );
      
      return {
        success: false,
        message: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    // Validate owner exists and is a farmer
    const userRoleResult = await this.callContract(
      this.roleValidationContractId,
      'query',
      'getUserRole',
      { userId: farmerId },
      null
    );
    
    if (!userRoleResult.success) {
      return {
        success: false,
        message: `Farmer validation failed: ${userRoleResult.message}`
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
      farmerId,
      status: ProductStatus.CREATED,
      name,
      productName,
      description,
      initialQuantity,
      quantity: initialQuantity, // Initial quantity equals current quantity at creation
      unit,
      price,
      productionDate,
      expiryDate,
      location,
      metadata,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // Save product data
    await this.writeState(`product:${productId}`, product);
    
    // Add to owner's products list
    await this.addProductToOwner(productId, farmerId);
    
    // Record creation in transaction history
    const creationRecord = await this.callContract(
      this.transactionHistoryContractId,
      'execute',
      'recordProductCreation',
      {
        productId,
        farmerId,
        details: {
          name,
          productName,
          description,
          initialQuantity,
          unit,
          price,
          productionDate,
          expiryDate,
          location,
          timestamp: product.createdAt
        }
      },
      farmerId
    );
    
    // Log the successful creation
    await this.logActivity(
      'ProductCreated',
      {
        productId,
        farmerId,
        name,
        productName,
        timestamp: product.createdAt
      },
      LogLevel.INFO
    );
    
    // Emit product creation event
    await this.emitEvent('ProductCreated', {
      productId,
      farmerId,
      name,
      productName,
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
   * Validate product data to ensure it meets quality standards
   * @param product The product data to validate
   * @returns Validation result with status and any error messages
   */
  private validateProductData(product: ProductData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validasi nama farm/toko
    if (!product.name || product.name.trim().length < 3) {
      errors.push('Farm/store name must be at least 3 characters');
    }
    
    if (product.name && product.name.trim().length > 100) {
      errors.push('Farm/store name must be at most 100 characters');
    }
    
    // Validasi nama produk
    if (!product.productName || product.productName.trim().length < 2) {
      errors.push('Product name must be at least 2 characters');
    }
    
    if (product.productName && product.productName.trim().length > 100) {
      errors.push('Product name must be at most 100 characters');
    }
    
    // Validasi deskripsi
    if (product.description && product.description.trim().length > 500) {
      errors.push('Product description must be at most 500 characters');
    }
    
    // Validasi initialQuantity
    if (product.initialQuantity !== undefined) {
      if (isNaN(product.initialQuantity) || product.initialQuantity <= 0) {
        errors.push('Initial quantity must be a positive number');
      }
      
      if (product.initialQuantity > 1000000) {
        errors.push('Initial quantity is too large (max: 1,000,000)');
      }
    }
    
    // Validasi unit
    if (!product.unit || product.unit.trim().length < 1) {
      errors.push('Unit of measurement is required');
    }
    
    // Validasi harga
    if (product.price !== undefined) {
      if (isNaN(product.price) || product.price < 0) {
        errors.push('Product price must be a positive number');
      }
      
      if (product.price > 1000000000) {
        errors.push('Product price is too large (max: 1,000,000,000)');
      }
    }
    
    // Validasi tanggal produksi
    if (product.productionDate) {
      const prodDate = new Date(product.productionDate);
      if (isNaN(prodDate.getTime())) {
        errors.push('Invalid production date format');
      }
    }
    
    // Validasi tanggal kadaluarsa
    if (product.expiryDate) {
      const expDate = new Date(product.expiryDate);
      if (isNaN(expDate.getTime())) {
        errors.push('Invalid expiry date format');
      }
      
      if (product.productionDate) {
        const prodDate = new Date(product.productionDate);
        if (!isNaN(prodDate.getTime()) && !isNaN(expDate.getTime()) && prodDate > expDate) {
          errors.push('Expiry date must be after production date');
        }
      }
    }
    
    // Validasi lokasi
    if (!product.location || product.location.trim().length < 3) {
      errors.push('Location is required and must be at least 3 characters');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Update a product's status with data integrity verification
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
    
    // NEW: Verify data integrity before proceeding
    const DataIntegrityService = require('../core/DataIntegrityService').default;
    const integrityService = DataIntegrityService.getInstance();
    
    const integrityResult = await integrityService.verifyProductIntegrity(productId);
    await integrityService.logIntegrityCheck(productId, integrityResult);
    
    // Don't allow operations on reconstructed data
    if (integrityResult.integrity === 'reconstructed') {
      await this.logActivity(
        'ProductOperationRejected',
        {
          productId,
          userId,
          action: 'UpdateStatus',
          reason: 'Reconstructed data',
          newStatus
        },
        LogLevel.WARNING
      );
      
      return {
        success: false,
        message: "Cannot update status of a product with reconstructed data. Please verify product authenticity first."
      };
    }
    
    // For partially verified data, log a warning but allow the operation
    if (integrityResult.integrity === 'partial') {
      await this.logActivity(
        'PartialIntegrityWarning',
        {
          productId,
          userId,
          issues: integrityResult.issues,
          action: 'UpdateStatus',
          newStatus
        },
        LogLevel.WARNING
      );
      
      console.warn(`Proceeding with status update for product ${productId} despite partial data integrity`);
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
    
    // Special handling for SELL action by retailers - they can sell any product in inventory
    const isSellingAsRetailer = newStatus === ProductStatus.SOLD && userRole === UserRole.RETAILER;
    
    // Verify ownership or appropriate role for status updates
    if (product.farmerId !== userId && !isSellingAsRetailer) {
      // Special roles can update status without ownership - sekarang hanya FARMER yang punya peran ini
      const allowedRoles = [
        UserRole.FARMER
      ];
      
      if (!allowedRoles.includes(userRole)) {
        await this.logActivity(
          'UnauthorizedStatusUpdate',
          {
            productId,
            userId,
            userRole,
            productOwnerId: product.farmerId,
            attemptedStatus: newStatus
          },
          LogLevel.WARNING
        );
        
        return {
          success: false,
          message: "Only the product owner or an authorized farmer can update product status."
        };
      }
    }
    
    // Additional check for selling: ensure this is a retailer selling to a consumer
    if (isSellingAsRetailer && details && details.targetUserId) {
      // Verify the target user is a CONSUMER
      try {
        const targetRoleResult = await this.callContract(
          this.roleValidationContractId,
          'query',
          'getUserRole',
          { userId: details.targetUserId },
          null
        );
        
        if (!targetRoleResult.success || targetRoleResult.role !== UserRole.CONSUMER) {
          await this.logActivity(
            'InvalidSaleTarget',
            {
              productId,
              sellerId: userId,
              targetId: details.targetUserId,
              targetRole: targetRoleResult.role
            },
            LogLevel.WARNING
          );
          
          return {
            success: false,
            message: "Products can only be sold to consumers."
          };
        }
        
        console.log(`Valid retailer to consumer sale from ${userId} to ${details.targetUserId}`);
        
        // Transfer ownership to consumer
        product.farmerId = details.targetUserId;
      } catch (error) {
        console.error("Error verifying consumer role for sale:", error);
        
        return {
          success: false,
          message: `Error verifying consumer role: ${(error as Error).message}`
        };
      }
    }
    
    // Store previous status for event emission
    const previousStatus = product.status;
    
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
        previousStatus,
        newStatus,
        details: {
          updatedAt: product.updatedAt,
          ...details
        }
      },
      userId
    );
    
    // Log the successful update
    await this.logActivity(
      'ProductStatusUpdated',
      {
        productId,
        userId,
        userRole,
        previousStatus,
        newStatus,
        timestamp: product.updatedAt
      },
      LogLevel.INFO
    );
    
    // Emit status update event
    await this.emitEvent('ProductStatusUpdated', {
      productId,
      userId,
      previousStatus,
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
    
    // Verify authorization to recall - ADMIN dan INSPECTOR sudah dihapus
    const allowedRoles = [
      UserRole.FARMER
    ];
    
    if (!allowedRoles.includes(userRole)) {
      return {
        success: false,
        message: "Only product owner or farmer can recall a product."
      };
    }
    
    // Additional check - jika bukan pemilik, harus FARMER
    
    // Additional check - if not admin/inspector, must be the owner
    if (userRole === UserRole.FARMER && product.farmerId !== userId) {
      return {
        success: false,
        message: "Only the product owner can recall their own product."
      };
    }
    
    // Update product status to recalled
    product.status = ProductStatus.RECALLED;
    product.updatedAt = Date.now();
    
    // Add recall details
    const recallInfo = {
      reason,
      recalledBy: userId,
      recalledAt: product.updatedAt,
      ...details
    };
    
    // If no metadata, create it
    if (!product.metadata) {
      product.metadata = {};
    }
    
    // Add recall info to metadata
    product.metadata.recall = recallInfo;
    
    // Save updated product
    await this.writeState(`product:${productId}`, product);
    
    // Add to recalled products list
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
        details: recallInfo
      },
      userId
    );
    
    // Log the recall
    await this.logActivity(
      'ProductRecalled',
      {
        productId,
        reason,
        userId,
        timestamp: product.updatedAt
      },
      LogLevel.WARNING
    );
    
    // Emit product recall event
    await this.emitEvent('ProductRecalled', {
      productId,
      reason,
      recalledBy: userId,
      timestamp: product.updatedAt
    });
    
    // Notify the product owner if the recall was initiated by someone else
    if (userId !== product.farmerId) {
      await NotificationService.sendNotification(
        product.farmerId,
        'Product Recall Alert',
        `Your product ${product.name} (ID: ${productId}) has been recalled due to ${reason}`,
        NotificationType.PRODUCT_RECALLED,
        { productId, reason, recalledBy: userId }
      );
    }
    
    // Notify admin about the recall
    await NotificationService.sendNotification(
      'admin',
      'Product Recall',
      `Product ${product.name} (ID: ${productId}) has been recalled due to ${reason}`,
      NotificationType.PRODUCT_RECALLED,
      { productId, reason, recalledBy: userId, ownerNotified: userId !== product.farmerId }
    );
    
    return {
      success: true,
      message: `Product ${productId} recalled due to ${reason}.`,
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
    
    // Allow any role in the supply chain to submit verification
    if (!this.verificationRoles.includes(userRole)) {
      return {
        success: false,
        message: `User with role ${userRole} is not authorized to verify products. Only roles in the supply chain can verify.`
      };
    }
    
    // Check if this user has already verified this product
    if (product.verifications) {
      const alreadyVerified = product.verifications.some(v => v.userId === userId);
      if (alreadyVerified) {
        return {
          success: false,
          message: `User has already verified this product. Each user can only verify once.`
        };
      }
    }
    
    // Conduct verification against the criteria
    const verificationResult = this.performVerification(product, criteria);
    
    // Create verification data entry
    const verificationData: VerificationData = {
      userId,
      userRole,
      timestamp: Date.now(),
      passed: verificationResult.passes,
      issues: verificationResult.issues,
      details: details || {}
    };
    
    // Add verification to product's verifications list
    if (!product.verifications) {
      product.verifications = [];
    }
    product.verifications.push(verificationData);
    
    // Check if consensus has been reached
    const consensusResult = this.calculateConsensus(product.verifications);
    
    // Update product status only if consensus is reached
    if (consensusResult.achieved) {
      // If consensus achieved and positive, mark as verified
      if (consensusResult.positiveVerifications >= (consensusResult.totalVerifications * this.consensusThreshold)) {
        product.status = ProductStatus.VERIFIED;
      } else {
        // Consensus achieved but negative
        product.status = ProductStatus.VERIFICATION_FAILED;
      }
    }
    
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
          timestamp: verificationData.timestamp,
          criteria,
          issues: verificationResult.issues,
          consensusStatus: consensusResult.achieved ? 'Achieved' : 'Pending',
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
      timestamp: verificationData.timestamp,
      consensusStatus: consensusResult.achieved ? 'Achieved' : 'Pending'
    });
    
    // If verification was positive, notify other roles who haven't verified yet
    if (verificationResult.passes) {
      // Find roles that haven't verified yet
      const verifiedRoles = product.verifications.map(v => v.userRole);
      const pendingRoles = this.verificationRoles.filter(role => !verifiedRoles.includes(role));
      
      // Send notification to each pending role
      for (const pendingRole of pendingRoles) {
        await NotificationService.sendNotification(
          'role:' + pendingRole, // Use a role-based notification system
          'Product Verification Needed',
          `Product ${product.productName} (ID: ${productId}) needs verification from ${pendingRole} role.`,
          NotificationType.VERIFICATION_NEEDED,
          { productId, pendingRole, currentVerifications: verifiedRoles.length }
        );
      }
    }
    
    return {
      success: true,
      message: verificationResult.passes
        ? `Your verification for product ${productId} has been recorded. ${consensusResult.achieved ? 'Consensus achieved.' : 'Still waiting for other roles to verify.'}`
        : `Your verification failed for product ${productId}: ${verificationResult.issues.join(", ")}. ${consensusResult.achieved ? 'Consensus achieved.' : 'Still waiting for other roles to verify.'}`,
      product,
      transactionId: verificationRecord.transactionId,
      consensusResult
    };
  }
  
  /**
   * Get verifications for a product
   * @param productId ID of the product
   */
  private async getProductVerifications(productId: string): Promise<ProductResult> {
    const product = await this.readState<ProductData>(`product:${productId}`);
    if (!product) {
      return {
        success: false,
        message: `Product with ID ${productId} not found.`
      };
    }
    
    if (!product.verifications || product.verifications.length === 0) {
      return {
        success: true,
        message: `No verifications found for product ${productId}.`,
        product
      };
    }
    
    return {
      success: true,
      message: `Found ${product.verifications.length} verifications for product ${productId}.`,
      product
    };
  }
  
  /**
   * Get verification consensus status for a product
   * @param productId ID of the product
   */
  private async getVerificationConsensus(productId: string): Promise<ProductResult> {
    const product = await this.readState<ProductData>(`product:${productId}`);
    if (!product) {
      return {
        success: false,
        message: `Product with ID ${productId} not found.`
      };
    }
    
    if (!product.verifications || product.verifications.length === 0) {
      return {
        success: true,
        message: `No verifications found for product ${productId}. Consensus not possible.`,
        product,
        consensusResult: {
          achieved: false,
          verifiedRoles: [],
          totalVerifications: 0,
          positiveVerifications: 0,
          negativeVerifications: 0,
          consensusRatio: 0,
          requiredRoles: this.verificationRoles,
          missingRoles: this.verificationRoles
        }
      };
    }
    
    const consensusResult = this.calculateConsensus(product.verifications);
    
    return {
      success: true,
      message: consensusResult.achieved 
        ? `Consensus achieved for product ${productId} with ${consensusResult.positiveVerifications} positive and ${consensusResult.negativeVerifications} negative verifications.`
        : `Consensus not achieved yet for product ${productId}. Waiting for more verifications.`,
      product,
      consensusResult
    };
  }
  
  /**
   * Check verification consensus for a product and update status if needed
   * @param productId ID of the product
   */
  private async checkVerificationConsensus(productId: string): Promise<ProductResult> {
    const product = await this.readState<ProductData>(`product:${productId}`);
    if (!product) {
      return {
        success: false,
        message: `Product with ID ${productId} not found.`
      };
    }
    
    if (!product.verifications || product.verifications.length === 0) {
      return {
        success: true,
        message: `No verifications found for product ${productId}. Consensus not possible.`,
        product
      };
    }
    
    const consensusResult = this.calculateConsensus(product.verifications);
    
    // Update product status if consensus is reached and status hasn't been set yet
    if (consensusResult.achieved && product.status !== ProductStatus.VERIFIED && product.status !== ProductStatus.VERIFICATION_FAILED) {
      // If consensus achieved and positive, mark as verified
      if (consensusResult.positiveVerifications >= (consensusResult.totalVerifications * this.consensusThreshold)) {
        product.status = ProductStatus.VERIFIED;
      } else {
        // Consensus achieved but negative
        product.status = ProductStatus.VERIFICATION_FAILED;
      }
      
      product.updatedAt = Date.now();
      
      // Save updated product
      await this.writeState(`product:${productId}`, product);
      
      // Emit event for consensus achieved
      await this.emitEvent('ProductVerificationConsensus', {
        productId,
        status: product.status,
        totalVerifications: consensusResult.totalVerifications,
        positiveVerifications: consensusResult.positiveVerifications,
        negativeVerifications: consensusResult.negativeVerifications,
        timestamp: product.updatedAt
      });
    }
    
    return {
      success: true,
      message: consensusResult.achieved 
        ? `Consensus achieved for product ${productId}. Product status updated to ${product.status}.`
        : `Consensus not achieved yet for product ${productId}. Waiting for more verifications.`,
      product,
      consensusResult
    };
  }
  
  /**
   * Get a product by ID
   * @param productId ID of the product to retrieve
   */
  private async getProduct(productId: string): Promise<ProductResult> {
    // Use the standard product key format consistently
    const product = await this.readState<ProductData>(`product:${productId}`);
    
    // Return proper error if product is not found
    if (!product) {
      return {
        success: false,
        message: `Product with ID ${productId} not found.`,
        errorCode: 'PRODUCT_NOT_FOUND'
      };
    }
    
    // Ensure compatibility with old format if needed
    if (product.ownerId && !product.farmerId) {
      // Product uses old model with ownerId, convert for compatibility
      product.farmerId = product.ownerId;
    }
    
    return {
      success: true,
      product
    };
  }
  
  /**
   * Get all products owned by a specific user
   * @param farmerId ID of the farmer
   */
  private async getProductsByOwner(farmerId: string): Promise<ProductResult> {
    const productIds = await this.readState<string[]>(`farmer:${farmerId}:products`) || [];
    const products: ProductData[] = [];
    
    for (const productId of productIds) {
      const product = await this.readState<ProductData>(`product:${productId}`);
      if (product) {
        products.push(product);
      }
    }
    
    return {
      success: true,
      message: `Found ${products.length} products owned by ${farmerId}`
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
   * Calculate consensus from a list of verifications
   * @param verifications List of verification data
   */
  private calculateConsensus(verifications: VerificationData[]): ConsensusResult {
    // Count verifications by role
    const roleVerifications: Record<UserRole, VerificationData[]> = {
      [UserRole.FARMER]: [],
      [UserRole.COLLECTOR]: [],
      [UserRole.TRADER]: [],
      [UserRole.RETAILER]: [],
      [UserRole.CONSUMER]: []
    };
    
    // Group verifications by role
    for (const verification of verifications) {
      if (roleVerifications[verification.userRole]) {
        roleVerifications[verification.userRole].push(verification);
      }
    }
    
    // Count unique roles that have verified
    const uniqueRoles = Object.keys(roleVerifications)
      .filter(role => roleVerifications[role as UserRole].length > 0)
      .map(role => role as UserRole);
    
    // Check if we have enough different roles
    const hasEnoughRoles = uniqueRoles.length >= this.minRolesForConsensus;
    
    // Count total and positive verifications
    const totalVerifications = verifications.length;
    const positiveVerifications = verifications.filter(v => v.passed).length;
    const negativeVerifications = totalVerifications - positiveVerifications;
    
    // Calculate consensus ratio
    const consensusRatio = totalVerifications > 0 ? positiveVerifications / totalVerifications : 0;
    
    // Find missing roles
    const missingRoles = this.verificationRoles.filter(role => !uniqueRoles.includes(role));
    
    return {
      achieved: hasEnoughRoles,
      verifiedRoles: uniqueRoles,
      totalVerifications,
      positiveVerifications,
      negativeVerifications,
      consensusRatio,
      requiredRoles: this.verificationRoles,
      missingRoles
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
    // WORKAROUND: Special handling for role-validation-v1 contract since it doesn't exist
    // Directly use RoleService instead for role validation
    if (contractId === 'role-validation-v1' && method === 'getUserRole') {
      try {
        // Import dynamically to avoid circular dependencies
        const RoleService = require('../core/RoleService').default;
        const userId = params.userId;
        const role = await RoleService.getUserRole(userId);
        
        console.log(`Using direct RoleService instead of contract for user ${userId}, role: ${role}`);
        
        if (role) {
          return {
            success: true,
            role
          };
        } else {
          return {
            success: false,
            message: "User role not found"
          };
        }
      } catch (error) {
        console.error(`Error using RoleService directly:`, error);
        return {
          success: false,
          message: `Error determining user role: ${(error as Error).message}`
        };
      }
    }
    
    // Normal contract call for everything else
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
   * @param farmerId ID of the farmer
   */
  private async addProductToOwner(productId: string, farmerId: string): Promise<void> {
    const ownerProducts = await this.readState<string[]>(`farmer:${farmerId}:products`) || [];
    
    if (!ownerProducts.includes(productId)) {
      ownerProducts.push(productId);
      await this.writeState(`farmer:${farmerId}:products`, ownerProducts);
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