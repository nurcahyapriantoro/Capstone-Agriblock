import { Request, Response } from 'express';
import { PaymentManagement, PaymentType, PaymentStatus } from '../../core/PaymentManagement';

/**
 * Controller for managing payment transactions
 */
export default class PaymentManagementController {
  /**
   * Create a new payment transaction
   */
  static async createPayment(req: Request, res: Response) {
    try {
      const { productId, toUserId, amount, paymentType, description, details } = req.body;
      const fromUserId = req.user?.id;

      if (!fromUserId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required"
        });
      }

      if (!productId || !toUserId || !amount || !paymentType) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: productId, toUserId, amount, and paymentType are required"
        });
      }

      // Validate amount
      if (isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be a positive number"
        });
      }

      // Validate payment type
      if (!Object.values(PaymentType).includes(paymentType as PaymentType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment type"
        });
      }

      // Initialize payment management
      const paymentManager = new PaymentManagement(productId, fromUserId);
      const initialized = await paymentManager.initialize();

      if (!initialized) {
        return res.status(500).json({
          success: false,
          message: "Failed to initialize payment management"
        });
      }

      // Create payment
      const result = await paymentManager.createPayment(
        toUserId,
        Number(amount),
        paymentType as PaymentType,
        description,
        details
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in createPayment controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  /**
   * Get payment history for a product
   */
  static async getPaymentHistory(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required"
        });
      }

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required"
        });
      }

      // Initialize payment management
      const paymentManager = new PaymentManagement(productId, userId);
      
      // Get payment history
      const history = await paymentManager.getPaymentHistory();

      return res.status(200).json({
        success: true,
        productId,
        history
      });
    } catch (error) {
      console.error("Error in getPaymentHistory controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  /**
   * Get total payments for a product
   */
  static async getTotalPayments(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required"
        });
      }

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required"
        });
      }

      // Initialize payment management
      const paymentManager = new PaymentManagement(productId, userId);
      
      // Get total payments
      const totalAmount = await paymentManager.getTotalPayments();

      return res.status(200).json({
        success: true,
        productId,
        totalAmount
      });
    } catch (error) {
      console.error("Error in getTotalPayments controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  /**
   * Get payments made by a user for a product
   */
  static async getUserPayments(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required"
        });
      }

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required"
        });
      }

      // Initialize payment management
      const paymentManager = new PaymentManagement(productId, userId);
      
      // Get user payments
      const payments = await paymentManager.getUserPayments(userId);

      return res.status(200).json({
        success: true,
        productId,
        userId,
        payments
      });
    } catch (error) {
      console.error("Error in getUserPayments controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  /**
   * Get payments received by a user for a product
   */
  static async getUserReceivedPayments(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required"
        });
      }

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required"
        });
      }

      // Initialize payment management
      const paymentManager = new PaymentManagement(productId, userId);
      
      // Get user received payments
      const payments = await paymentManager.getUserReceivedPayments(userId);

      return res.status(200).json({
        success: true,
        productId,
        userId,
        payments
      });
    } catch (error) {
      console.error("Error in getUserReceivedPayments controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
} 