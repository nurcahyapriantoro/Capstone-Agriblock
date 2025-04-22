import { 
  ProductStatus, 
  StockChangeReason, 
  TransactionActionType, 
  UserRole 
} from "../enum";
import ProductService from "./ProductService";
import RoleService from "./RoleService";
import { TransactionHistoryService } from "./TransactionHistory";

interface StockUpdateResult {
  success: boolean;
  message?: string;
  transactionId?: string;
  currentStock?: number;
}

interface StockData {
  productId: string;
  quantity: number;
  userId: string;
  userRole: UserRole;
  reason: StockChangeReason;
  details?: Record<string, any>;
}

/**
 * Class for managing product stock throughout the supply chain
 */
class StockManagement {
  private productId: string;
  private userId: string;
  private userRole?: UserRole;
  private lowStockThreshold: number = 10; // Default low stock threshold

  constructor(productId: string, userId: string) {
    this.productId = productId;
    this.userId = userId;
  }

  /**
   * Initialize the stock management with user role
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
      console.error("Error initializing StockManagement:", error);
      return false;
    }
  }

  /**
   * Set the threshold for low stock warnings
   * @param threshold Number of units considered low stock
   */
  setLowStockThreshold(threshold: number): void {
    this.lowStockThreshold = threshold;
  }

  /**
   * Increase product stock (stock in)
   * @param quantity Quantity to add
   * @param reason Reason for stock increase
   * @param details Additional details
   * @returns Result of the stock update
   */
  async stockIn(
    quantity: number,
    reason: StockChangeReason,
    details?: Record<string, any>
  ): Promise<StockUpdateResult> {
    try {
      // Make sure the instance is initialized
      if (!this.userRole) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            message: "Failed to initialize stock management. User role not found."
          };
        }
      }

      // Validate quantity
      if (quantity <= 0) {
        return {
          success: false,
          message: "Stock in quantity must be positive."
        };
      }

      // Get product data
      const product = await ProductService.getProduct(this.productId);
      
      if (!product) {
        return {
          success: false,
          message: `Product with ID ${this.productId} not found.`
        };
      }

      // Validate permissions - only certain roles can update stock
      if (
        this.userRole !== UserRole.FARMER && 
        this.userRole !== UserRole.COLLECTOR && 
        this.userRole !== UserRole.TRADER && 
        this.userRole !== UserRole.RETAILER
      ) {
        return {
          success: false,
          message: `User with role ${this.userRole} is not authorized to update product stock.`
        };
      }

      // Check if the user owns the product or has permission to manage its stock
      if (product.ownerId !== this.userId) {
        return {
          success: false,
          message: "Only the current owner can update product stock."
        };
      }

      // Get current stock level
      const currentStock = await TransactionHistoryService.getCurrentStockLevel(this.productId) || 0;
      
      // Calculate new stock level
      const newStock = currentStock + quantity;
      
      // Record the stock update in transaction history
      const userRole = this.userRole as UserRole;
      
      const historyResult = await TransactionHistoryService.recordStockChange(
        this.productId,
        this.userId,
        userRole,
        newStock, // Record the total updated stock level
        TransactionActionType.STOCK_IN,
        reason,
        {
          previousStock: currentStock,
          change: quantity,
          ...details
        }
      );

      return {
        success: true,
        message: `Stock successfully increased by ${quantity} units. New stock level: ${newStock}`,
        transactionId: historyResult.transactionId,
        currentStock: newStock
      };
    } catch (error) {
      console.error("Error performing stock in:", error);
      return {
        success: false,
        message: "Failed to update stock due to an error."
      };
    }
  }

  /**
   * Decrease product stock (stock out)
   * @param quantity Quantity to remove
   * @param reason Reason for stock decrease
   * @param details Additional details
   * @returns Result of the stock update
   */
  async stockOut(
    quantity: number,
    reason: StockChangeReason,
    details?: Record<string, any>
  ): Promise<StockUpdateResult> {
    try {
      // Make sure the instance is initialized
      if (!this.userRole) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            message: "Failed to initialize stock management. User role not found."
          };
        }
      }

      // Validate quantity
      if (quantity <= 0) {
        return {
          success: false,
          message: "Stock out quantity must be positive."
        };
      }

      // Get product data
      const product = await ProductService.getProduct(this.productId);
      
      if (!product) {
        return {
          success: false,
          message: `Product with ID ${this.productId} not found.`
        };
      }

      // Validate permissions - only certain roles can update stock
      if (
        this.userRole !== UserRole.FARMER && 
        this.userRole !== UserRole.COLLECTOR && 
        this.userRole !== UserRole.TRADER && 
        this.userRole !== UserRole.RETAILER
      ) {
        return {
          success: false,
          message: `User with role ${this.userRole} is not authorized to update product stock.`
        };
      }

      // Check if the user owns the product or has permission to manage its stock
      if (product.ownerId !== this.userId) {
        return {
          success: false,
          message: "Only the current owner can update product stock."
        };
      }

      // Get current stock level
      const currentStock = await TransactionHistoryService.getCurrentStockLevel(this.productId) || 0;
      
      // Check if there's enough stock
      if (currentStock < quantity) {
        return {
          success: false,
          message: `Insufficient stock. Current stock: ${currentStock}, Requested: ${quantity}`
        };
      }
      
      // Calculate new stock level
      const newStock = currentStock - quantity;
      
      // Record the stock update in transaction history
      const userRole = this.userRole as UserRole;
      
      const historyResult = await TransactionHistoryService.recordStockChange(
        this.productId,
        this.userId,
        userRole,
        newStock, // Record the total updated stock level
        TransactionActionType.STOCK_OUT,
        reason,
        {
          previousStock: currentStock,
          change: -quantity,
          ...details
        }
      );

      // Check if stock is low after this operation
      const stockWarning = newStock < this.lowStockThreshold 
        ? `Warning: Stock level is low (${newStock} units).` 
        : '';

      return {
        success: true,
        message: `Stock successfully decreased by ${quantity} units. New stock level: ${newStock}. ${stockWarning}`,
        transactionId: historyResult.transactionId,
        currentStock: newStock
      };
    } catch (error) {
      console.error("Error performing stock out:", error);
      return {
        success: false,
        message: "Failed to update stock due to an error."
      };
    }
  }

  /**
   * Adjust product stock to a specific level
   * @param newQuantity New quantity to set
   * @param reason Reason for stock adjustment
   * @param details Additional details
   * @returns Result of the stock update
   */
  async adjustStock(
    newQuantity: number,
    reason: StockChangeReason,
    details?: Record<string, any>
  ): Promise<StockUpdateResult> {
    try {
      // Make sure the instance is initialized
      if (!this.userRole) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            message: "Failed to initialize stock management. User role not found."
          };
        }
      }

      // Validate quantity
      if (newQuantity < 0) {
        return {
          success: false,
          message: "Stock quantity cannot be negative."
        };
      }

      // Get product data
      const product = await ProductService.getProduct(this.productId);
      
      if (!product) {
        return {
          success: false,
          message: `Product with ID ${this.productId} not found.`
        };
      }

      // Validate permissions - only certain roles can update stock
      if (
        this.userRole !== UserRole.FARMER && 
        this.userRole !== UserRole.COLLECTOR && 
        this.userRole !== UserRole.TRADER && 
        this.userRole !== UserRole.RETAILER
      ) {
        return {
          success: false,
          message: `User with role ${this.userRole} is not authorized to update product stock.`
        };
      }

      // Check if the user owns the product or has permission to manage its stock
      if (product.ownerId !== this.userId) {
        return {
          success: false,
          message: "Only the current owner can update product stock."
        };
      }

      // Get current stock level
      const currentStock = await TransactionHistoryService.getCurrentStockLevel(this.productId) || 0;
      
      // Calculate the change in stock
      const stockChange = newQuantity - currentStock;
      
      // Record the stock update in transaction history
      const userRole = this.userRole as UserRole;
      
      const historyResult = await TransactionHistoryService.recordStockChange(
        this.productId,
        this.userId,
        userRole,
        newQuantity, // Set to the exact new quantity
        TransactionActionType.STOCK_ADJUST,
        reason,
        {
          previousStock: currentStock,
          change: stockChange,
          ...details
        }
      );

      // Check if stock is low after this operation
      const stockWarning = newQuantity < this.lowStockThreshold 
        ? `Warning: Stock level is low (${newQuantity} units).` 
        : '';

      const changeDescription = stockChange > 0 
        ? `increased by ${stockChange}` 
        : stockChange < 0 
          ? `decreased by ${Math.abs(stockChange)}` 
          : 'unchanged';

      return {
        success: true,
        message: `Stock successfully adjusted to ${newQuantity} units (${changeDescription}). ${stockWarning}`,
        transactionId: historyResult.transactionId,
        currentStock: newQuantity
      };
    } catch (error) {
      console.error("Error adjusting stock:", error);
      return {
        success: false,
        message: "Failed to adjust stock due to an error."
      };
    }
  }

  /**
   * Transfer stock between users when ownership changes
   * @param fromUserId User ID transferring the stock
   * @param toUserId User ID receiving the stock
   * @param quantity Quantity to transfer
   * @param details Additional details
   * @returns Result of the stock transfer
   */
  static async transferStock(
    productId: string,
    fromUserId: string,
    fromRole: UserRole,
    toUserId: string,
    toRole: UserRole,
    quantity: number,
    details?: Record<string, any>
  ): Promise<StockUpdateResult> {
    try {
      // Get product data
      const product = await ProductService.getProduct(productId);
      
      if (!product) {
        return {
          success: false,
          message: `Product with ID ${productId} not found.`
        };
      }

      // Verify the current owner
      if (product.ownerId !== fromUserId) {
        return {
          success: false,
          message: "Only the current owner can transfer product stock."
        };
      }

      // Get current stock level
      const currentStock = await TransactionHistoryService.getCurrentStockLevel(productId) || 0;
      
      // Check if there's enough stock
      if (currentStock < quantity) {
        return {
          success: false,
          message: `Insufficient stock for transfer. Current stock: ${currentStock}, Requested: ${quantity}`
        };
      }

      // Record stock out for the sender
      const stockOutResult = await TransactionHistoryService.recordStockChange(
        productId,
        fromUserId,
        fromRole,
        0, // After transfer, sender has 0 stock
        TransactionActionType.STOCK_OUT,
        StockChangeReason.TRANSFER_OUT,
        {
          previousStock: currentStock,
          change: -currentStock,
          transferTo: toUserId,
          transferToRole: toRole,
          ...details
        }
      );

      // Record stock in for the receiver
      const stockInResult = await TransactionHistoryService.recordStockChange(
        productId,
        toUserId,
        toRole,
        quantity, // Receiver gets the transferred quantity
        TransactionActionType.STOCK_IN,
        StockChangeReason.TRANSFER_IN,
        {
          previousStock: 0,
          change: quantity,
          transferFrom: fromUserId,
          transferFromRole: fromRole,
          ...details
        }
      );

      return {
        success: true,
        message: `Stock successfully transferred. ${quantity} units moved from ${fromUserId} to ${toUserId}.`,
        transactionId: stockInResult.transactionId,
        currentStock: quantity
      };
    } catch (error) {
      console.error("Error transferring stock:", error);
      return {
        success: false,
        message: "Failed to transfer stock due to an error."
      };
    }
  }

  /**
   * Get the current stock level
   * @returns Current stock quantity or 0 if not found
   */
  async getCurrentStock(): Promise<number> {
    try {
      const stockLevel = await TransactionHistoryService.getCurrentStockLevel(this.productId);
      return stockLevel || 0;
    } catch (error) {
      console.error("Error getting current stock:", error);
      return 0;
    }
  }

  /**
   * Get the stock history for this product
   * @returns Array of stock transaction records
   */
  async getStockHistory(): Promise<any[]> {
    try {
      return await TransactionHistoryService.getProductStockHistory(this.productId);
    } catch (error) {
      console.error("Error getting stock history:", error);
      return [];
    }
  }

  /**
   * Check if the product has sufficient stock for a requested quantity
   * @param requestedQuantity The quantity to check against available stock
   * @returns Whether there is sufficient stock
   */
  async hasSufficientStock(requestedQuantity: number): Promise<boolean> {
    const currentStock = await this.getCurrentStock();
    return currentStock >= requestedQuantity;
  }

  /**
   * Check if the product stock is low (below threshold)
   * @returns Whether the stock is low
   */
  async isLowStock(): Promise<boolean> {
    const currentStock = await this.getCurrentStock();
    return currentStock < this.lowStockThreshold;
  }
}

export default StockManagement; 