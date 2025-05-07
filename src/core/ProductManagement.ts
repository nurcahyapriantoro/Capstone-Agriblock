import { ProductStatus, RecallReason, TransactionActionType, UserRole } from "../enum";
import { txhashDB } from "../helper/level.db.client";
import { TransactionHistoryService } from "./TransactionHistory";
import ProductService from "./ProductService";
import RoleService from "./RoleService";
import { updateProductStatus as utilsUpdateProductStatus } from "./updateProductStatus";
import { injectable, inject } from 'tsyringe';
import { ContractRegistry } from '../contracts/ContractRegistry';

// Token definitions for injection
export const PRODUCT_ID = Symbol('PRODUCT_ID');
export const USER_ID = Symbol('USER_ID');

interface ProductUpdateResult {
  success: boolean;
  message?: string;
  transactionId?: string;
}

// Tambahkan interface ProductData untuk konsistensi dengan ProductService
interface ProductData {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  quantity?: number;
  price?: number;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  status: ProductStatus;
}

interface ProductValidationCriteria {
  expirationDate?: Date; 
  qualityThreshold?: number;
  safetyStandards?: string[];
  requiredCertifications?: string[];
  // Can be extended with additional validation criteria
}

// ID kontrak untuk pengelolaan produk
const contractId = 'product-management-v1';

@injectable()
export default class ProductManagement {
  private registry: ContractRegistry;
  private productId: string;
  private userId: string; // User initiating the action
  private userRole?: UserRole;

  constructor(
    @inject(PRODUCT_ID) productId: string, 
    @inject(USER_ID) userId: string
  ) {
    this.productId = productId;
    this.userId = userId;
    this.registry = ContractRegistry.getInstance();
  }

  /**
   * Initialize the product management with user role
   */
  async initialize(): Promise<boolean> {
    try {
      // Get the user's role
      const role = await RoleService.getUserRole(this.userId);
      
      if (!role) {
        console.error(`User ${this.userId} role not found`);
        return false;
      }
      
      this.userRole = role;
      return true;
    } catch (error) {
      console.error("Error initializing ProductManagement:", error);
      return false;
    }
  }

  /**
   * Create a new product
   */
  async createProduct(
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
    metadata: object
  ) {
    try {
      return await this.registry.executeContract(
        contractId,
        'createProduct',
        { 
          farmerId,
          name,
          productName,
          description, 
          initialQuantity, 
          unit,
          price, 
          productionDate,
          expiryDate,
          location,
          metadata 
        },
        farmerId // sender is the farmer ID
      );
    } catch (error) {
      console.error('Error in ProductManagement.createProduct:', error);
      return {
        success: false,
        message: `Error creating product: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: string) {
    try {
      return await this.registry.executeContract(
        contractId,
        'getProduct',
        { productId },
        this.userId
      );
    } catch (error) {
      console.error('Error in ProductManagement.getProduct:', error);
      return {
        success: false,
        message: `Error getting product: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get products by owner
   */
  async getProductsByOwner(ownerId: string) {
    try {
      return await this.registry.executeContract(
        contractId,
        'getProductsByOwner',
        { ownerId },
        this.userId
      );
    } catch (error) {
      console.error('Error in ProductManagement.getProductsByOwner:', error);
      return {
        success: false,
        message: `Error getting products: ${(error as Error).message}`
      };
    }
  }

  /**
   * Update the status of a product
   * @param newStatus New status to set for the product
   * @param details Additional details about the status update
   * @returns Result of the update operation
   */
  async updateProductStatus(
    newStatus: ProductStatus,
    details?: Record<string, any>
  ): Promise<ProductUpdateResult> {
    try {
      // Make sure the instance is initialized
      if (!this.userRole) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            message: "Failed to initialize product management. User role not found."
          };
        }
      }

      // Get product data
      const product = await ProductService.getProduct(this.productId);
      
      if (!product) {
        return {
          success: false,
          message: `Product with ID ${this.productId} not found.`
        };
      }

      // Validate permissions - only certain roles can update product status
      if (
        this.userRole !== UserRole.FARMER && 
        this.userRole !== UserRole.COLLECTOR && 
        this.userRole !== UserRole.TRADER && 
        this.userRole !== UserRole.RETAILER
      ) {
        return {
          success: false,
          message: `User with role ${this.userRole} is not authorized to update product status.`
        };
      }

      // Validate product ownership
      if (product.ownerId !== this.userId) {
        return {
          success: false,
          message: "Only the current owner can update product status."
        };
      }

      // Update product status in the database/blockchain
      try {
        // Update the product status in the database
        product.status = newStatus;
        product.updatedAt = Date.now();
        await txhashDB.put(`product:${this.productId}`, JSON.stringify(product));
      } catch (error) {
        console.error("Error updating product status in database:", error);
        return {
          success: false,
          message: "Failed to update product status in database."
        };
      }
      
      // Record the status update in transaction history
      const historyResult = await TransactionHistoryService.recordProductStatusUpdate(
        this.productId,
        this.userId,
        this.userRole,
        newStatus,
        details
      );

      return {
        success: true,
        message: `Product status successfully updated to ${newStatus}.`,
        transactionId: historyResult.transactionId
      };
    } catch (error) {
      console.error("Error updating product status:", error);
      return {
        success: false,
        message: "Failed to update product status due to an error."
      };
    }
  }

  /**
   * Recall a product due to issues or concerns
   * @param reason Reason for the product recall
   * @param details Additional details about the recall
   * @returns Result of the recall operation
   */
  async recallProduct(
    reason: RecallReason,
    details?: Record<string, any>
  ): Promise<ProductUpdateResult> {
    try {
      // Make sure the instance is initialized
      if (!this.userRole) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            message: "Failed to initialize product management. User role not found."
          };
        }
      }

      // Get product data
      const product = await ProductService.getProduct(this.productId);
      
      if (!product) {
        return {
          success: false,
          message: `Product with ID ${this.productId} not found.`
        };
      }

      // Periksa apakah produk sudah di-recall sebelumnya
      if (product.status === ProductStatus.RECALLED) {
        return {
          success: false,
          message: "This product has already been recalled."
        };
      }

      // Validate permissions - only the original creator (FARMER) or current owner can recall
      const isFarmer = this.userRole === UserRole.FARMER;
      const isOwner = product.ownerId === this.userId;
      
      if (!isFarmer && !isOwner) {
        return {
          success: false,
          message: "Only the product creator (farmer) or current owner can recall a product."
        };
      }

      // Update product status to RECALLED in the database/blockchain
      // In a real implementation, this would update the product record
      // For example: await txhashDB.put(`product:${this.productId}`, JSON.stringify({...product, status: ProductStatus.RECALLED}));
      
      // Enhanced details with recall reason
      const recallDetails = {
        reason,
        recalledBy: this.userId,
        recallerRole: this.userRole,
        timestamp: Date.now(),
        ...details
      };
      
      // We know userRole is defined here because we checked above and returned if it wasn't
      const userRole = this.userRole as UserRole;
      
      // Record the recall in transaction history
      const historyResult = await TransactionHistoryService.recordProductRecall(
        this.productId,
        this.userId,
        userRole,
        reason,
        recallDetails
      );
      
      if (historyResult.success) {
        // Update product status di database blockchain
        try {
          // Gunakan fungsi updateProductStatus dari utils (lebih konsisten)
          const updated = await utilsUpdateProductStatus(this.productId, ProductStatus.RECALLED);
          
          if (!updated) {
            console.error(`Warning: Failed to update product status in database, but transaction recorded`);
          }
        } catch (err) {
          console.error(`Error updating product status in database: `, err);
          // Lanjutkan proses meskipun ada error, karena transaksi recall sudah terekam di blockchain
        }
        
        return {
          success: true,
          transactionId: historyResult.transactionId,
          message: `Product successfully recalled due to ${reason}.`
        };
      } else {
        return {
          success: false,
          message: "Failed to record product recall in the transaction history."
        };
      }
    } catch (error) {
      console.error("Error recalling product:", error);
      return {
        success: false,
        message: "Failed to recall product due to an error."
      };
    }
  }

  /**
   * Verify that a product meets quality and safety standards
   * @param criteria Validation criteria to check against
   * @param details Additional details about the verification
   * @returns Result of the verification operation
   */
  async verifyProduct(
    criteria: ProductValidationCriteria,
    details?: Record<string, any>
  ): Promise<ProductUpdateResult> {
    try {
      // Make sure the instance is initialized
      if (!this.userRole) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            message: "Failed to initialize product management. User role not found."
          };
        }
      }

      // Get product data
      const product = await ProductService.getProduct(this.productId);
      
      if (!product) {
        return {
          success: false,
          message: `Product with ID ${this.productId} not found.`
        };
      }

      // Validate permissions - specific roles might be authorized to verify
      // For example, only COLLECTORS, TRADERS, and quality control roles can verify
      if (
        this.userRole !== UserRole.COLLECTOR && 
        this.userRole !== UserRole.TRADER &&
        this.userRole !== UserRole.FARMER
      ) {
        return {
          success: false,
          message: `User with role ${this.userRole} is not authorized to verify product quality.`
        };
      }

      // Perform verification against criteria
      const verificationResult = this.checkProductAgainstCriteria(product, criteria);
      
      if (!verificationResult.passes) {
        // If verification fails, record the issues
        const failDetails = {
          verifiedBy: this.userId,
          verifierRole: this.userRole,
          timestamp: Date.now(),
          status: "FAILED",
          issues: verificationResult.issues,
          ...details
        };
        
        // We know userRole is defined here because we checked above and returned if it wasn't
        const userRole = this.userRole as UserRole;
        
        // Record the failed verification in transaction history
        const historyResult = await TransactionHistoryService.recordProductVerification(
          this.productId,
          this.userId,
          userRole,
          false,
          failDetails
        );

        return {
          success: false,
          message: `Product verification failed: ${verificationResult.issues.join(", ")}`,
          transactionId: historyResult.transactionId
        };
      }

      // Update product status to VERIFIED in the database/blockchain
      // In a real implementation, this would update the product record
      // For example: await txhashDB.put(`product:${this.productId}`, JSON.stringify({...product, status: ProductStatus.VERIFIED}));
      
      // Record the successful verification in transaction history
      const passDetails = {
        verifiedBy: this.userId,
        verifierRole: this.userRole,
        timestamp: Date.now(),
        status: "PASSED",
        ...details
      };
      
      // We know userRole is defined here because we checked above and returned if it wasn't
      const userRole = this.userRole as UserRole;
      
      const historyResult = await TransactionHistoryService.recordProductVerification(
        this.productId,
        this.userId,
        userRole,
        true,
        passDetails
      );

      return {
        success: true,
        message: "Product successfully verified and meets all quality standards.",
        transactionId: historyResult.transactionId
      };
    } catch (error) {
      console.error("Error verifying product:", error);
      return {
        success: false,
        message: "Failed to verify product due to an error."
      };
    }
  }

  /**
   * Check product against quality and safety validation criteria
   * @param product Product data to check
   * @param criteria Validation criteria
   * @returns Result of validation checks
   */
  private checkProductAgainstCriteria(
    product: ProductData,
    criteria: ProductValidationCriteria
  ): { passes: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // In a real implementation, these would be thorough checks against product data
    
    // Check expiration date if provided
    if (criteria.expirationDate && product.metadata?.expirationDate) {
      const productExpDate = new Date(product.metadata.expirationDate);
      const criteriaExpDate = criteria.expirationDate;
      
      if (productExpDate < criteriaExpDate) {
        issues.push("Product has expired or will expire too soon");
      }
    }
    
    // Check quality threshold if provided
    if (criteria.qualityThreshold !== undefined && product.metadata?.qualityScore !== undefined) {
      if (product.metadata.qualityScore < criteria.qualityThreshold) {
        issues.push(`Product quality score (${product.metadata.qualityScore}) is below threshold (${criteria.qualityThreshold})`);
      }
    }
    
    // Check safety standards if provided
    if (criteria.safetyStandards && product.metadata?.safetyCompliance) {
      for (const standard of criteria.safetyStandards) {
        if (!product.metadata.safetyCompliance.includes(standard)) {
          issues.push(`Product does not meet safety standard: ${standard}`);
        }
      }
    }
    
    // Check required certifications if provided
    if (criteria.requiredCertifications && product.metadata?.certifications) {
      for (const cert of criteria.requiredCertifications) {
        if (!product.metadata.certifications.includes(cert)) {
          issues.push(`Product is missing required certification: ${cert}`);
        }
      }
    }
    
    return {
      passes: issues.length === 0,
      issues
    };
  }
} 