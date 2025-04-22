import { UserRole, TransactionActionType, ProductStatus, RecallReason, StockChangeReason } from "../enum";
import { txhashDB } from "../helper/level.db.client";

/**
 * Interface for a transaction history record
 */
interface TransactionRecord {
  id: string;
  productId: string;
  fromUserId: string; 
  fromRole: UserRole;
  toUserId: string;
  toRole: UserRole;
  actionType: TransactionActionType;
  productStatus: ProductStatus;
  timestamp: number;
  details?: Record<string, any>;
  blockHash?: string; // Hash of the block containing this transaction
  transactionHash?: string; // Hash of the transaction
}

/**
 * Class for recording and tracking product transaction history
 */
class TransactionHistory {
  private productId: string;
  private fromUserId: string;
  private toUserId: string;
  private actionType: TransactionActionType;
  private productStatus: ProductStatus;
  private details?: Record<string, any>;

  constructor(
    productId: string,
    fromUserId: string,
    toUserId: string,
    actionType: TransactionActionType,
    productStatus: ProductStatus,
    details?: Record<string, any>
  ) {
    this.productId = productId;
    this.fromUserId = fromUserId;
    this.toUserId = toUserId;
    this.actionType = actionType;
    this.productStatus = productStatus;
    this.details = details;
  }

  /**
   * Record the transaction in the blockchain/database
   * @param fromRole Role of the sender
   * @param toRole Role of the receiver
   * @returns Result of the recording operation
   */
  async recordTransaction(
    fromRole: UserRole,
    toRole: UserRole
  ): Promise<{ success: boolean; transactionId?: string; message?: string }> {
    try {
      // Generate a unique transaction ID
      const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Create the transaction record
      const record: TransactionRecord = {
        id: transactionId,
        productId: this.productId,
        fromUserId: this.fromUserId,
        fromRole,
        toUserId: this.toUserId,
        toRole,
        actionType: this.actionType,
        productStatus: this.productStatus,
        timestamp: Date.now(),
        details: this.details
      };

      // In a real implementation, this would store the transaction in the blockchain
      // Example: await txhashDB.put(`transaction:${transactionId}`, JSON.stringify(record));
      
      // For now, let's log the transaction (this would be replaced with blockchain storage)
      console.log("Recording transaction:", record);

      return {
        success: true,
        transactionId,
        message: `Transaction recorded successfully with ID: ${transactionId}`
      };
    } catch (error) {
      console.error("Error recording transaction:", error);
      return {
        success: false,
        message: "Failed to record transaction due to an error."
      };
    }
  }

  /**
   * Set blockchain transaction details after the transaction is confirmed
   * @param transactionId ID of the previously recorded transaction
   * @param blockHash Hash of the block containing the transaction
   * @param transactionHash Hash of the transaction itself
   * @returns Result of the update operation
   */
  static async setBlockchainDetails(
    transactionId: string,
    blockHash: string,
    transactionHash: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // In a real implementation, this would update the transaction record in the database
      // 1. Fetch the existing record
      // 2. Update it with blockchain details
      // 3. Save it back
      
      // Example:
      // const recordJson = await txhashDB.get(`transaction:${transactionId}`);
      // const record = JSON.parse(recordJson);
      // record.blockHash = blockHash;
      // record.transactionHash = transactionHash;
      // await txhashDB.put(`transaction:${transactionId}`, JSON.stringify(record));
      
      console.log(`Updated transaction ${transactionId} with block hash ${blockHash} and tx hash ${transactionHash}`);
      
      return {
        success: true,
        message: "Blockchain details updated successfully"
      };
    } catch (error) {
      console.error("Error updating blockchain details:", error);
      return {
        success: false,
        message: "Failed to update blockchain details"
      };
    }
  }
}

/**
 * Service for managing transaction history
 */
class TransactionHistoryService {
  /**
   * Create a new transaction history record for product creation
   * @param productId ID of the created product
   * @param farmerId ID of the farmer who created the product
   * @param details Additional details about the creation
   * @returns Result of the recording operation
   */
  static async recordProductCreation(
    productId: string,
    farmerId: string,
    details?: Record<string, any>
  ): Promise<{ success: boolean; transactionId?: string; message?: string }> {
    const history = new TransactionHistory(
      productId,
      farmerId, // from is the farmer
      farmerId, // to is also the farmer (initial owner)
      TransactionActionType.CREATE,
      ProductStatus.CREATED,
      details
    );

    return history.recordTransaction(UserRole.FARMER, UserRole.FARMER);
  }

  /**
   * Record a product ownership transfer transaction
   * @param productId ID of the product being transferred
   * @param fromUserId ID of the current owner
   * @param fromRole Role of the current owner
   * @param toUserId ID of the new owner
   * @param toRole Role of the new owner
   * @param details Additional details about the transfer
   * @returns Result of the recording operation
   */
  static async recordProductTransfer(
    productId: string,
    fromUserId: string,
    fromRole: UserRole,
    toUserId: string,
    toRole: UserRole,
    details?: Record<string, any>
  ): Promise<{ success: boolean; transactionId?: string; message?: string }> {
    const history = new TransactionHistory(
      productId,
      fromUserId,
      toUserId,
      TransactionActionType.TRANSFER,
      ProductStatus.TRANSFERRED,
      details
    );

    return history.recordTransaction(fromRole, toRole);
  }

  /**
   * Record a product status update transaction
   * @param productId ID of the product being updated
   * @param userId ID of the user updating the status
   * @param userRole Role of the user updating the status
   * @param newStatus New status of the product
   * @param details Additional details about the update
   * @returns Result of the recording operation
   */
  static async recordProductStatusUpdate(
    productId: string,
    userId: string,
    userRole: UserRole,
    newStatus: ProductStatus,
    details?: Record<string, any>
  ): Promise<{ success: boolean; transactionId?: string; message?: string }> {
    const history = new TransactionHistory(
      productId,
      userId, // from is the updater
      userId, // to is also the updater (same user)
      TransactionActionType.UPDATE,
      newStatus,
      details
    );

    return history.recordTransaction(userRole, userRole);
  }

  /**
   * Record a product recall transaction
   * @param productId ID of the product being recalled
   * @param userId ID of the user initiating the recall
   * @param userRole Role of the user initiating the recall
   * @param reason Reason for the recall
   * @param details Additional details about the recall
   * @returns Result of the recording operation
   */
  static async recordProductRecall(
    productId: string,
    userId: string,
    userRole: UserRole,
    reason: RecallReason,
    details?: Record<string, any>
  ): Promise<{ success: boolean; transactionId?: string; message?: string }> {
    const history = new TransactionHistory(
      productId,
      userId, // from is the initiator of recall
      userId, // to is also the initiator (same user)
      TransactionActionType.RECALL,
      ProductStatus.RECALLED,
      {
        recallReason: reason,
        ...details
      }
    );

    return history.recordTransaction(userRole, userRole);
  }

  /**
   * Record a product verification transaction
   * @param productId ID of the product being verified
   * @param userId ID of the user performing the verification
   * @param userRole Role of the user performing the verification
   * @param passed Whether the verification passed or failed
   * @param details Additional details about the verification
   * @returns Result of the recording operation
   */
  static async recordProductVerification(
    productId: string,
    userId: string,
    userRole: UserRole,
    passed: boolean,
    details?: Record<string, any>
  ): Promise<{ success: boolean; transactionId?: string; message?: string }> {
    const status = passed ? ProductStatus.VERIFIED : ProductStatus.DEFECTIVE;
    
    const history = new TransactionHistory(
      productId,
      userId, // from is the verifier
      userId, // to is also the verifier (same user)
      TransactionActionType.VERIFY,
      status,
      {
        verificationResult: passed ? "PASSED" : "FAILED",
        ...details
      }
    );

    return history.recordTransaction(userRole, userRole);
  }

  /**
   * Record a stock update transaction
   * @param productId ID of the product
   * @param userId ID of the user updating the stock
   * @param userRole Role of the user updating the stock
   * @param quantity New quantity or change in quantity
   * @param actionType Type of stock action (STOCK_IN, STOCK_OUT, STOCK_ADJUST)
   * @param reason Reason for the stock change
   * @param details Additional details about the stock update
   * @returns Result of the recording operation
   */
  static async recordStockChange(
    productId: string,
    userId: string,
    userRole: UserRole,
    quantity: number,
    actionType: TransactionActionType,
    reason: StockChangeReason,
    details?: Record<string, any>
  ): Promise<{ success: boolean; transactionId?: string; message?: string }> {
    // Determine the appropriate product status based on stock level
    let productStatus: ProductStatus;
    if (quantity <= 0) {
      productStatus = ProductStatus.OUT_OF_STOCK;
    } else if (quantity < 10) { // Assuming 10 is the low stock threshold
      productStatus = ProductStatus.LOW_STOCK;
    } else {
      productStatus = ProductStatus.IN_STOCK;
    }

    const stockDetails = {
      quantity,
      reason,
      updatedBy: userId,
      updaterRole: userRole,
      ...details
    };

    const history = new TransactionHistory(
      productId,
      userId, // from is the stock updater
      userId, // to is also the stock updater (same user)
      actionType,
      productStatus,
      stockDetails
    );

    return history.recordTransaction(userRole, userRole);
  }

  /**
   * Record a payment transaction between users
   * @param productId ID of the product related to the payment
   * @param fromUserId ID of the user making the payment
   * @param fromRole Role of the user making the payment
   * @param toUserId ID of the user receiving the payment
   * @param toRole Role of the user receiving the payment
   * @param amount Payment amount
   * @param paymentType Type of payment
   * @param paymentData Complete payment data
   * @returns Result of the recording operation
   */
  static async recordPaymentTransaction(
    productId: string,
    fromUserId: string,
    fromRole: UserRole,
    toUserId: string,
    toRole: UserRole,
    amount: number,
    paymentType: string,
    paymentData: Record<string, any>
  ): Promise<{ success: boolean; transactionId?: string; message?: string }> {
    const history = new TransactionHistory(
      productId,
      fromUserId,
      toUserId,
      TransactionActionType.PAYMENT,
      ProductStatus.ACTIVE, // Payment doesn't change product status directly
      {
        amount,
        paymentType,
        ...paymentData
      }
    );

    return history.recordTransaction(fromRole, toRole);
  }

  /**
   * Get stock transaction history for a specific product
   * @param productId ID of the product
   * @returns Array of stock-related transaction records for the product
   */
  static async getProductStockHistory(
    productId: string
  ): Promise<TransactionRecord[]> {
    try {
      // Get all transaction history for the product
      const allHistory = await this.getProductTransactionHistory(productId);
      
      // Filter for stock-related transactions
      const stockHistory = allHistory.filter(
        record => 
          record.actionType === TransactionActionType.STOCK_IN ||
          record.actionType === TransactionActionType.STOCK_OUT ||
          record.actionType === TransactionActionType.STOCK_ADJUST
      );
      
      return stockHistory;
    } catch (error) {
      console.error("Error fetching product stock history:", error);
      return [];
    }
  }

  /**
   * Get payment history for a specific product
   * @param productId ID of the product
   * @returns Array of payment transaction records for the product
   */
  static async getProductPaymentHistory(
    productId: string
  ): Promise<TransactionRecord[]> {
    try {
      // Get all transaction history for the product
      const allHistory = await this.getProductTransactionHistory(productId);
      
      // Filter for payment transactions
      const paymentHistory = allHistory.filter(
        record => record.actionType === TransactionActionType.PAYMENT
      );
      
      return paymentHistory;
    } catch (error) {
      console.error("Error fetching product payment history:", error);
      return [];
    }
  }

  /**
   * Get the current stock level of a product
   * @param productId ID of the product
   * @returns Current stock quantity or null if not found
   */
  static async getCurrentStockLevel(
    productId: string
  ): Promise<number | null> {
    try {
      // Get all stock-related transactions for the product
      const stockHistory = await this.getProductStockHistory(productId);
      
      if (stockHistory.length === 0) {
        return null;
      }
      
      // Sort by timestamp to process in chronological order
      stockHistory.sort((a, b) => a.timestamp - b.timestamp);
      
      // Calculate the current stock level
      let currentStock = 0;
      
      for (const record of stockHistory) {
        const quantity = record.details?.quantity || 0;
        
        switch (record.actionType) {
          case TransactionActionType.STOCK_IN:
            currentStock += quantity;
            break;
          case TransactionActionType.STOCK_OUT:
            currentStock -= quantity;
            break;
          case TransactionActionType.STOCK_ADJUST:
            // For adjustments, we assume the quantity is the absolute new value
            currentStock = quantity;
            break;
        }
      }
      
      // Ensure stock never goes below zero
      return Math.max(0, currentStock);
    } catch (error) {
      console.error("Error calculating current stock level:", error);
      return null;
    }
  }

  /**
   * Get all transaction history for a specific product
   * @param productId ID of the product
   * @returns Array of transaction records for the product
   */
  static async getProductTransactionHistory(
    productId: string
  ): Promise<TransactionRecord[]> {
    try {
      // In a real implementation, this would query the blockchain or database
      // for all transactions related to the product
      // This is a placeholder implementation
      
      // Example: Query all transactions with the product ID
      // const allKeys = await txhashDB.keys().all();
      // const transactionKeys = allKeys.filter(key => key.startsWith('transaction:'));
      // const transactions = await Promise.all(
      //   transactionKeys.map(async key => {
      //     const data = await txhashDB.get(key);
      //     return JSON.parse(data);
      //   })
      // );
      // return transactions.filter(txn => txn.productId === productId)
      //   .sort((a, b) => a.timestamp - b.timestamp);
      
      // Placeholder implementation - this would be replaced with actual data fetching
      const mockHistory: TransactionRecord[] = [
        {
          id: `txn-${Date.now() - 5000000}-1`,
          productId,
          fromUserId: "FARM123",
          fromRole: UserRole.FARMER,
          toUserId: "FARM123",
          toRole: UserRole.FARMER,
          actionType: TransactionActionType.CREATE,
          productStatus: ProductStatus.CREATED,
          timestamp: Date.now() - 5000000,
          details: { location: "Farm A", quantity: 100 }
        },
        {
          id: `txn-${Date.now() - 4000000}-2`,
          productId,
          fromUserId: "FARM123",
          fromRole: UserRole.FARMER,
          toUserId: "COLL456",
          toRole: UserRole.COLLECTOR,
          actionType: TransactionActionType.TRANSFER,
          productStatus: ProductStatus.TRANSFERRED,
          timestamp: Date.now() - 4000000,
          details: { location: "Collection Point B", price: 500 }
        },
        {
          id: `txn-${Date.now() - 3900000}-3`,
          productId,
          fromUserId: "COLL456",
          fromRole: UserRole.COLLECTOR,
          toUserId: "FARM123",
          toRole: UserRole.FARMER,
          actionType: TransactionActionType.PAYMENT,
          productStatus: ProductStatus.ACTIVE,
          timestamp: Date.now() - 3900000,
          details: { amount: 500, paymentType: "PRODUCT_PURCHASE", description: "Payment for product purchase" }
        },
        {
          id: `txn-${Date.now() - 3000000}-4`,
          productId,
          fromUserId: "COLL456",
          fromRole: UserRole.COLLECTOR,
          toUserId: "COLL456",
          toRole: UserRole.COLLECTOR,
          actionType: TransactionActionType.PACKAGE,
          productStatus: ProductStatus.PACKAGED,
          timestamp: Date.now() - 3000000,
          details: { packageType: "Carton", units: 10 }
        },
        {
          id: `txn-${Date.now() - 2000000}-5`,
          productId,
          fromUserId: "COLL456",
          fromRole: UserRole.COLLECTOR,
          toUserId: "TRAD789",
          toRole: UserRole.TRADER,
          actionType: TransactionActionType.TRANSFER,
          productStatus: ProductStatus.TRANSFERRED,
          timestamp: Date.now() - 2000000,
          details: { location: "Trading Hub C", price: 700 }
        },
        {
          id: `txn-${Date.now() - 1900000}-6`,
          productId,
          fromUserId: "TRAD789",
          fromRole: UserRole.TRADER,
          toUserId: "COLL456",
          toRole: UserRole.COLLECTOR,
          actionType: TransactionActionType.PAYMENT,
          productStatus: ProductStatus.ACTIVE,
          timestamp: Date.now() - 1900000,
          details: { amount: 700, paymentType: "PRODUCT_PURCHASE", description: "Payment for product purchase" }
        }
      ];
      
      return mockHistory;
    } catch (error) {
      console.error("Error fetching product transaction history:", error);
      return [];
    }
  }

  /**
   * Get all transactions by a specific user (either as sender or receiver)
   * @param userId ID of the user
   * @returns Array of transaction records involving the user
   */
  static async getUserTransactionHistory(
    userId: string
  ): Promise<TransactionRecord[]> {
    try {
      // In a real implementation, this would query the blockchain or database
      // for all transactions related to the user
      // This is a placeholder implementation
      
      // Example: Query all transactions that involve the user
      // const allTransactions = await this.getAllTransactions();
      // return allTransactions.filter(
      //   txn => txn.fromUserId === userId || txn.toUserId === userId
      // ).sort((a, b) => b.timestamp - a.timestamp);
      
      // Placeholder implementation - this would be replaced with actual data fetching
      const mockHistory: TransactionRecord[] = [
        {
          id: `txn-${Date.now() - 5000000}-1`,
          productId: `prod-${Date.now() - 6000000}-1`,
          fromUserId: userId,
          fromRole: UserRole.FARMER,
          toUserId: userId,
          toRole: UserRole.FARMER,
          actionType: TransactionActionType.CREATE,
          productStatus: ProductStatus.CREATED,
          timestamp: Date.now() - 5000000,
          details: { location: "Farm A", quantity: 100 }
        },
        {
          id: `txn-${Date.now() - 4000000}-2`,
          productId: `prod-${Date.now() - 6000000}-1`,
          fromUserId: userId,
          fromRole: UserRole.FARMER,
          toUserId: "COLL456",
          toRole: UserRole.COLLECTOR,
          actionType: TransactionActionType.TRANSFER,
          productStatus: ProductStatus.TRANSFERRED,
          timestamp: Date.now() - 4000000,
          details: { location: "Collection Point B", price: 500 }
        },
        {
          id: `txn-${Date.now() - 3900000}-3`,
          productId: `prod-${Date.now() - 6000000}-1`,
          fromUserId: "COLL456",
          fromRole: UserRole.COLLECTOR,
          toUserId: userId,
          toRole: UserRole.FARMER,
          actionType: TransactionActionType.PAYMENT,
          productStatus: ProductStatus.ACTIVE,
          timestamp: Date.now() - 3900000,
          details: { amount: 500, paymentType: "PRODUCT_PURCHASE", description: "Payment for product purchase" }
        },
        {
          id: `txn-${Date.now() - 3000000}-4`,
          productId: `prod-${Date.now() - 5500000}-2`,
          fromUserId: userId,
          fromRole: UserRole.FARMER,
          toUserId: userId,
          toRole: UserRole.FARMER,
          actionType: TransactionActionType.CREATE,
          productStatus: ProductStatus.CREATED,
          timestamp: Date.now() - 3000000,
          details: { location: "Farm A", quantity: 50 }
        }
      ];
      
      return mockHistory;
    } catch (error) {
      console.error("Error fetching user transaction history:", error);
      return [];
    }
  }

  /**
   * Get payment transactions for a specific user (either sent or received)
   * @param userId ID of the user
   * @returns Array of payment transaction records
   */
  static async getUserPaymentHistory(
    userId: string
  ): Promise<TransactionRecord[]> {
    try {
      // Get user's transaction history
      const userTransactions = await this.getUserTransactionHistory(userId);
      
      // Filter for payment transactions
      const paymentHistory = userTransactions.filter(
        record => record.actionType === TransactionActionType.PAYMENT
      );
      
      return paymentHistory;
    } catch (error) {
      console.error("Error fetching user payment history:", error);
      return [];
    }
  }

  /**
   * Get all recalled products
   * @returns Array of transaction records for recalled products
   */
  static async getRecalledProducts(): Promise<TransactionRecord[]> {
    try {
      // In a real implementation, this would query the blockchain or database
      // for all transactions with RECALL action type
      // This is a placeholder implementation
      
      // Example: Query all transactions with recall action
      // const allTransactions = await this.getAllTransactions();
      // return allTransactions.filter(
      //   txn => txn.actionType === TransactionActionType.RECALL
      // ).sort((a, b) => b.timestamp - a.timestamp);
      
      // Placeholder implementation - this would be replaced with actual data fetching
      const mockHistory: TransactionRecord[] = [
        {
          id: `txn-${Date.now() - 3000000}-1`,
          productId: `prod-${Date.now() - 5000000}-1`,
          fromUserId: "FARM123",
          fromRole: UserRole.FARMER,
          toUserId: "FARM123", 
          toRole: UserRole.FARMER,
          actionType: TransactionActionType.RECALL,
          productStatus: ProductStatus.RECALLED,
          timestamp: Date.now() - 3000000,
          details: { 
            recallReason: RecallReason.QUALITY_ISSUE,
            description: "Product failed quality inspection"
          }
        },
        {
          id: `txn-${Date.now() - 2000000}-2`,
          productId: `prod-${Date.now() - 4000000}-2`,
          fromUserId: "COLL456",
          fromRole: UserRole.COLLECTOR,
          toUserId: "COLL456",
          toRole: UserRole.COLLECTOR,
          actionType: TransactionActionType.RECALL,
          productStatus: ProductStatus.RECALLED,
          timestamp: Date.now() - 2000000,
          details: { 
            recallReason: RecallReason.SAFETY_CONCERN,
            description: "Potential contamination detected"
          }
        }
      ];
      
      return mockHistory;
    } catch (error) {
      console.error("Error fetching recalled products:", error);
      return [];
    }
  }

  /**
   * Get the latest status of a product
   * @param productId ID of the product
   * @returns The latest status record or null if not found
   */
  static async getLatestProductStatus(
    productId: string
  ): Promise<TransactionRecord | null> {
    try {
      // Get all transaction history for the product
      const history = await this.getProductTransactionHistory(productId);
      
      // Sort by timestamp in descending order to get the most recent first
      history.sort((a, b) => b.timestamp - a.timestamp);
      
      // Return the latest status or null if no history
      return history.length > 0 ? history[0] : null;
    } catch (error) {
      console.error("Error fetching latest product status:", error);
      return null;
    }
  }
}

export { TransactionHistory, TransactionHistoryService, TransactionRecord }; 