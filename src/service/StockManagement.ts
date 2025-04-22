import { 
  StockChangeReason, 
  TransactionActionType,
  TransactionTypeEnum,
  UserRole
} from '../enum';
import ProductService from '../core/ProductService';
import RoleService from '../core/RoleService';
import { TransactionHistoryService } from '../core/TransactionHistory';

// Define StockTransaction type
interface StockTransaction {
  productId: string;
  userId: string;
  quantity: number;
  transactionType: TransactionActionType;
  previousStock: number;
  newStock: number;
  reason: string;
  timestamp: Date;
}

class StockManagement {
  /**
   * Increase stock quantity
   */
  async stockIn(
    userId: string,
    productId: string,
    quantity: number,
    reason: string
  ): Promise<boolean> {
    try {
      // Check if product exists
      const product = await ProductService.getProduct(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Get current stock level
      const currentStock = await TransactionHistoryService.getCurrentStockLevel(productId) || 0;
      const newStock = currentStock + quantity;

      // Get user role
      const userRole = await RoleService.getUserRole(userId);
      if (!userRole) {
        throw new Error('User role not found');
      }

      // Record stock transaction
      const stockTransaction: StockTransaction = {
        productId,
        userId,
        quantity,
        transactionType: TransactionActionType.STOCK_IN,
        previousStock: currentStock,
        newStock,
        reason,
        timestamp: new Date()
      };

      // Store transaction in history
      await TransactionHistoryService.recordStockChange(
        productId,
        userId,
        userRole as UserRole,
        newStock,
        TransactionActionType.STOCK_IN,
        reason as StockChangeReason,
        {
          previousStock: currentStock,
          change: quantity
        }
      );

      return true;
    } catch (error) {
      console.error('Error in stockIn:', error);
      throw error;
    }
  }

  /**
   * Decrease stock quantity
   */
  async stockOut(
    userId: string,
    productId: string,
    quantity: number,
    reason: string
  ): Promise<boolean> {
    try {
      // Check if product exists
      const product = await ProductService.getProduct(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Check if stock is sufficient
      const currentStock = await TransactionHistoryService.getCurrentStockLevel(productId) || 0;
      if (currentStock < quantity) {
        throw new Error('Insufficient stock');
      }

      const newStock = currentStock - quantity;

      // Get user role
      const userRole = await RoleService.getUserRole(userId);
      if (!userRole) {
        throw new Error('User role not found');
      }

      // Record stock transaction
      const stockTransaction: StockTransaction = {
        productId,
        userId,
        quantity,
        transactionType: TransactionActionType.STOCK_OUT,
        previousStock: currentStock,
        newStock,
        reason,
        timestamp: new Date()
      };

      // Store transaction in history
      await TransactionHistoryService.recordStockChange(
        productId,
        userId,
        userRole as UserRole,
        newStock,
        TransactionActionType.STOCK_OUT,
        reason as StockChangeReason,
        {
          previousStock: currentStock,
          change: -quantity
        }
      );

      return true;
    } catch (error) {
      console.error('Error in stockOut:', error);
      throw error;
    }
  }

  /**
   * Adjust stock to a specific quantity
   */
  async adjustStock(
    userId: string,
    productId: string,
    newQuantity: number,
    reason: string
  ): Promise<boolean> {
    try {
      // Check if product exists
      const product = await ProductService.getProduct(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const currentStock = await TransactionHistoryService.getCurrentStockLevel(productId) || 0;
      
      // Get user role
      const userRole = await RoleService.getUserRole(userId);
      if (!userRole) {
        throw new Error('User role not found');
      }
      
      // Determine if this is an increase or decrease
      const stockChange = newQuantity - currentStock;
      
      // Record stock transaction
      const stockTransaction: StockTransaction = {
        productId,
        userId,
        quantity: Math.abs(stockChange),
        transactionType: TransactionActionType.STOCK_ADJUST,
        previousStock: currentStock,
        newStock: newQuantity,
        reason,
        timestamp: new Date()
      };

      // Store transaction in history
      await TransactionHistoryService.recordStockChange(
        productId,
        userId,
        userRole as UserRole,
        newQuantity,
        TransactionActionType.STOCK_ADJUST,
        reason as StockChangeReason,
        {
          previousStock: currentStock,
          change: stockChange
        }
      );

      return true;
    } catch (error) {
      console.error('Error in adjustStock:', error);
      throw error;
    }
  }

  /**
   * Transfer stock from one user to another
   */
  async transferStock(
    fromUserId: string,
    toUserId: string,
    productId: string,
    quantity: number,
    reason: string
  ): Promise<boolean> {
    try {
      // Check if product exists
      const product = await ProductService.getProduct(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Check if stock is sufficient
      const currentStock = await TransactionHistoryService.getCurrentStockLevel(productId) || 0;
      if (currentStock < quantity) {
        throw new Error('Insufficient stock for transfer');
      }

      // Get user roles
      const fromRole = await RoleService.getUserRole(fromUserId);
      const toRole = await RoleService.getUserRole(toUserId);
      
      if (!fromRole || !toRole) {
        throw new Error('User role not found');
      }

      // Record stock-out from source user
      await TransactionHistoryService.recordStockChange(
        productId,
        fromUserId,
        fromRole as UserRole,
        0, // After transfer, sender has 0 stock
        TransactionActionType.STOCK_OUT,
        StockChangeReason.TRANSFER_OUT,
        {
          previousStock: currentStock,
          change: -currentStock,
          transferTo: toUserId,
          transferToRole: toRole
        }
      );

      // Record stock-in to destination user
      await TransactionHistoryService.recordStockChange(
        productId,
        toUserId,
        toRole as UserRole,
        quantity, // Receiver gets the transferred quantity
        TransactionActionType.STOCK_IN,
        StockChangeReason.TRANSFER_IN,
        {
          previousStock: 0,
          change: quantity,
          transferFrom: fromUserId,
          transferFromRole: fromRole
        }
      );

      return true;
    } catch (error) {
      console.error('Error in transferStock:', error);
      throw error;
    }
  }

  /**
   * Get current stock for a product
   */
  async getCurrentStock(productId: string): Promise<number> {
    try {
      // Get product's current stock
      const currentStock = await TransactionHistoryService.getCurrentStockLevel(productId);
      return currentStock || 0;
    } catch (error) {
      console.error('Error getting current stock:', error);
      throw error;
    }
  }

  /**
   * Get stock transaction history for a product
   */
  async getStockHistory(productId: string): Promise<any[]> {
    try {
      const history = await TransactionHistoryService.getProductStockHistory(productId);
      return history;
    } catch (error) {
      console.error('Error getting stock history:', error);
      throw error;
    }
  }

  /**
   * Check if stock is below threshold
   */
  async checkLowStock(productId: string, threshold: number): Promise<boolean> {
    try {
      const currentStock = await this.getCurrentStock(productId);
      return currentStock < threshold;
    } catch (error) {
      console.error('Error checking low stock:', error);
      throw error;
    }
  }
}

export default StockManagement; 