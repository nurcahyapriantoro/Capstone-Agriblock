import { SmartContract } from './ISmartContract';
import { Level } from 'level';
import { UserRole, TransactionActionType, ProductStatus, RecallReason, StockChangeReason } from '../enum';

/**
 * Transaction record data structure
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
  blockHash?: string;
  transactionHash?: string;
}

/**
 * Transaction history operation result
 */
interface TransactionResult {
  success: boolean;
  message?: string;
  transactionId?: string;
  records?: TransactionRecord[];
}

/**
 * Smart contract for recording and querying transaction history
 * Provides an immutable audit trail for all supply chain actions
 */
export class TransactionHistoryContract extends SmartContract {
  constructor(stateDB: Level<string, string>) {
    super(
      'transaction-history-v1',
      'TransactionHistory',
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
      console.error('Failed to initialize TransactionHistory contract:', error);
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
    // All methods require authentication
    const authorized = await this.verifySender(sender, method);
    if (!authorized) {
      throw new Error(`Unauthorized: User ${sender} cannot execute method ${method}`);
    }
    
    switch (method) {
      case 'recordProductCreation':
        return this.recordProductCreation(
          params.productId,
          params.farmerId,
          params.details
        );
      case 'recordProductTransfer':
        return this.recordProductTransfer(
          params.productId,
          params.fromUserId,
          params.fromRole,
          params.toUserId,
          params.toRole,
          params.details
        );
      case 'recordProductStatusUpdate':
        return this.recordProductStatusUpdate(
          params.productId,
          params.userId,
          params.userRole,
          params.newStatus,
          params.details
        );
      case 'recordProductRecall':
        return this.recordProductRecall(
          params.productId,
          params.userId,
          params.userRole,
          params.reason,
          params.details
        );
      case 'recordProductVerification':
        return this.recordProductVerification(
          params.productId,
          params.userId,
          params.userRole,
          params.passed,
          params.details
        );
      case 'recordStockChange':
        return this.recordStockChange(
          params.productId,
          params.userId,
          params.userRole,
          params.quantity,
          params.actionType,
          params.reason,
          params.details
        );
      case 'recordPaymentTransaction':
        return this.recordPaymentTransaction(
          params.productId,
          params.fromUserId,
          params.fromRole,
          params.toUserId,
          params.toRole,
          params.amount,
          params.paymentType,
          params.paymentData
        );
      case 'setBlockchainDetails':
        return this.setBlockchainDetails(
          params.transactionId,
          params.blockHash,
          params.transactionHash
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
      case 'getProductTransactionHistory':
        return this.getProductTransactionHistory(params.productId);
      case 'getUserTransactionHistory':
        return this.getUserTransactionHistory(params.userId, params.limit);
      case 'getProductStockHistory':
        return this.getProductStockHistory(params.productId);
      case 'getProductPaymentHistory':
        return this.getProductPaymentHistory(params.productId);
      case 'getUserPaymentHistory':
        return this.getUserPaymentHistory(params.userId);
      case 'getRecalledProducts':
        return this.getRecalledProducts();
      case 'getLatestProductStatus':
        return this.getLatestProductStatus(params.productId);
      case 'getTransaction':
        return this.getTransaction(params.transactionId);
      case 'getCurrentStockLevel':
        return this.getCurrentStockLevel(params.productId);
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
        transactions: {
          type: 'object',
          patternProperties: {
            '^.*$': {
              type: 'object',
              properties: {
                id: { type: 'string' },
                productId: { type: 'string' },
                fromUserId: { type: 'string' },
                fromRole: { type: 'string', enum: Object.values(UserRole) },
                toUserId: { type: 'string' },
                toRole: { type: 'string', enum: Object.values(UserRole) },
                actionType: { type: 'string', enum: Object.values(TransactionActionType) },
                productStatus: { type: 'string', enum: Object.values(ProductStatus) },
                timestamp: { type: 'number' },
                details: { type: 'object' },
                blockHash: { type: 'string' },
                transactionHash: { type: 'string' }
              },
              required: ['id', 'productId', 'fromUserId', 'fromRole', 'toUserId', 'toRole', 'actionType', 'productStatus', 'timestamp']
            }
          }
        }
      }
    };
  }
  
  /**
   * Records a product creation transaction
   * @param productId ID of created product
   * @param farmerId ID of farmer creating the product
   * @param details Additional details about the product
   */
  private async recordProductCreation(
    productId: string,
    farmerId: string,
    details?: Record<string, any>
  ): Promise<TransactionResult> {
    const transactionId = this.generateTransactionId();
    
    const record: TransactionRecord = {
      id: transactionId,
      productId,
      fromUserId: farmerId,
      fromRole: UserRole.FARMER,
      toUserId: farmerId, // Initially owned by the farmer
      toRole: UserRole.FARMER,
      actionType: TransactionActionType.CREATE,
      productStatus: ProductStatus.CREATED,
      timestamp: Date.now(),
      details
    };
    
    await this.saveTransaction(record);
    
    await this.emitEvent('ProductCreated', {
      transactionId,
      productId,
      farmerId,
      timestamp: record.timestamp
    });
    
    return {
      success: true,
      transactionId,
      message: `Product creation recorded with ID: ${transactionId}`
    };
  }
  
  /**
   * Record a product ownership transfer
   * @param productId Product being transferred
   * @param fromUserId Current owner
   * @param fromRole Current owner's role
   * @param toUserId New owner
   * @param toRole New owner's role
   * @param details Additional transfer details
   */
  private async recordProductTransfer(
    productId: string,
    fromUserId: string,
    fromRole: UserRole,
    toUserId: string,
    toRole: UserRole,
    details?: Record<string, any>
  ): Promise<TransactionResult> {
    const transactionId = this.generateTransactionId();
    
    const record: TransactionRecord = {
      id: transactionId,
      productId,
      fromUserId,
      fromRole,
      toUserId,
      toRole,
      actionType: TransactionActionType.TRANSFER,
      productStatus: ProductStatus.TRANSFERRED, // Updated status
      timestamp: Date.now(),
      details
    };
    
    await this.saveTransaction(record);
    
    await this.emitEvent('ProductTransferred', {
      transactionId,
      productId,
      fromUserId,
      fromRole,
      toUserId,
      toRole,
      timestamp: record.timestamp
    });
    
    return {
      success: true,
      transactionId,
      message: `Product transfer recorded with ID: ${transactionId}`
    };
  }
  
  /**
   * Record a product status update
   * @param productId Product being updated
   * @param userId User performing the update
   * @param userRole Role of the updating user
   * @param newStatus New product status
   * @param details Additional update details
   */
  private async recordProductStatusUpdate(
    productId: string,
    userId: string,
    userRole: UserRole,
    newStatus: ProductStatus,
    details?: Record<string, any>
  ): Promise<TransactionResult> {
    const transactionId = this.generateTransactionId();
    
    const record: TransactionRecord = {
      id: transactionId,
      productId,
      fromUserId: userId,
      fromRole: userRole,
      toUserId: userId, // Same user, just updating status
      toRole: userRole,
      actionType: TransactionActionType.UPDATE_STATUS,
      productStatus: newStatus,
      timestamp: Date.now(),
      details
    };
    
    await this.saveTransaction(record);
    
    await this.emitEvent('ProductStatusUpdated', {
      transactionId,
      productId,
      userId,
      userRole,
      newStatus,
      timestamp: record.timestamp
    });
    
    return {
      success: true,
      transactionId,
      message: `Product status update recorded with ID: ${transactionId}`
    };
  }
  
  /**
   * Record a product recall
   * @param productId Product being recalled
   * @param userId User performing the recall
   * @param userRole Role of the recalling user
   * @param reason Reason for recall
   * @param details Additional recall details
   */
  private async recordProductRecall(
    productId: string,
    userId: string,
    userRole: UserRole,
    reason: RecallReason,
    details?: Record<string, any>
  ): Promise<TransactionResult> {
    const transactionId = this.generateTransactionId();
    
    const record: TransactionRecord = {
      id: transactionId,
      productId,
      fromUserId: userId,
      fromRole: userRole,
      toUserId: userId, // Same user, just recalling product
      toRole: userRole,
      actionType: TransactionActionType.RECALL,
      productStatus: ProductStatus.RECALLED,
      timestamp: Date.now(),
      details: {
        ...details,
        reason
      }
    };
    
    await this.saveTransaction(record);
    
    await this.emitEvent('ProductRecalled', {
      transactionId,
      productId,
      userId,
      userRole,
      reason,
      timestamp: record.timestamp
    });
    
    return {
      success: true,
      transactionId,
      message: `Product recall recorded with ID: ${transactionId}`
    };
  }
  
  /**
   * Record a product verification
   * @param productId Product being verified
   * @param userId User performing verification
   * @param userRole Role of the verifying user
   * @param passed Whether verification passed
   * @param details Verification details
   */
  private async recordProductVerification(
    productId: string,
    userId: string,
    userRole: UserRole,
    passed: boolean,
    details?: Record<string, any>
  ): Promise<TransactionResult> {
    const transactionId = this.generateTransactionId();
    
    const record: TransactionRecord = {
      id: transactionId,
      productId,
      fromUserId: userId,
      fromRole: userRole,
      toUserId: userId, // Same user, just verifying
      toRole: userRole,
      actionType: TransactionActionType.VERIFY,
      productStatus: passed ? ProductStatus.VERIFIED : ProductStatus.VERIFICATION_FAILED,
      timestamp: Date.now(),
      details: {
        ...details,
        passed
      }
    };
    
    await this.saveTransaction(record);
    
    await this.emitEvent('ProductVerified', {
      transactionId,
      productId,
      userId,
      userRole,
      passed,
      timestamp: record.timestamp
    });
    
    return {
      success: true,
      transactionId,
      message: `Product verification recorded with ID: ${transactionId}`
    };
  }
  
  /**
   * Record a stock quantity change
   * @param productId Product whose stock changed
   * @param userId User making the change
   * @param userRole Role of the user
   * @param quantity Change amount (positive for increase, negative for decrease)
   * @param actionType Type of action causing the stock change
   * @param reason Reason for the stock change
   * @param details Additional stock change details
   */
  private async recordStockChange(
    productId: string,
    userId: string,
    userRole: UserRole,
    quantity: number,
    actionType: TransactionActionType,
    reason: StockChangeReason,
    details?: Record<string, any>
  ): Promise<TransactionResult> {
    const transactionId = this.generateTransactionId();
    
    const record: TransactionRecord = {
      id: transactionId,
      productId,
      fromUserId: userId,
      fromRole: userRole,
      toUserId: userId, // Same user, just changing stock
      toRole: userRole,
      actionType,
      productStatus: ProductStatus.IN_STOCK,
      timestamp: Date.now(),
      details: {
        ...details,
        quantity,
        reason
      }
    };
    
    await this.saveTransaction(record);
    
    await this.emitEvent('StockChanged', {
      transactionId,
      productId,
      userId,
      userRole,
      quantity,
      reason,
      timestamp: record.timestamp
    });
    
    return {
      success: true,
      transactionId,
      message: `Stock change recorded with ID: ${transactionId}`
    };
  }
  
  /**
   * Record a payment transaction
   * @param productId Product being paid for
   * @param fromUserId Payer
   * @param fromRole Payer's role
   * @param toUserId Recipient
   * @param toRole Recipient's role
   * @param amount Payment amount
   * @param paymentType Type of payment
   * @param paymentData Payment details
   */
  private async recordPaymentTransaction(
    productId: string,
    fromUserId: string,
    fromRole: UserRole,
    toUserId: string,
    toRole: UserRole,
    amount: number,
    paymentType: string,
    paymentData: Record<string, any>
  ): Promise<TransactionResult> {
    const transactionId = this.generateTransactionId();
    
    const record: TransactionRecord = {
      id: transactionId,
      productId,
      fromUserId,
      fromRole,
      toUserId,
      toRole,
      actionType: TransactionActionType.PAYMENT,
      productStatus: ProductStatus.PAID,
      timestamp: Date.now(),
      details: {
        amount,
        paymentType,
        ...paymentData
      }
    };
    
    await this.saveTransaction(record);
    
    await this.emitEvent('PaymentRecorded', {
      transactionId,
      productId,
      fromUserId,
      toUserId,
      amount,
      paymentType,
      timestamp: record.timestamp
    });
    
    return {
      success: true,
      transactionId,
      message: `Payment recorded with ID: ${transactionId}`
    };
  }
  
  /**
   * Update a transaction with blockchain details after confirmation
   * @param transactionId ID of recorded transaction
   * @param blockHash Hash of the block containing the transaction
   * @param transactionHash Hash of the transaction itself
   */
  private async setBlockchainDetails(
    transactionId: string,
    blockHash: string,
    transactionHash: string
  ): Promise<TransactionResult> {
    // Get the transaction record
    const record = await this.readState<TransactionRecord>(`transaction:${transactionId}`);
    
    if (!record) {
      return {
        success: false,
        message: `Transaction with ID ${transactionId} not found`
      };
    }
    
    // Update with blockchain details
    record.blockHash = blockHash;
    record.transactionHash = transactionHash;
    
    // Save updated record
    await this.writeState(`transaction:${transactionId}`, record);
    
    // Save cross-reference by hash
    await this.writeState(`txhash:${transactionHash}`, transactionId);
    
    await this.emitEvent('TransactionConfirmed', {
      transactionId,
      blockHash,
      transactionHash
    });
    
    return {
      success: true,
      message: `Blockchain details updated for transaction ${transactionId}`
    };
  }
  
  /**
   * Get all transaction history for a product
   * @param productId ID of the product
   */
  private async getProductTransactionHistory(productId: string): Promise<TransactionResult> {
    const records: TransactionRecord[] = [];
    const productKey = `product:${productId}:transactions`;
    
    try {
      // Get list of transaction IDs for this product
      const transactionIds = await this.readState<string[]>(productKey) || [];
      
      // Get each transaction record
      for (const txId of transactionIds) {
        const record = await this.readState<TransactionRecord>(`transaction:${txId}`);
        if (record) {
          records.push(record);
        }
      }
      
      // Sort by timestamp, newest first
      records.sort((a, b) => b.timestamp - a.timestamp);
      
      return {
        success: true,
        records
      };
    } catch (error) {
      console.error(`Error getting product history for ${productId}:`, error);
      return {
        success: false,
        message: `Failed to get transaction history for product ${productId}`
      };
    }
  }
  
  /**
   * Get stock change history for a product
   * @param productId ID of the product
   */
  private async getProductStockHistory(productId: string): Promise<TransactionResult> {
    const allRecords = await this.getProductTransactionHistory(productId);
    
    if (!allRecords.success || !allRecords.records) {
      return allRecords;
    }
    
    // Filter for stock change actions
    const stockActionTypes = [
      TransactionActionType.STOCK_ADD,
      TransactionActionType.STOCK_REMOVE,
      TransactionActionType.STOCK_ADJUSTMENT
    ];
    
    const stockRecords = allRecords.records.filter(record => 
      stockActionTypes.includes(record.actionType)
    );
    
    return {
      success: true,
      records: stockRecords
    };
  }
  
  /**
   * Get payment history for a product
   * @param productId ID of the product
   */
  private async getProductPaymentHistory(productId: string): Promise<TransactionResult> {
    const allRecords = await this.getProductTransactionHistory(productId);
    
    if (!allRecords.success || !allRecords.records) {
      return allRecords;
    }
    
    // Filter for payment actions
    const paymentRecords = allRecords.records.filter(record => 
      record.actionType === TransactionActionType.PAYMENT
    );
    
    return {
      success: true,
      records: paymentRecords
    };
  }
  
  /**
   * Get all user's transaction history
   * @param userId ID of the user
   * @param limit Maximum number of records to return
   */
  private async getUserTransactionHistory(
    userId: string, 
    limit?: number
  ): Promise<TransactionResult> {
    const records: TransactionRecord[] = [];
    const userKey = `user:${userId}:transactions`;
    
    try {
      // Get list of transaction IDs for this user
      const transactionIds = await this.readState<string[]>(userKey) || [];
      
      // Get each transaction record, up to the limit
      const idsToFetch = limit ? transactionIds.slice(0, limit) : transactionIds;
      
      for (const txId of idsToFetch) {
        const record = await this.readState<TransactionRecord>(`transaction:${txId}`);
        if (record) {
          records.push(record);
        }
      }
      
      // Sort by timestamp, newest first
      records.sort((a, b) => b.timestamp - a.timestamp);
      
      return {
        success: true,
        records
      };
    } catch (error) {
      console.error(`Error getting user history for ${userId}:`, error);
      return {
        success: false,
        message: `Failed to get transaction history for user ${userId}`
      };
    }
  }
  
  /**
   * Get payment history for a user
   * @param userId ID of the user
   */
  private async getUserPaymentHistory(userId: string): Promise<TransactionResult> {
    const allRecords = await this.getUserTransactionHistory(userId);
    
    if (!allRecords.success || !allRecords.records) {
      return allRecords;
    }
    
    // Filter for payment actions
    const paymentRecords = allRecords.records.filter(record => 
      record.actionType === TransactionActionType.PAYMENT &&
      (record.fromUserId === userId || record.toUserId === userId)
    );
    
    return {
      success: true,
      records: paymentRecords
    };
  }
  
  /**
   * Get all recalled products
   */
  private async getRecalledProducts(): Promise<TransactionResult> {
    try {
      // Get all recalled product transaction records
      const recallTransactions = await this.readState<TransactionRecord[]>('recalls') || [];
      
      return {
        success: true,
        records: recallTransactions
      };
    } catch (error) {
      console.error('Error getting recalled products:', error);
      return {
        success: false,
        message: 'Failed to get recalled products'
      };
    }
  }
  
  /**
   * Get the latest status of a product
   * @param productId ID of the product
   */
  private async getLatestProductStatus(productId: string): Promise<TransactionResult> {
    const history = await this.getProductTransactionHistory(productId);
    
    if (!history.success || !history.records || history.records.length === 0) {
      return {
        success: false,
        message: `No transaction history found for product ${productId}`
      };
    }
    
    // Get the most recent transaction (first in the sorted list)
    const latestTransaction = history.records[0];
    
    return {
      success: true,
      records: [latestTransaction]
    };
  }
  
  /**
   * Get a specific transaction by ID
   * @param transactionId ID of the transaction
   */
  private async getTransaction(transactionId: string): Promise<TransactionResult> {
    const record = await this.readState<TransactionRecord>(`transaction:${transactionId}`);
    
    if (!record) {
      return {
        success: false,
        message: `Transaction with ID ${transactionId} not found`
      };
    }
    
    return {
      success: true,
      records: [record]
    };
  }
  
  /**
   * Calculate the current stock level for a product
   * @param productId ID of the product
   */
  private async getCurrentStockLevel(productId: string): Promise<number | null> {
    const stockHistory = await this.getProductStockHistory(productId);
    
    if (!stockHistory.success || !stockHistory.records) {
      return null;
    }
    
    // Calculate total from all stock changes
    let stockLevel = 0;
    
    for (const record of stockHistory.records) {
      const quantity = record.details?.quantity || 0;
      
      switch (record.actionType) {
        case TransactionActionType.STOCK_ADD:
          stockLevel += quantity;
          break;
        case TransactionActionType.STOCK_REMOVE:
          stockLevel -= quantity;
          break;
        case TransactionActionType.STOCK_ADJUSTMENT:
          // For adjustments, the quantity is the absolute new value
          stockLevel = quantity;
          break;
      }
    }
    
    return stockLevel;
  }
  
  /**
   * Generate a unique transaction ID
   */
  private generateTransactionId(): string {
    return `txn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Save a transaction record with all necessary indexes
   * @param record Transaction record to save
   */
  private async saveTransaction(record: TransactionRecord): Promise<void> {
    // Save primary record
    await this.writeState(`transaction:${record.id}`, record);
    
    // Product index - add transaction ID to the product's transaction list
    const productKey = `product:${record.productId}:transactions`;
    const productTxs = await this.readState<string[]>(productKey) || [];
    productTxs.unshift(record.id); // Add to beginning for newest-first order
    await this.writeState(productKey, productTxs);
    
    // User indexes - add transaction ID to both users' transaction lists
    const fromUserKey = `user:${record.fromUserId}:transactions`;
    const fromUserTxs = await this.readState<string[]>(fromUserKey) || [];
    fromUserTxs.unshift(record.id);
    await this.writeState(fromUserKey, fromUserTxs);
    
    if (record.toUserId !== record.fromUserId) {
      const toUserKey = `user:${record.toUserId}:transactions`;
      const toUserTxs = await this.readState<string[]>(toUserKey) || [];
      toUserTxs.unshift(record.id);
      await this.writeState(toUserKey, toUserTxs);
    }
    
    // Special indexes
    if (record.actionType === TransactionActionType.RECALL) {
      // Add to recalled products index
      const recalls = await this.readState<TransactionRecord[]>('recalls') || [];
      recalls.push(record);
      await this.writeState('recalls', recalls);
    }
  }
} 