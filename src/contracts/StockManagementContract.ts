import { SmartContract } from './ISmartContract';
import { Level } from 'level';
import { UserRole, TransactionActionType, ProductStatus, StockChangeReason } from '../enum';

/**
 * Stock data structure
 */
interface StockData {
  productId: string;
  ownerId: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  location?: string;
  lastUpdated: number;
  metadata?: Record<string, any>;
}

/**
 * Stock reservation record
 */
interface StockReservation {
  id: string;
  productId: string;
  ownerId: string;
  reservedFor: string;
  quantity: number;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'fulfilled' | 'expired' | 'cancelled';
}

/**
 * Stock operation result
 */
interface StockResult {
  success: boolean;
  message?: string;
  stock?: StockData;
  transactionId?: string;
  reservationId?: string;
}

/**
 * Smart contract for managing product stock levels
 * Controls inventory quantities and reservations
 */
export class StockManagementContract extends SmartContract {
  // Contract dependency IDs
  private roleValidationContractId: string = 'role-validation-v1';
  private transactionHistoryContractId: string = 'transaction-history-v1';
  private productManagementContractId: string = 'product-management-v1';
  
  constructor(stateDB: Level<string, string>) {
    super(
      'stock-management-v1',
      'StockManagement',
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
      console.error('Failed to initialize StockManagement contract:', error);
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
      case 'addStock':
        return this.addStock(
          params.productId,
          params.quantity,
          params.location,
          params.reason,
          sender, // ownerId is the sender
          params.metadata
        );
      case 'removeStock':
        return this.removeStock(
          params.productId,
          params.quantity,
          params.reason,
          sender,
          params.metadata
        );
      case 'adjustStock':
        return this.adjustStock(
          params.productId,
          params.newQuantity,
          params.reason,
          sender,
          params.metadata
        );
      case 'reserveStock':
        return this.reserveStock(
          params.productId,
          params.quantity,
          params.reservedFor,
          params.expirationHours,
          sender
        );
      case 'fulfillReservation':
        return this.fulfillReservation(
          params.reservationId,
          sender
        );
      case 'cancelReservation':
        return this.cancelReservation(
          params.reservationId,
          sender
        );
      case 'moveStock':
        return this.moveStock(
          params.productId,
          params.quantity,
          params.newLocation,
          sender,
          params.metadata
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
      case 'getStock':
        return this.getStock(params.productId, params.ownerId);
      case 'getStockHistory':
        return this.getStockHistory(params.productId);
      case 'getActiveReservations':
        return this.getActiveReservations(params.productId, params.ownerId);
      case 'checkAvailability':
        return this.checkAvailability(params.productId, params.quantity, params.ownerId);
      case 'getOwnerStock':
        return this.getOwnerStock(params.ownerId);
      case 'getStockByLocation':
        return this.getStockByLocation(params.location);
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
        stock: {
          type: 'object',
          patternProperties: {
            '^.*$': {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                ownerId: { type: 'string' },
                totalQuantity: { type: 'number' },
                availableQuantity: { type: 'number' },
                reservedQuantity: { type: 'number' },
                location: { type: 'string' },
                lastUpdated: { type: 'number' },
                metadata: { type: 'object' }
              },
              required: ['productId', 'ownerId', 'totalQuantity', 'availableQuantity', 'reservedQuantity', 'lastUpdated']
            }
          }
        },
        reservations: {
          type: 'object',
          patternProperties: {
            '^.*$': {
              type: 'object',
              properties: {
                id: { type: 'string' },
                productId: { type: 'string' },
                ownerId: { type: 'string' },
                reservedFor: { type: 'string' },
                quantity: { type: 'number' },
                createdAt: { type: 'number' },
                expiresAt: { type: 'number' },
                status: { type: 'string', enum: ['active', 'fulfilled', 'expired', 'cancelled'] }
              },
              required: ['id', 'productId', 'ownerId', 'reservedFor', 'quantity', 'createdAt', 'expiresAt', 'status']
            }
          }
        }
      }
    };
  }
  
  /**
   * Add stock to a product
   * @param productId ID of the product
   * @param quantity Quantity to add
   * @param location Location of the stock
   * @param reason Reason for adding stock
   * @param ownerId ID of the owner (sender)
   * @param metadata Additional stock metadata
   */
  private async addStock(
    productId: string,
    quantity: number,
    location: string,
    reason: StockChangeReason,
    ownerId: string,
    metadata?: Record<string, any>
  ): Promise<StockResult> {
    // Validate positive quantity
    if (quantity <= 0) {
      return {
        success: false,
        message: "Quantity must be a positive number."
      };
    }
    
    // Verify product exists and owner is valid
    const productResult = await this.callContract(
      this.productManagementContractId,
      'query',
      'getProduct',
      { productId },
      null
    );
    
    if (!productResult.success) {
      return {
        success: false,
        message: `Product validation failed: ${productResult.message}`
      };
    }
    
    // Verify owner owns the product
    if (productResult.product.ownerId !== ownerId) {
      return {
        success: false,
        message: "Only the product owner can add stock."
      };
    }
    
    // Get existing stock or create new
    const stockKey = `stock:${productId}:${ownerId}`;
    let stock = await this.readState<StockData>(stockKey);
    
    if (!stock) {
      // Create new stock record
      stock = {
        productId,
        ownerId,
        totalQuantity: 0,
        availableQuantity: 0,
        reservedQuantity: 0,
        location,
        lastUpdated: Date.now(),
        metadata: {}
      };
    }
    
    // Update stock quantities
    stock.totalQuantity += quantity;
    stock.availableQuantity += quantity;
    stock.location = location;
    stock.lastUpdated = Date.now();
    
    // Merge metadata if provided
    if (metadata) {
      stock.metadata = { ...stock.metadata, ...metadata };
    }
    
    // Save updated stock
    await this.writeState(stockKey, stock);
    
    // Add to location index
    await this.addToLocationIndex(location, productId, ownerId);
    
    // Record stock change in transaction history
    const stockRecord = await this.callContract(
      this.transactionHistoryContractId,
      'execute',
      'recordStockChange',
      {
        productId,
        userId: ownerId,
        userRole: productResult.product.role || UserRole.FARMER, // Default to FARMER if role not provided
        quantity,
        actionType: TransactionActionType.STOCK_ADD,
        reason,
        details: {
          location,
          previousQuantity: stock.totalQuantity - quantity,
          newQuantity: stock.totalQuantity,
          metadata
        }
      },
      ownerId
    );
    
    // Emit stock add event
    await this.emitEvent('StockAdded', {
      productId,
      ownerId,
      quantity,
      location,
      reason,
      timestamp: stock.lastUpdated
    });
    
    return {
      success: true,
      message: `Added ${quantity} units to product ${productId} stock.`,
      stock,
      transactionId: stockRecord.transactionId
    };
  }
  
  /**
   * Remove stock from a product
   * @param productId ID of the product
   * @param quantity Quantity to remove
   * @param reason Reason for removing stock
   * @param ownerId ID of the owner (sender)
   * @param metadata Additional stock metadata
   */
  private async removeStock(
    productId: string,
    quantity: number,
    reason: StockChangeReason,
    ownerId: string,
    metadata?: Record<string, any>
  ): Promise<StockResult> {
    // Validate positive quantity
    if (quantity <= 0) {
      return {
        success: false,
        message: "Quantity must be a positive number."
      };
    }
    
    // Get existing stock
    const stockKey = `stock:${productId}:${ownerId}`;
    const stock = await this.readState<StockData>(stockKey);
    
    if (!stock) {
      return {
        success: false,
        message: `No stock found for product ${productId} owned by ${ownerId}.`
      };
    }
    
    // Verify sufficient available quantity
    if (stock.availableQuantity < quantity) {
      return {
        success: false,
        message: `Insufficient available stock. Requested: ${quantity}, Available: ${stock.availableQuantity}.`
      };
    }
    
    // Backup current values for transaction record
    const previousTotal = stock.totalQuantity;
    const previousAvailable = stock.availableQuantity;
    
    // Update stock quantities
    stock.totalQuantity -= quantity;
    stock.availableQuantity -= quantity;
    stock.lastUpdated = Date.now();
    
    // Merge metadata if provided
    if (metadata) {
      stock.metadata = { ...stock.metadata, ...metadata };
    }
    
    // Save updated stock
    await this.writeState(stockKey, stock);
    
    // Record stock change in transaction history
    const stockRecord = await this.callContract(
      this.transactionHistoryContractId,
      'execute',
      'recordStockChange',
      {
        productId,
        userId: ownerId,
        userRole: UserRole.FARMER, // Default role, should be retrieved from user database
        quantity: -quantity, // Negative to indicate removal
        actionType: TransactionActionType.STOCK_REMOVE,
        reason,
        details: {
          previousTotal,
          previousAvailable,
          newTotal: stock.totalQuantity,
          newAvailable: stock.availableQuantity,
          metadata
        }
      },
      ownerId
    );
    
    // Emit stock remove event
    await this.emitEvent('StockRemoved', {
      productId,
      ownerId,
      quantity,
      reason,
      timestamp: stock.lastUpdated
    });
    
    return {
      success: true,
      message: `Removed ${quantity} units from product ${productId} stock.`,
      stock,
      transactionId: stockRecord.transactionId
    };
  }
  
  /**
   * Adjust stock to a specific quantity
   * @param productId ID of the product
   * @param newQuantity New total quantity
   * @param reason Reason for adjusting stock
   * @param ownerId ID of the owner (sender)
   * @param metadata Additional metadata
   */
  private async adjustStock(
    productId: string,
    newQuantity: number,
    reason: StockChangeReason,
    ownerId: string,
    metadata?: Record<string, any>
  ): Promise<StockResult> {
    // Validate non-negative quantity
    if (newQuantity < 0) {
      return {
        success: false,
        message: "New quantity cannot be negative."
      };
    }
    
    // Get existing stock
    const stockKey = `stock:${productId}:${ownerId}`;
    let stock = await this.readState<StockData>(stockKey);
    
    if (!stock) {
      // If no stock exists, treat this as an absolute set
      return this.addStock(productId, newQuantity, "not-specified", reason, ownerId, metadata);
    }
    
    // Calculate difference
    const difference = newQuantity - stock.totalQuantity;
    
    // Cannot reduce below reserved quantity
    if (newQuantity < stock.reservedQuantity) {
      return {
        success: false,
        message: `Cannot adjust total quantity below reserved quantity. Reserved: ${stock.reservedQuantity}.`
      };
    }
    
    // Backup current values for transaction record
    const previousTotal = stock.totalQuantity;
    const previousAvailable = stock.availableQuantity;
    
    // Update stock quantities
    stock.totalQuantity = newQuantity;
    stock.availableQuantity = newQuantity - stock.reservedQuantity;
    stock.lastUpdated = Date.now();
    
    // Merge metadata if provided
    if (metadata) {
      stock.metadata = { ...stock.metadata, ...metadata };
    }
    
    // Save updated stock
    await this.writeState(stockKey, stock);
    
    // Record stock change in transaction history
    const stockRecord = await this.callContract(
      this.transactionHistoryContractId,
      'execute',
      'recordStockChange',
      {
        productId,
        userId: ownerId,
        userRole: UserRole.FARMER, // Default role, should be retrieved from user database
        quantity: difference, // Can be positive or negative
        actionType: TransactionActionType.STOCK_ADJUSTMENT,
        reason,
        details: {
          previousTotal,
          previousAvailable,
          newTotal: stock.totalQuantity,
          newAvailable: stock.availableQuantity,
          adjustmentType: difference >= 0 ? 'increase' : 'decrease',
          metadata
        }
      },
      ownerId
    );
    
    // Emit stock adjust event
    await this.emitEvent('StockAdjusted', {
      productId,
      ownerId,
      previousQuantity: previousTotal,
      newQuantity,
      difference,
      reason,
      timestamp: stock.lastUpdated
    });
    
    return {
      success: true,
      message: `Adjusted product ${productId} stock to ${newQuantity} units (change: ${difference}).`,
      stock,
      transactionId: stockRecord.transactionId
    };
  }
  
  /**
   * Reserve stock for a future transfer or sale
   * @param productId ID of the product
   * @param quantity Quantity to reserve
   * @param reservedFor ID of user the stock is reserved for
   * @param expirationHours Hours until reservation expires
   * @param ownerId ID of the owner (sender)
   */
  private async reserveStock(
    productId: string,
    quantity: number,
    reservedFor: string,
    expirationHours: number,
    ownerId: string
  ): Promise<StockResult> {
    // Validate positive quantity
    if (quantity <= 0) {
      return {
        success: false,
        message: "Quantity must be a positive number."
      };
    }
    
    // Validate expiration
    if (expirationHours <= 0) {
      return {
        success: false,
        message: "Expiration hours must be a positive number."
      };
    }
    
    // Get existing stock
    const stockKey = `stock:${productId}:${ownerId}`;
    const stock = await this.readState<StockData>(stockKey);
    
    if (!stock) {
      return {
        success: false,
        message: `No stock found for product ${productId} owned by ${ownerId}.`
      };
    }
    
    // Verify sufficient available quantity
    if (stock.availableQuantity < quantity) {
      return {
        success: false,
        message: `Insufficient available stock. Requested: ${quantity}, Available: ${stock.availableQuantity}.`
      };
    }
    
    // Generate reservation ID
    const reservationId = this.generateReservationId();
    
    // Calculate expiration timestamp
    const now = Date.now();
    const expiresAt = now + (expirationHours * 60 * 60 * 1000); // Convert hours to milliseconds
    
    // Create reservation
    const reservation: StockReservation = {
      id: reservationId,
      productId,
      ownerId,
      reservedFor,
      quantity,
      createdAt: now,
      expiresAt,
      status: 'active'
    };
    
    // Save reservation
    await this.writeState(`reservation:${reservationId}`, reservation);
    
    // Add to product reservations index
    await this.addToReservationIndex(productId, ownerId, reservationId);
    
    // Update stock quantities
    stock.availableQuantity -= quantity;
    stock.reservedQuantity += quantity;
    stock.lastUpdated = now;
    
    // Save updated stock
    await this.writeState(stockKey, stock);
    
    // Emit reservation event
    await this.emitEvent('StockReserved', {
      reservationId,
      productId,
      ownerId,
      reservedFor,
      quantity,
      expiresAt,
      timestamp: now
    });
    
    return {
      success: true,
      message: `Reserved ${quantity} units of product ${productId} for ${reservedFor} until ${new Date(expiresAt).toISOString()}.`,
      stock,
      reservationId
    };
  }
  
  /**
   * Fulfill a stock reservation
   * @param reservationId ID of the reservation to fulfill
   * @param ownerId ID of the owner (sender)
   */
  private async fulfillReservation(
    reservationId: string,
    ownerId: string
  ): Promise<StockResult> {
    // Get reservation
    const reservation = await this.readState<StockReservation>(`reservation:${reservationId}`);
    
    if (!reservation) {
      return {
        success: false,
        message: `Reservation with ID ${reservationId} not found.`
      };
    }
    
    // Verify owner matches
    if (reservation.ownerId !== ownerId) {
      return {
        success: false,
        message: "Only the stock owner can fulfill the reservation."
      };
    }
    
    // Verify reservation is active
    if (reservation.status !== 'active') {
      return {
        success: false,
        message: `Reservation is not active. Current status: ${reservation.status}.`
      };
    }
    
    // Verify not expired
    if (reservation.expiresAt < Date.now()) {
      return {
        success: false,
        message: "Reservation has expired."
      };
    }
    
    // Get stock
    const stockKey = `stock:${reservation.productId}:${ownerId}`;
    const stock = await this.readState<StockData>(stockKey);
    
    if (!stock) {
      return {
        success: false,
        message: `No stock found for product ${reservation.productId} owned by ${ownerId}.`
      };
    }
    
    // Update reservation status
    reservation.status = 'fulfilled';
    await this.writeState(`reservation:${reservationId}`, reservation);
    
    // Update stock quantities (reduce reserved, total remains the same)
    stock.reservedQuantity -= reservation.quantity;
    // Note: We don't increase available because the stock is being transferred 
    // out through fulfillment - it reduces the total
    stock.totalQuantity -= reservation.quantity;
    stock.lastUpdated = Date.now();
    
    // Save updated stock
    await this.writeState(stockKey, stock);
    
    // Emit fulfillment event
    await this.emitEvent('ReservationFulfilled', {
      reservationId,
      productId: reservation.productId,
      ownerId,
      reservedFor: reservation.reservedFor,
      quantity: reservation.quantity,
      timestamp: Date.now()
    });
    
    return {
      success: true,
      message: `Fulfilled reservation ${reservationId} for ${reservation.quantity} units of product ${reservation.productId}.`,
      stock,
      reservationId
    };
  }
  
  /**
   * Cancel a stock reservation
   * @param reservationId ID of the reservation to cancel
   * @param ownerId ID of the owner (sender)
   */
  private async cancelReservation(
    reservationId: string,
    ownerId: string
  ): Promise<StockResult> {
    // Get reservation
    const reservation = await this.readState<StockReservation>(`reservation:${reservationId}`);
    
    if (!reservation) {
      return {
        success: false,
        message: `Reservation with ID ${reservationId} not found.`
      };
    }
    
    // Verify owner matches or reserver is cancelling their own reservation
    const isOwner = reservation.ownerId === ownerId;
    const isReserver = reservation.reservedFor === ownerId;
    
    if (!isOwner && !isReserver) {
      return {
        success: false,
        message: "Only the stock owner or the reserver can cancel the reservation."
      };
    }
    
    // Verify reservation is active
    if (reservation.status !== 'active') {
      return {
        success: false,
        message: `Reservation is not active. Current status: ${reservation.status}.`
      };
    }
    
    // Get stock
    const stockKey = `stock:${reservation.productId}:${reservation.ownerId}`;
    const stock = await this.readState<StockData>(stockKey);
    
    if (!stock) {
      return {
        success: false,
        message: `No stock found for product ${reservation.productId} owned by ${reservation.ownerId}.`
      };
    }
    
    // Update reservation status
    reservation.status = 'cancelled';
    await this.writeState(`reservation:${reservationId}`, reservation);
    
    // Update stock quantities (reduce reserved, return to available)
    stock.reservedQuantity -= reservation.quantity;
    stock.availableQuantity += reservation.quantity;
    stock.lastUpdated = Date.now();
    
    // Save updated stock
    await this.writeState(stockKey, stock);
    
    // Emit cancellation event
    await this.emitEvent('ReservationCancelled', {
      reservationId,
      productId: reservation.productId,
      ownerId: reservation.ownerId,
      reservedFor: reservation.reservedFor,
      quantity: reservation.quantity,
      cancelledBy: ownerId,
      timestamp: Date.now()
    });
    
    return {
      success: true,
      message: `Cancelled reservation ${reservationId} for ${reservation.quantity} units of product ${reservation.productId}.`,
      stock,
      reservationId
    };
  }
  
  /**
   * Move stock to a new location
   * @param productId ID of the product
   * @param quantity Quantity to move
   * @param newLocation New stock location
   * @param ownerId ID of the owner (sender)
   * @param metadata Additional metadata
   */
  private async moveStock(
    productId: string,
    quantity: number,
    newLocation: string,
    ownerId: string,
    metadata?: Record<string, any>
  ): Promise<StockResult> {
    // Validate positive quantity
    if (quantity <= 0) {
      return {
        success: false,
        message: "Quantity must be a positive number."
      };
    }
    
    // Get existing stock
    const stockKey = `stock:${productId}:${ownerId}`;
    const stock = await this.readState<StockData>(stockKey);
    
    if (!stock) {
      return {
        success: false,
        message: `No stock found for product ${productId} owned by ${ownerId}.`
      };
    }
    
    // Verify sufficient available quantity
    if (stock.availableQuantity < quantity) {
      return {
        success: false,
        message: `Insufficient available stock. Requested: ${quantity}, Available: ${stock.availableQuantity}.`
      };
    }
    
    // Save old location for event
    const oldLocation = stock.location;
    
    // Update stock location
    stock.location = newLocation;
    stock.lastUpdated = Date.now();
    
    // Merge metadata if provided
    if (metadata) {
      stock.metadata = { ...stock.metadata, ...metadata };
    }
    
    // Save updated stock
    await this.writeState(stockKey, stock);
    
    // Update location indexes
    if (oldLocation) {
      await this.removeFromLocationIndex(oldLocation, productId, ownerId);
    }
    await this.addToLocationIndex(newLocation, productId, ownerId);
    
    // Emit stock move event
    await this.emitEvent('StockMoved', {
      productId,
      ownerId,
      quantity,
      oldLocation,
      newLocation,
      timestamp: stock.lastUpdated
    });
    
    return {
      success: true,
      message: `Moved ${quantity} units of product ${productId} from ${oldLocation || 'unspecified location'} to ${newLocation}.`,
      stock
    };
  }
  
  /**
   * Get stock for a product and owner
   * @param productId ID of the product
   * @param ownerId ID of the owner
   */
  private async getStock(
    productId: string,
    ownerId: string
  ): Promise<StockResult> {
    const stockKey = `stock:${productId}:${ownerId}`;
    const stock = await this.readState<StockData>(stockKey);
    
    if (!stock) {
      return {
        success: false,
        message: `No stock found for product ${productId} owned by ${ownerId}.`
      };
    }
    
    return {
      success: true,
      stock
    };
  }
  
  /**
   * Get stock history for a product
   * @param productId ID of the product
   */
  private async getStockHistory(productId: string): Promise<any> {
    // Call transaction history contract to get stock transaction records
    return this.callContract(
      this.transactionHistoryContractId,
      'query',
      'getProductStockHistory',
      { productId },
      null
    );
  }
  
  /**
   * Get active reservations for a product and owner
   * @param productId ID of the product
   * @param ownerId ID of the owner
   */
  private async getActiveReservations(
    productId: string,
    ownerId: string
  ): Promise<any> {
    const reservationIdsKey = `product:${productId}:owner:${ownerId}:reservations`;
    const reservationIds = await this.readState<string[]>(reservationIdsKey) || [];
    
    const activeReservations: StockReservation[] = [];
    
    for (const id of reservationIds) {
      const reservation = await this.readState<StockReservation>(`reservation:${id}`);
      
      if (reservation && reservation.status === 'active') {
        activeReservations.push(reservation);
      }
    }
    
    return {
      success: true,
      reservations: activeReservations
    };
  }
  
  /**
   * Check if a quantity is available in stock
   * @param productId ID of the product
   * @param quantity Quantity needed
   * @param ownerId ID of the owner
   */
  private async checkAvailability(
    productId: string,
    quantity: number,
    ownerId: string
  ): Promise<StockResult> {
    const stockResult = await this.getStock(productId, ownerId);
    
    if (!stockResult.success) {
      return stockResult;
    }
    
    const stock = stockResult.stock!;
    const isAvailable = stock.availableQuantity >= quantity;
    
    return {
      success: isAvailable,
      message: isAvailable 
        ? `Requested quantity (${quantity}) is available.` 
        : `Insufficient stock. Requested: ${quantity}, Available: ${stock.availableQuantity}.`,
      stock
    };
  }
  
  /**
   * Get all stock for a specific owner
   * @param ownerId ID of the owner
   */
  private async getOwnerStock(ownerId: string): Promise<any> {
    // This would need an index of all owner's stocks
    // Simplified implementation for now
    const prefix = `stock:*:${ownerId}`;
    
    // In a real implementation, we would use wildcards or maintain an index
    // Here we'll return a placeholder
    
    return {
      success: true,
      message: `Stock query for owner ${ownerId} would return all their stock items.`
    };
  }
  
  /**
   * Get all stock at a specific location
   * @param location Stock location
   */
  private async getStockByLocation(location: string): Promise<any> {
    const locationKey = `location:${location}:products`;
    const stockItems = await this.readState<Array<{ productId: string, ownerId: string }>>(locationKey) || [];
    
    const stocks: StockData[] = [];
    
    for (const item of stockItems) {
      const stock = await this.readState<StockData>(`stock:${item.productId}:${item.ownerId}`);
      if (stock) {
        stocks.push(stock);
      }
    }
    
    return {
      success: true,
      stocks,
      location
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
    // In a real implementation, this would use the contract registry
    // Here we'll simulate the contract call
    console.log(`Calling ${contractId}.${method} with params:`, params);
    
    // Placeholder implementation - in a real system this would delegate to the contract registry
    return {
      success: true,
      message: `Contract call to ${contractId}.${method} simulated`,
      // Add mock data based on the method called
      role: params.userId ? UserRole.FARMER : undefined,
      transactionId: method.includes('record') ? `txn-${Date.now()}` : undefined,
      product: params.productId ? {
        id: params.productId,
        ownerId: params.ownerId || 'unknown',
        role: UserRole.FARMER
      } : undefined
    };
  }
  
  /**
   * Add a product to the location index
   * @param location Stock location
   * @param productId ID of the product
   * @param ownerId ID of the owner
   */
  private async addToLocationIndex(
    location: string,
    productId: string,
    ownerId: string
  ): Promise<void> {
    const locationKey = `location:${location}:products`;
    const locationItems = await this.readState<Array<{ productId: string, ownerId: string }>>(locationKey) || [];
    
    // Check if already in the index
    const exists = locationItems.some(item => 
      item.productId === productId && item.ownerId === ownerId
    );
    
    if (!exists) {
      locationItems.push({ productId, ownerId });
      await this.writeState(locationKey, locationItems);
    }
  }
  
  /**
   * Remove a product from the location index
   * @param location Stock location
   * @param productId ID of the product
   * @param ownerId ID of the owner
   */
  private async removeFromLocationIndex(
    location: string,
    productId: string,
    ownerId: string
  ): Promise<void> {
    const locationKey = `location:${location}:products`;
    const locationItems = await this.readState<Array<{ productId: string, ownerId: string }>>(locationKey) || [];
    
    // Filter out the item
    const updatedItems = locationItems.filter(item => 
      !(item.productId === productId && item.ownerId === ownerId)
    );
    
    await this.writeState(locationKey, updatedItems);
  }
  
  /**
   * Add a reservation to the product-owner index
   * @param productId ID of the product
   * @param ownerId ID of the owner
   * @param reservationId ID of the reservation
   */
  private async addToReservationIndex(
    productId: string,
    ownerId: string,
    reservationId: string
  ): Promise<void> {
    const indexKey = `product:${productId}:owner:${ownerId}:reservations`;
    const reservationIds = await this.readState<string[]>(indexKey) || [];
    
    if (!reservationIds.includes(reservationId)) {
      reservationIds.push(reservationId);
      await this.writeState(indexKey, reservationIds);
    }
  }
  
  /**
   * Generate a unique reservation ID
   */
  private generateReservationId(): string {
    return `rsrv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
} 