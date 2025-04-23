import { ProductStatus } from "../enum";
import { txhashDB } from "../helper/level.db.client";

/**
 * Updates a product's status in the database
 * @param productId ID of the product to update
 * @param status New status to set
 * @returns Whether the update was successful
 */
export async function updateProductStatus(
  productId: string, 
  status: ProductStatus
): Promise<boolean> {
  try {
    // Get current product data
    const productKey = `product:${productId}`;
    try {
      const productDataStr = await txhashDB.get(productKey);
      const productData = JSON.parse(productDataStr);
      
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
 * Update product status and implement in transaction history
 * @param productId ID of the product to update
 * @param status New status to set
 * @param userId ID of the user making the update
 * @param details Additional details about the update
 * @returns Whether the update was successful
 */
export async function updateProductWithHistory(
  productId: string,
  status: ProductStatus,
  userId: string,
  details?: Record<string, any>
): Promise<{ success: boolean; transactionId?: string }> {
  try {
    // Update product status
    const updated = await updateProductStatus(productId, status);
    
    if (!updated) {
      return { 
        success: false 
      };
    }
    
    // Record could be done here with TransactionHistoryService
    // This is just a placeholder for now
    const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    return {
      success: true,
      transactionId
    };
  } catch (error) {
    console.error("Error in updateProductWithHistory:", error);
    return {
      success: false
    };
  }
} 