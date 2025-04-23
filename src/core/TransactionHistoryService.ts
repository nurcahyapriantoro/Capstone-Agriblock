import { 
  UserRole, 
  TransactionActionType, 
  ProductStatus, 
  RecallReason, 
  StockChangeReason 
} from "../enum";
import { TransactionHistory, TransactionHistoryService, TransactionRecord } from "./TransactionHistory";
import { txhashDB } from "../helper/level.db.client";

/**
 * Helper functions for TransactionHistoryService
 */
class TransactionHistoryUtils {
  /**
   * Updates a product's status in the database
   * @param productId ID of the product to update
   * @param status New status to set
   * @returns Whether the update was successful
   */
  static async updateProductStatus(
    productId: string, 
    status: ProductStatus
  ): Promise<boolean> {
    try {
      // Get current product data
      const productKey = `product:${productId}`;
      try {
        const productData = await txhashDB.get(productKey)
          .then(data => JSON.parse(data));
        
        // Update status
        productData.status = status;
        productData.updatedAt = Date.now();
        
        // Save back to database
        await txhashDB.put(productKey, JSON.stringify(productData));
        
        console.log(`Updated product ${productId} status to ${status}`);
        return true;
      } catch (err) {
        console.error(`Error updating product ${productId} status:`, err);
        return false;
      }
    } catch (error) {
      console.error("Error in updateProductStatus:", error);
      return false;
    }
  }

  /**
   * Checks if a product is recalled
   * @param productId ID of the product to check
   * @returns True if the product is recalled, false otherwise
   */
  static async isProductRecalled(productId: string): Promise<boolean> {
    try {
      // Get product data
      const productKey = `product:${productId}`;
      try {
        const productData = await txhashDB.get(productKey)
          .then(data => JSON.parse(data));
        
        return productData.status === ProductStatus.RECALLED;
      } catch (err) {
        console.error(`Error checking if product ${productId} is recalled:`, err);
        return false;
      }
    } catch (error) {
      console.error("Error in isProductRecalled:", error);
      return false;
    }
  }
}

export { TransactionHistoryUtils }; 