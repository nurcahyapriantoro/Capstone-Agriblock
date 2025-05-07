import { SmartContract } from './ISmartContract';
import { Level } from 'level';
import { UserRole, TransactionActionType, ProductStatus } from '../enum';
import { ContractRegistry } from './ContractRegistry';

/**
 * Payment data structure
 */
interface PaymentData {
  id: string;
  productId: string;
  fromUserId: string;
  fromRole: UserRole;
  toUserId: string;
  toRole: UserRole;
  amount: number;
  currency: string;
  paymentType: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: number;
  completedAt?: number;
  metadata?: Record<string, any>;
}

/**
 * Escrow data structure
 */
interface EscrowData {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  fromUserId: string;
  toUserId: string;
  status: 'held' | 'released' | 'refunded';
  createdAt: number;
  releasedAt?: number;
  refundedAt?: number;
  conditions?: Record<string, any>;
}

/**
 * Payment operation result
 */
interface PaymentResult {
  success: boolean;
  message?: string;
  payment?: PaymentData;
  escrow?: EscrowData;
  transactionId?: string;
}

/**
 * Smart contract for payment management
 * Handles payments, escrow, and financial transactions in the supply chain
 */
export class PaymentManagementContract extends SmartContract {
  // Contract dependency IDs
  private roleValidationContractId: string = 'role-validation-v1';
  private transactionHistoryContractId: string = 'transaction-history-v1';
  private productManagementContractId: string = 'product-management-v1';
  
  constructor(stateDB: Level<string, string>) {
    super(
      'payment-management-v1',
      'PaymentManagement',
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
      console.error('Failed to initialize PaymentManagement contract:', error);
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
      case 'createPayment':
        return this.createPayment(
          params.productId,
          sender, // fromUserId is the sender
          params.toUserId,
          params.amount,
          params.currency,
          params.paymentType,
          params.metadata
        );
      case 'completePayment':
        return this.completePayment(
          params.paymentId,
          sender
        );
      case 'createEscrow':
        return this.createEscrow(
          params.productId,
          sender, // fromUserId is the sender
          params.toUserId,
          params.amount,
          params.currency,
          params.conditions
        );
      case 'releaseEscrow':
        return this.releaseEscrow(
          params.escrowId,
          sender
        );
      case 'refundEscrow':
        return this.refundEscrow(
          params.escrowId,
          sender
        );
      case 'issueRefund':
        return this.issueRefund(
          params.paymentId,
          params.reason,
          sender
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
      case 'getPayment':
        return this.getPayment(params.paymentId);
      case 'getPaymentsByProduct':
        return this.getPaymentsByProduct(params.productId);
      case 'getUserPayments':
        return this.getUserPayments(params.userId, params.role);
      case 'getEscrow':
        return this.getEscrow(params.escrowId);
      case 'getActiveEscrows':
        return this.getActiveEscrows(params.userId);
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
        payments: {
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
                amount: { type: 'number' },
                currency: { type: 'string' },
                paymentType: { type: 'string' },
                status: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded'] },
                createdAt: { type: 'number' },
                completedAt: { type: 'number' },
                metadata: { type: 'object' }
              },
              required: ['id', 'productId', 'fromUserId', 'fromRole', 'toUserId', 'toRole', 'amount', 'currency', 'paymentType', 'status', 'createdAt']
            }
          }
        },
        escrows: {
          type: 'object',
          patternProperties: {
            '^.*$': {
              type: 'object',
              properties: {
                id: { type: 'string' },
                paymentId: { type: 'string' },
                amount: { type: 'number' },
                currency: { type: 'string' },
                fromUserId: { type: 'string' },
                toUserId: { type: 'string' },
                status: { type: 'string', enum: ['held', 'released', 'refunded'] },
                createdAt: { type: 'number' },
                releasedAt: { type: 'number' },
                refundedAt: { type: 'number' },
                conditions: { type: 'object' }
              },
              required: ['id', 'paymentId', 'amount', 'currency', 'fromUserId', 'toUserId', 'status', 'createdAt']
            }
          }
        }
      }
    };
  }
  
  /**
   * Create a new payment
   * @param productId ID of the product being paid for
   * @param fromUserId ID of the payer (sender)
   * @param toUserId ID of the payee
   * @param amount Payment amount
   * @param currency Payment currency
   * @param paymentType Type of payment
   * @param metadata Additional payment metadata
   */
  private async createPayment(
    productId: string,
    fromUserId: string,
    toUserId: string,
    amount: number,
    currency: string,
    paymentType: string,
    metadata?: Record<string, any>
  ): Promise<PaymentResult> {
    // Validate positive amount
    if (amount <= 0) {
      return {
        success: false,
        message: "Payment amount must be positive."
      };
    }
    
    // Verify product exists
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
    
    // Get roles of both parties
    const fromUserRoleResult = await this.callContract(
      this.roleValidationContractId,
      'query',
      'getUserRole',
      { userId: fromUserId },
      null
    );
    
    const toUserRoleResult = await this.callContract(
      this.roleValidationContractId,
      'query',
      'getUserRole',
      { userId: toUserId },
      null
    );
    
    if (!fromUserRoleResult.success || !toUserRoleResult.success) {
      return {
        success: false,
        message: !fromUserRoleResult.success 
          ? `Payer validation failed: ${fromUserRoleResult.message}`
          : `Payee validation failed: ${toUserRoleResult.message}`
      };
    }
    
    const fromRole = fromUserRoleResult.role;
    const toRole = toUserRoleResult.role;
    
    // Generate a unique payment ID
    const paymentId = this.generatePaymentId();
    
    // Create payment data
    const payment: PaymentData = {
      id: paymentId,
      productId,
      fromUserId,
      fromRole,
      toUserId,
      toRole,
      amount,
      currency,
      paymentType,
      status: 'pending',
      createdAt: Date.now(),
      metadata
    };
    
    // Save payment data
    await this.writeState(`payment:${paymentId}`, payment);
    
    // Add to product payments index
    await this.addToPaymentIndex('product', productId, paymentId);
    
    // Add to user payments indexes
    await this.addToPaymentIndex('from', fromUserId, paymentId);
    await this.addToPaymentIndex('to', toUserId, paymentId);
    
    // Record payment in transaction history
    const paymentRecord = await this.callContract(
      this.transactionHistoryContractId,
      'execute',
      'recordPaymentTransaction',
      {
        productId,
        fromUserId,
        fromRole,
        toUserId,
        toRole,
        amount,
        paymentType,
        paymentData: {
          currency,
          status: 'pending',
          timestamp: payment.createdAt,
          ...metadata
        }
      },
      fromUserId
    );
    
    // Emit payment creation event
    await this.emitEvent('PaymentCreated', {
      paymentId,
      productId,
      fromUserId,
      toUserId,
      amount,
      currency,
      paymentType,
      timestamp: payment.createdAt
    });
    
    return {
      success: true,
      message: `Payment ${paymentId} created successfully.`,
      payment,
      transactionId: paymentRecord.transactionId
    };
  }
  
  /**
   * Complete a pending payment
   * @param paymentId ID of the payment to complete
   * @param userId ID of the user completing the payment (normally the receiver)
   */
  private async completePayment(
    paymentId: string,
    userId: string
  ): Promise<PaymentResult> {
    // Get payment data
    const payment = await this.readState<PaymentData>(`payment:${paymentId}`);
    
    if (!payment) {
      return {
        success: false,
        message: `Payment with ID ${paymentId} not found.`
      };
    }
    
    // Verify payment is in pending status
    if (payment.status !== 'pending') {
      return {
        success: false,
        message: `Payment is not in pending status. Current status: ${payment.status}.`
      };
    }
    
    // Verify user is authorized to complete the payment
    // Usually the receiver confirms, but we could also allow the sender or admin
    const isReceiver = payment.toUserId === userId;
    const isSender = payment.fromUserId === userId;
    
    if (!isReceiver && !isSender) {
      return {
        success: false,
        message: "Only the payment receiver or sender can complete the payment."
      };
    }
    
    // Update payment status
    payment.status = 'completed';
    payment.completedAt = Date.now();
    
    // Save updated payment
    await this.writeState(`payment:${paymentId}`, payment);
    
    // Record payment completion in transaction history
    const completionRecord = await this.callContract(
      this.transactionHistoryContractId,
      'execute',
      'recordPaymentTransaction',
      {
        productId: payment.productId,
        fromUserId: payment.fromUserId,
        fromRole: payment.fromRole,
        toUserId: payment.toUserId,
        toRole: payment.toRole,
        amount: payment.amount,
        paymentType: `${payment.paymentType}-completion`,
        paymentData: {
          currency: payment.currency,
          status: 'completed',
          completedAt: payment.completedAt,
          completedBy: userId
        }
      },
      userId
    );
    
    // Emit payment completion event
    await this.emitEvent('PaymentCompleted', {
      paymentId,
      productId: payment.productId,
      fromUserId: payment.fromUserId,
      toUserId: payment.toUserId,
      amount: payment.amount,
      currency: payment.currency,
      completedBy: userId,
      timestamp: payment.completedAt
    });
    
    return {
      success: true,
      message: `Payment ${paymentId} completed successfully.`,
      payment,
      transactionId: completionRecord.transactionId
    };
  }
  
  /**
   * Create an escrow payment
   * @param productId ID of the product being paid for
   * @param fromUserId ID of the payer (sender)
   * @param toUserId ID of the payee
   * @param amount Escrow amount
   * @param currency Payment currency
   * @param conditions Conditions for releasing the escrow
   */
  private async createEscrow(
    productId: string,
    fromUserId: string,
    toUserId: string,
    amount: number,
    currency: string,
    conditions: Record<string, any>
  ): Promise<PaymentResult> {
    // First, create a payment for the escrow
    const paymentResult = await this.createPayment(
      productId,
      fromUserId,
      toUserId,
      amount,
      currency,
      'escrow',
      { isEscrow: true, conditions }
    );
    
    if (!paymentResult.success) {
      return paymentResult;
    }
    
    // Generate a unique escrow ID
    const escrowId = this.generateEscrowId();
    
    // Create escrow data
    const escrow: EscrowData = {
      id: escrowId,
      paymentId: paymentResult.payment!.id,
      amount,
      currency,
      fromUserId,
      toUserId,
      status: 'held',
      createdAt: Date.now(),
      conditions
    };
    
    // Save escrow data
    await this.writeState(`escrow:${escrowId}`, escrow);
    
    // Link escrow to payment
    await this.writeState(`payment:${paymentResult.payment!.id}:escrow`, escrowId);
    
    // Add to active escrows index
    await this.addToEscrowIndex(fromUserId, escrowId);
    await this.addToEscrowIndex(toUserId, escrowId);
    
    // Emit escrow creation event
    await this.emitEvent('EscrowCreated', {
      escrowId,
      paymentId: paymentResult.payment!.id,
      productId,
      fromUserId,
      toUserId,
      amount,
      currency,
      conditions,
      timestamp: escrow.createdAt
    });
    
    return {
      success: true,
      message: `Escrow ${escrowId} created successfully.`,
      payment: paymentResult.payment,
      escrow,
      transactionId: paymentResult.transactionId
    };
  }
  
  /**
   * Release funds from escrow to the recipient
   * @param escrowId ID of the escrow to release
   * @param userId ID of the user releasing the escrow (normally the sender)
   */
  private async releaseEscrow(
    escrowId: string,
    userId: string
  ): Promise<PaymentResult> {
    // Get escrow data
    const escrow = await this.readState<EscrowData>(`escrow:${escrowId}`);
    
    if (!escrow) {
      return {
        success: false,
        message: `Escrow with ID ${escrowId} not found.`
      };
    }
    
    // Verify escrow is still held
    if (escrow.status !== 'held') {
      return {
        success: false,
        message: `Escrow is not in held status. Current status: ${escrow.status}.`
      };
    }
    
    // Verify user is authorized to release the escrow
    // Normally only the sender can release the escrow
    if (escrow.fromUserId !== userId) {
      return {
        success: false,
        message: "Only the escrow creator can release the funds."
      };
    }
    
    // Get the associated payment
    const payment = await this.readState<PaymentData>(`payment:${escrow.paymentId}`);
    
    if (!payment) {
      return {
        success: false,
        message: `Associated payment with ID ${escrow.paymentId} not found.`
      };
    }
    
    // Update escrow status
    escrow.status = 'released';
    escrow.releasedAt = Date.now();
    
    // Save updated escrow
    await this.writeState(`escrow:${escrowId}`, escrow);
    
    // Complete the payment
    payment.status = 'completed';
    payment.completedAt = escrow.releasedAt;
    await this.writeState(`payment:${payment.id}`, payment);
    
    // Record escrow release in transaction history
    const releaseRecord = await this.callContract(
      this.transactionHistoryContractId,
      'execute',
      'recordPaymentTransaction',
      {
        productId: payment.productId,
        fromUserId: payment.fromUserId,
        fromRole: payment.fromRole,
        toUserId: payment.toUserId,
        toRole: payment.toRole,
        amount: payment.amount,
        paymentType: 'escrow-release',
        paymentData: {
          currency: payment.currency,
          escrowId,
          releasedAt: escrow.releasedAt,
          releasedBy: userId
        }
      },
      userId
    );
    
    // Emit escrow release event
    await this.emitEvent('EscrowReleased', {
      escrowId,
      paymentId: payment.id,
      productId: payment.productId,
      fromUserId: payment.fromUserId,
      toUserId: payment.toUserId,
      amount: payment.amount,
      currency: payment.currency,
      releasedBy: userId,
      timestamp: escrow.releasedAt
    });
    
    return {
      success: true,
      message: `Escrow ${escrowId} released successfully.`,
      payment,
      escrow,
      transactionId: releaseRecord.transactionId
    };
  }
  
  /**
   * Refund escrow back to the sender
   * @param escrowId ID of the escrow to refund
   * @param userId ID of the user refunding the escrow
   */
  private async refundEscrow(
    escrowId: string,
    userId: string
  ): Promise<PaymentResult> {
    // Get escrow data
    const escrow = await this.readState<EscrowData>(`escrow:${escrowId}`);
    
    if (!escrow) {
      return {
        success: false,
        message: `Escrow with ID ${escrowId} not found.`
      };
    }
    
    // Verify escrow is still held
    if (escrow.status !== 'held') {
      return {
        success: false,
        message: `Escrow is not in held status. Current status: ${escrow.status}.`
      };
    }
    
    // Verify user is authorized to refund the escrow
    // Either sender or receiver can initiate a refund
    const isSender = escrow.fromUserId === userId;
    const isReceiver = escrow.toUserId === userId;
    
    if (!isSender && !isReceiver) {
      return {
        success: false,
        message: "Only the escrow sender or receiver can refund the escrow."
      };
    }
    
    // Get the associated payment
    const payment = await this.readState<PaymentData>(`payment:${escrow.paymentId}`);
    
    if (!payment) {
      return {
        success: false,
        message: `Associated payment with ID ${escrow.paymentId} not found.`
      };
    }
    
    // Update escrow status
    escrow.status = 'refunded';
    escrow.refundedAt = Date.now();
    
    // Save updated escrow
    await this.writeState(`escrow:${escrowId}`, escrow);
    
    // Update payment status
    payment.status = 'refunded';
    await this.writeState(`payment:${payment.id}`, payment);
    
    // Record escrow refund in transaction history
    const refundRecord = await this.callContract(
      this.transactionHistoryContractId,
      'execute',
      'recordPaymentTransaction',
      {
        productId: payment.productId,
        fromUserId: payment.toUserId, // Reversed for refund
        fromRole: payment.toRole,
        toUserId: payment.fromUserId, // Reversed for refund
        toRole: payment.fromRole,
        amount: payment.amount,
        paymentType: 'escrow-refund',
        paymentData: {
          currency: payment.currency,
          escrowId,
          refundedAt: escrow.refundedAt,
          refundedBy: userId
        }
      },
      userId
    );
    
    // Emit escrow refund event
    await this.emitEvent('EscrowRefunded', {
      escrowId,
      paymentId: payment.id,
      productId: payment.productId,
      fromUserId: payment.fromUserId,
      toUserId: payment.toUserId,
      amount: payment.amount,
      currency: payment.currency,
      refundedBy: userId,
      timestamp: escrow.refundedAt
    });
    
    return {
      success: true,
      message: `Escrow ${escrowId} refunded successfully.`,
      payment,
      escrow,
      transactionId: refundRecord.transactionId
    };
  }
  
  /**
   * Issue a refund for a completed payment
   * @param paymentId ID of the payment to refund
   * @param reason Reason for the refund
   * @param userId ID of the user issuing the refund
   */
  private async issueRefund(
    paymentId: string,
    reason: string,
    userId: string
  ): Promise<PaymentResult> {
    // Get payment data
    const payment = await this.readState<PaymentData>(`payment:${paymentId}`);
    
    if (!payment) {
      return {
        success: false,
        message: `Payment with ID ${paymentId} not found.`
      };
    }
    
    // Verify payment is completed (only completed payments can be refunded)
    if (payment.status !== 'completed') {
      return {
        success: false,
        message: `Payment is not in completed status. Current status: ${payment.status}.`
      };
    }
    
    // Verify user is authorized to issue the refund
    // Hanya penerima pembayaran yang dapat mengeluarkan pengembalian dana
    if (payment.toUserId !== userId) {
      return {
        success: false,
        message: "Only the payment receiver can issue a refund."
      };
    }
    
    // Update payment status
    payment.status = 'refunded';
    const refundedAt = Date.now();
    
    // Add refund details to metadata
    payment.metadata = {
      ...payment.metadata,
      refund: {
        reason,
        refundedAt,
        refundedBy: userId
      }
    };
    
    // Save updated payment
    await this.writeState(`payment:${paymentId}`, payment);
    
    // Record refund in transaction history
    const refundRecord = await this.callContract(
      this.transactionHistoryContractId,
      'execute',
      'recordPaymentTransaction',
      {
        productId: payment.productId,
        fromUserId: payment.toUserId, // Reversed for refund
        fromRole: payment.toRole,
        toUserId: payment.fromUserId, // Reversed for refund
        toRole: payment.fromRole,
        amount: payment.amount,
        paymentType: 'refund',
        paymentData: {
          currency: payment.currency,
          reason,
          refundedAt,
          refundedBy: userId
        }
      },
      userId
    );
    
    // Emit refund event
    await this.emitEvent('PaymentRefunded', {
      paymentId,
      productId: payment.productId,
      fromUserId: payment.fromUserId,
      toUserId: payment.toUserId,
      amount: payment.amount,
      currency: payment.currency,
      reason,
      refundedBy: userId,
      timestamp: refundedAt
    });
    
    return {
      success: true,
      message: `Payment ${paymentId} refunded successfully.`,
      payment,
      transactionId: refundRecord.transactionId
    };
  }
  
  /**
   * Get payment by ID
   * @param paymentId ID of the payment to retrieve
   */
  private async getPayment(paymentId: string): Promise<PaymentResult> {
    const payment = await this.readState<PaymentData>(`payment:${paymentId}`);
    
    if (!payment) {
      return {
        success: false,
        message: `Payment with ID ${paymentId} not found.`
      };
    }
    
    return {
      success: true,
      payment
    };
  }
  
  /**
   * Get all payments for a product
   * @param productId ID of the product
   */
  private async getPaymentsByProduct(productId: string): Promise<PaymentResult> {
    const paymentIds = await this.readState<string[]>(`product:${productId}:payments`) || [];
    const payments: PaymentData[] = [];
    
    for (const paymentId of paymentIds) {
      const payment = await this.readState<PaymentData>(`payment:${paymentId}`);
      if (payment) {
        payments.push(payment);
      }
    }
    
    return {
      success: true,
      message: `Found ${payments.length} payments for product ${productId}`
    };
  }
  
  /**
   * Get payments for a user
   * @param userId ID of the user
   * @param role Role to filter by ('from' for payments made, 'to' for payments received)
   */
  private async getUserPayments(
    userId: string,
    role: 'from' | 'to'
  ): Promise<PaymentResult> {
    const paymentIds = await this.readState<string[]>(`${role}:${userId}:payments`) || [];
    const payments: PaymentData[] = [];
    
    for (const paymentId of paymentIds) {
      const payment = await this.readState<PaymentData>(`payment:${paymentId}`);
      if (payment) {
        payments.push(payment);
      }
    }
    
    return {
      success: true,
      message: `Found ${payments.length} payments ${role === 'from' ? 'made by' : 'received by'} user ${userId}`
    };
  }
  
  /**
   * Get escrow by ID
   * @param escrowId ID of the escrow to retrieve
   */
  private async getEscrow(escrowId: string): Promise<PaymentResult> {
    const escrow = await this.readState<EscrowData>(`escrow:${escrowId}`);
    
    if (!escrow) {
      return {
        success: false,
        message: `Escrow with ID ${escrowId} not found.`
      };
    }
    
    // Get the associated payment
    const payment = await this.readState<PaymentData>(`payment:${escrow.paymentId}`);
    
    return {
      success: true,
      escrow,
      payment: payment || undefined
    };
  }
  
  /**
   * Get active escrows for a user
   * @param userId ID of the user
   */
  private async getActiveEscrows(userId: string): Promise<PaymentResult> {
    const escrowIds = await this.readState<string[]>(`user:${userId}:escrows`) || [];
    const activeEscrows: EscrowData[] = [];
    
    for (const escrowId of escrowIds) {
      const escrow = await this.readState<EscrowData>(`escrow:${escrowId}`);
      if (escrow && escrow.status === 'held') {
        activeEscrows.push(escrow);
      }
    }
    
    return {
      success: true,
      message: `Found ${activeEscrows.length} active escrows for user ${userId}`
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
   * Add a payment to an index for efficient querying
   * @param indexType Type of index ('product', 'from', 'to')
   * @param indexKey Key for the index
   * @param paymentId ID of the payment
   */
  private async addToPaymentIndex(
    indexType: 'product' | 'from' | 'to',
    indexKey: string,
    paymentId: string
  ): Promise<void> {
    const key = `${indexType}:${indexKey}:payments`;
    const paymentIds = await this.readState<string[]>(key) || [];
    
    if (!paymentIds.includes(paymentId)) {
      paymentIds.push(paymentId);
      await this.writeState(key, paymentIds);
    }
  }
  
  /**
   * Add an escrow to the user's escrow index
   * @param userId ID of the user
   * @param escrowId ID of the escrow
   */
  private async addToEscrowIndex(
    userId: string,
    escrowId: string
  ): Promise<void> {
    const key = `user:${userId}:escrows`;
    const escrowIds = await this.readState<string[]>(key) || [];
    
    if (!escrowIds.includes(escrowId)) {
      escrowIds.push(escrowId);
      await this.writeState(key, escrowIds);
    }
  }
  
  /**
   * Generate a unique payment ID
   */
  private generatePaymentId(): string {
    return `pay-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Generate a unique escrow ID
   */
  private generateEscrowId(): string {
    return `escr-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}