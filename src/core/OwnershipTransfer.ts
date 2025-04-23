import { UserRole, ProductStatus } from "../enum";
import RoleService from "./RoleService";
import { txhashDB } from "../helper/level.db.client";

interface TransferResult {
  success: boolean;
  message?: string;
}

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
 * Class for handling ownership transfer of products between supply chain actors
 * with role-based restrictions
 */
class OwnershipTransfer {
  private productId: string;
  private currentOwnerId: string;
  private newOwnerId: string;
  private role: UserRole;
  private product: ProductData | null = null;

  constructor(
    productId: string,
    currentOwnerId: string,
    newOwnerId: string,
    role: UserRole
  ) {
    this.productId = productId;
    this.currentOwnerId = currentOwnerId;
    this.newOwnerId = newOwnerId;
    this.role = role;
  }

  /**
   * Set product data for validation
   * @param product The product data for validation
   */
  setProductData(product: ProductData): void {
    this.product = product;
  }

  /**
   * Validate if the current owner can transfer ownership to the new owner
   * based on their roles in the supply chain
   */
  async validateTransfer(): Promise<TransferResult> {
    // Verify the product exists
    if (!this.product) {
      return {
        success: false,
        message: `Product with ID ${this.productId} not found or data not provided.`
      };
    }

    // Verify that the current owner actually owns the product
    if (this.product.ownerId !== this.currentOwnerId) {
      return {
        success: false,
        message: "Current owner does not own this product."
      };
    }

    // Verifikasi status produk - Cegah transfer produk yang di-recall
    if (this.product.status === ProductStatus.RECALLED) {
      return {
        success: false,
        message: "Product has been recalled and cannot be transferred."
      };
    }

    // Get roles of both parties
    const currentOwnerRole = await RoleService.getUserRole(this.currentOwnerId);
    const newOwnerRole = await RoleService.getUserRole(this.newOwnerId);

    if (!currentOwnerRole) {
      return {
        success: false,
        message: "Current owner role not found. User may not be registered."
      };
    }

    if (!newOwnerRole) {
      return {
        success: false,
        message: "New owner role not found. User may not be registered."
      };
    }

    // Verify that the role provided matches the current owner's actual role
    if (currentOwnerRole !== this.role) {
      return {
        success: false,
        message: "Provided role does not match the current owner's role."
      };
    }

    // Check if the transfer is allowed based on the roles
    return this.validateRoleBasedTransfer(currentOwnerRole, newOwnerRole);
  }

  /**
   * Validate transfer based on the supply chain role hierarchy
   * @param currentOwnerRole Role of the current owner
   * @param newOwnerRole Role of the new owner
   */
  private validateRoleBasedTransfer(
    currentOwnerRole: UserRole,
    newOwnerRole: UserRole
  ): TransferResult {
    switch (currentOwnerRole) {
      case UserRole.FARMER:
        return this.validateFarmerTransfer(newOwnerRole);
      case UserRole.COLLECTOR:
        return this.validateCollectorTransfer(newOwnerRole);
      case UserRole.TRADER:
        return this.validateTraderTransfer(newOwnerRole);
      case UserRole.RETAILER:
        return this.validateRetailerTransfer(newOwnerRole);
      case UserRole.CONSUMER:
        return {
          success: false,
          message: "Consumers cannot transfer product ownership."
        };
      default:
        return {
          success: false,
          message: "Invalid owner role."
        };
    }
  }

  /**
   * Validate transfers from a Farmer
   * Farmers can only transfer to Collectors
   */
  private validateFarmerTransfer(newOwnerRole: UserRole): TransferResult {
    if (newOwnerRole !== UserRole.COLLECTOR) {
      return {
        success: false,
        message: "Farmers can only transfer products to Collectors."
      };
    }
    return { success: true };
  }

  /**
   * Validate transfers from a Collector
   * Collectors can only transfer to Traders
   */
  private validateCollectorTransfer(newOwnerRole: UserRole): TransferResult {
    if (newOwnerRole !== UserRole.TRADER) {
      return {
        success: false,
        message: "Collectors can only transfer products to Traders."
      };
    }
    return { success: true };
  }

  /**
   * Validate transfers from a Trader
   * Traders can only transfer to Retailers
   */
  private validateTraderTransfer(newOwnerRole: UserRole): TransferResult {
    if (newOwnerRole !== UserRole.RETAILER) {
      return {
        success: false,
        message: "Traders can only transfer products to Retailers."
      };
    }
    return { success: true };
  }

  /**
   * Validate transfers from a Retailer
   * Retailers cannot transfer products to any other role
   */
  private validateRetailerTransfer(newOwnerRole: UserRole): TransferResult {
    return {
      success: false,
      message: "Retailers cannot transfer products to any other role."
    };
  }

  /**
   * Execute the ownership transfer if it's valid
   * @returns Result of the transfer operation
   */
  async executeTransfer(): Promise<TransferResult> {
    // First validate the transfer
    const validationResult = await this.validateTransfer();
    
    if (!validationResult.success) {
      return validationResult;
    }

    try {
      // Update product ownership in blockchain/database
      if (this.product) {
        // Update ownerId in product object
        this.product.ownerId = this.newOwnerId;
        
        // Tambahkan timestamp update
        if ('updatedAt' in this.product) {
          this.product['updatedAt'] = Date.now();
        }
        
        // Simpan perubahan ke database
        await txhashDB.put(`product:${this.productId}`, JSON.stringify(this.product));
        
        console.log(`Product ${this.productId} ownership updated in database from ${this.currentOwnerId} to ${this.newOwnerId}`);
      }
      
      return {
        success: true,
        message: `Product ${this.productId} ownership successfully transferred to ${this.newOwnerId}.`
      };
    } catch (error) {
      console.error("Error executing transfer:", error);
      return {
        success: false,
        message: "Failed to execute ownership transfer due to an error."
      };
    }
  }
}

export default OwnershipTransfer; 