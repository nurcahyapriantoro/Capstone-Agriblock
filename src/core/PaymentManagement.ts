import { 
  UserRole,
  TransactionActionType,
  ProductStatus
} from "../enum";
import ProductService from "./ProductService";
import RoleService from "./RoleService";
import { TransactionHistoryService } from "./TransactionHistory";

interface PaymentResult {
  success: boolean;
  message?: string;
  transactionId?: string;
  paymentData?: PaymentData;
}

interface PaymentData {
  paymentId: string;
  productId: string;
  amount: number;
  fromUserId: string;
  fromRole: UserRole;
  toUserId: string;
  toRole: UserRole;
  description?: string;
  timestamp: number;
  status: PaymentStatus;
  details?: Record<string, any>;
}

export enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  CANCELED = "CANCELED"
}

export enum PaymentType {
  PRODUCT_PURCHASE = "PRODUCT_PURCHASE",
  SERVICE_FEE = "SERVICE_FEE",
  ADVANCE_PAYMENT = "ADVANCE_PAYMENT",
  PARTIAL_PAYMENT = "PARTIAL_PAYMENT",
  FINAL_PAYMENT = "FINAL_PAYMENT",
  REFUND = "REFUND"
}

/**
 * Class for managing payment transactions in the supply chain
 */
export class PaymentManagement {
  private productId: string;
  private fromUserId: string;
  private fromRole?: UserRole;

  constructor(productId: string, fromUserId: string) {
    this.productId = productId;
    this.fromUserId = fromUserId;
  }

  /**
   * Initialize the payment management with user role
   */
  async initialize(): Promise<boolean> {
    try {
      // Get the user's role
      const role = await RoleService.getUserRole(this.fromUserId);
      
      if (!role) {
        console.error(`User ${this.fromUserId} role not found`);
        return false;
      }
      
      this.fromRole = role;
      return true;
    } catch (error) {
      console.error("Error initializing PaymentManagement:", error);
      return false;
    }
  }

  /**
   * Create a payment transaction from the current user to another user
   * @param toUserId ID of the payment recipient
   * @param amount Amount to pay
   * @param paymentType Type of payment
   * @param description Payment description
   * @param details Additional payment details
   * @returns Result of the payment transaction
   */
  async createPayment(
    toUserId: string,
    amount: number,
    paymentType: PaymentType,
    description?: string,
    details?: Record<string, any>
  ): Promise<PaymentResult> {
    try {
      // Make sure the instance is initialized
      if (!this.fromRole) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            message: "Failed to initialize payment management. User role not found."
          };
        }
      }

      // At this point, we know fromRole is defined
      const fromRole = this.fromRole as UserRole;

      // Validate amount
      if (amount <= 0) {
        return {
          success: false,
          message: "Payment amount must be positive."
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

      // Get recipient's role
      const toRole = await RoleService.getUserRole(toUserId);
      if (!toRole) {
        return {
          success: false,
          message: `Recipient with ID ${toUserId} not found or role not defined.`
        };
      }

      // Validate the payment based on user roles
      const validationResult = this.validatePaymentRoles(fromRole, toRole, paymentType);
      if (!validationResult.valid) {
        return {
          success: false,
          message: validationResult.message
        };
      }

      // Generate a unique payment ID
      const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create payment data
      const paymentData: PaymentData = {
        paymentId,
        productId: this.productId,
        amount,
        fromUserId: this.fromUserId,
        fromRole,
        toUserId,
        toRole,
        description: description || `Payment for product ${this.productId}`,
        timestamp: Date.now(),
        status: PaymentStatus.COMPLETED,
        details: {
          paymentType,
          ...details
        }
      };

      // Record the payment transaction in history
      const historyResult = await TransactionHistoryService.recordPaymentTransaction(
        this.productId,
        this.fromUserId,
        fromRole,
        toUserId,
        toRole,
        amount,
        paymentType,
        paymentData
      );

      return {
        success: true,
        message: `Payment of ${amount} successfully processed from ${this.fromUserId} to ${toUserId}.`,
        transactionId: historyResult.transactionId,
        paymentData
      };
    } catch (error) {
      console.error("Error processing payment:", error);
      return {
        success: false,
        message: "Failed to process payment due to an error."
      };
    }
  }

  /**
   * Get payment history for the current product
   * @returns Array of payment transactions for the product
   */
  async getPaymentHistory(): Promise<PaymentData[]> {
    try {
      const paymentHistory = await TransactionHistoryService.getProductPaymentHistory(this.productId);
      return paymentHistory.map(record => {
        return {
          paymentId: record.id,
          productId: record.productId,
          amount: record.details?.amount || 0,
          fromUserId: record.fromUserId,
          fromRole: record.fromRole,
          toUserId: record.toUserId,
          toRole: record.toRole,
          description: record.details?.description || '',
          timestamp: record.timestamp,
          status: record.details?.status || PaymentStatus.COMPLETED,
          details: record.details
        };
      });
    } catch (error) {
      console.error("Error getting payment history:", error);
      return [];
    }
  }

  /**
   * Get total payments made for the current product
   * @returns Total amount paid for the product
   */
  async getTotalPayments(): Promise<number> {
    try {
      const paymentHistory = await this.getPaymentHistory();
      return paymentHistory.reduce((total, payment) => {
        if (payment.status === PaymentStatus.COMPLETED) {
          return total + payment.amount;
        }
        return total;
      }, 0);
    } catch (error) {
      console.error("Error calculating total payments:", error);
      return 0;
    }
  }

  /**
   * Get payments made by a specific user for the current product
   * @param userId ID of the user
   * @returns Array of payment transactions made by the user
   */
  async getUserPayments(userId: string): Promise<PaymentData[]> {
    try {
      const paymentHistory = await this.getPaymentHistory();
      return paymentHistory.filter(payment => payment.fromUserId === userId);
    } catch (error) {
      console.error("Error getting user payments:", error);
      return [];
    }
  }

  /**
   * Get payments received by a specific user for the current product
   * @param userId ID of the user
   * @returns Array of payment transactions received by the user
   */
  async getUserReceivedPayments(userId: string): Promise<PaymentData[]> {
    try {
      const paymentHistory = await this.getPaymentHistory();
      return paymentHistory.filter(payment => payment.toUserId === userId);
    } catch (error) {
      console.error("Error getting user received payments:", error);
      return [];
    }
  }

  /**
   * Validate if a payment is allowed between the given user roles
   * @param fromRole Role of the sender
   * @param toRole Role of the recipient
   * @param paymentType Type of payment
   * @returns Validation result
   */
  private validatePaymentRoles(
    fromRole: UserRole, 
    toRole: UserRole, 
    paymentType: PaymentType
  ): { valid: boolean; message?: string } {
    // Define allowed payment flows based on roles
    const allowedFlows = {
      [PaymentType.PRODUCT_PURCHASE]: [
        { from: UserRole.RETAILER, to: UserRole.TRADER },
        { from: UserRole.TRADER, to: UserRole.COLLECTOR },
        { from: UserRole.COLLECTOR, to: UserRole.FARMER },
        { from: UserRole.CONSUMER, to: UserRole.RETAILER }
      ],
      [PaymentType.SERVICE_FEE]: [
        // Any role can pay service fees to any other role
        { from: UserRole.FARMER, to: UserRole.COLLECTOR },
        { from: UserRole.FARMER, to: UserRole.TRADER },
        { from: UserRole.FARMER, to: UserRole.RETAILER },
        { from: UserRole.COLLECTOR, to: UserRole.FARMER },
        { from: UserRole.COLLECTOR, to: UserRole.TRADER },
        { from: UserRole.COLLECTOR, to: UserRole.RETAILER },
        { from: UserRole.TRADER, to: UserRole.FARMER },
        { from: UserRole.TRADER, to: UserRole.COLLECTOR },
        { from: UserRole.TRADER, to: UserRole.RETAILER },
        { from: UserRole.RETAILER, to: UserRole.FARMER },
        { from: UserRole.RETAILER, to: UserRole.COLLECTOR },
        { from: UserRole.RETAILER, to: UserRole.TRADER },
        { from: UserRole.CONSUMER, to: UserRole.RETAILER }
      ],
      [PaymentType.ADVANCE_PAYMENT]: [
        { from: UserRole.RETAILER, to: UserRole.TRADER },
        { from: UserRole.TRADER, to: UserRole.COLLECTOR },
        { from: UserRole.COLLECTOR, to: UserRole.FARMER }
      ],
      [PaymentType.PARTIAL_PAYMENT]: [
        { from: UserRole.RETAILER, to: UserRole.TRADER },
        { from: UserRole.TRADER, to: UserRole.COLLECTOR },
        { from: UserRole.COLLECTOR, to: UserRole.FARMER },
        { from: UserRole.CONSUMER, to: UserRole.RETAILER }
      ],
      [PaymentType.FINAL_PAYMENT]: [
        { from: UserRole.RETAILER, to: UserRole.TRADER },
        { from: UserRole.TRADER, to: UserRole.COLLECTOR },
        { from: UserRole.COLLECTOR, to: UserRole.FARMER },
        { from: UserRole.CONSUMER, to: UserRole.RETAILER }
      ],
      [PaymentType.REFUND]: [
        { from: UserRole.TRADER, to: UserRole.RETAILER },
        { from: UserRole.COLLECTOR, to: UserRole.TRADER },
        { from: UserRole.FARMER, to: UserRole.COLLECTOR },
        { from: UserRole.RETAILER, to: UserRole.CONSUMER }
      ]
    };

    // Check if the payment flow is allowed
    const flows = allowedFlows[paymentType] || [];
    const isAllowed = flows.some(flow => flow.from === fromRole && flow.to === toRole);

    if (!isAllowed) {
      return {
        valid: false,
        message: `Payment of type ${paymentType} from ${fromRole} to ${toRole} is not allowed.`
      };
    }

    return { valid: true };
  }
} 