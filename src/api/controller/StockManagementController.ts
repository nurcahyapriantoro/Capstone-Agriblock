import { Request, Response } from 'express';
import StockManagement from '../../core/StockManagement';
import { StockChangeReason, UserRole } from '../../enum';
import { isAuthenticated } from '../../middleware/auth';
import RoleService from '../../core/RoleService';

/**
 * Controller for managing product stock operations
 */
export default class StockManagementController {
  /**
   * Increase stock quantity (stock-in)
   */
  static async stockIn(req: Request, res: Response) {
    try {
      const { productId, quantity, reason, details } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required"
        });
      }

      if (!productId || !quantity || !reason) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: productId, quantity, and reason are required"
        });
      }

      // Validate quantity
      if (isNaN(Number(quantity)) || Number(quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be a positive number"
        });
      }

      // Validate reason
      if (!Object.values(StockChangeReason).includes(reason as StockChangeReason)) {
        return res.status(400).json({
          success: false,
          message: "Invalid stock change reason"
        });
      }

      // Initialize stock management
      const stockManager = new StockManagement(productId, userId);
      const initialized = await stockManager.initialize();

      if (!initialized) {
        return res.status(500).json({
          success: false,
          message: "Failed to initialize stock management"
        });
      }

      // Perform stock in operation
      const result = await stockManager.stockIn(
        Number(quantity),
        reason as StockChangeReason,
        details
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in stockIn controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  /**
   * Decrease stock quantity (stock-out)
   */
  static async stockOut(req: Request, res: Response) {
    try {
      const { productId, quantity, reason, details } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required"
        });
      }

      if (!productId || !quantity || !reason) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: productId, quantity, and reason are required"
        });
      }

      // Validate quantity
      if (isNaN(Number(quantity)) || Number(quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be a positive number"
        });
      }

      // Validate reason
      if (!Object.values(StockChangeReason).includes(reason as StockChangeReason)) {
        return res.status(400).json({
          success: false,
          message: "Invalid stock change reason"
        });
      }

      // Initialize stock management
      const stockManager = new StockManagement(productId, userId);
      const initialized = await stockManager.initialize();

      if (!initialized) {
        return res.status(500).json({
          success: false,
          message: "Failed to initialize stock management"
        });
      }

      // Perform stock out operation
      const result = await stockManager.stockOut(
        Number(quantity),
        reason as StockChangeReason,
        details
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in stockOut controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  /**
   * Adjust stock to specific quantity
   */
  static async adjustStock(req: Request, res: Response) {
    try {
      const { productId, newQuantity, reason, details } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required"
        });
      }

      if (!productId || newQuantity === undefined || !reason) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: productId, newQuantity, and reason are required"
        });
      }

      // Validate quantity
      if (isNaN(Number(newQuantity)) || Number(newQuantity) < 0) {
        return res.status(400).json({
          success: false,
          message: "New quantity must be a non-negative number"
        });
      }

      // Validate reason
      if (!Object.values(StockChangeReason).includes(reason as StockChangeReason)) {
        return res.status(400).json({
          success: false,
          message: "Invalid stock change reason"
        });
      }

      // Initialize stock management
      const stockManager = new StockManagement(productId, userId);
      const initialized = await stockManager.initialize();

      if (!initialized) {
        return res.status(500).json({
          success: false,
          message: "Failed to initialize stock management"
        });
      }

      // Perform stock adjustment operation
      const result = await stockManager.adjustStock(
        Number(newQuantity),
        reason as StockChangeReason,
        details
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in adjustStock controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  /**
   * Transfer stock between users
   */
  static async transferStock(req: Request, res: Response) {
    try {
      const { productId, toUserId, quantity, details } = req.body;
      const fromUserId = req.user?.id;

      if (!fromUserId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required"
        });
      }

      if (!productId || !toUserId || !quantity) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: productId, toUserId, and quantity are required"
        });
      }

      // Validate quantity
      if (isNaN(Number(quantity)) || Number(quantity) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be a positive number"
        });
      }

      // Get from user role
      const fromRole = await RoleService.getUserRole(fromUserId);
      if (!fromRole) {
        return res.status(400).json({
          success: false,
          message: "Sender role not found"
        });
      }

      // Get to user role
      const toRole = await RoleService.getUserRole(toUserId);
      if (!toRole) {
        return res.status(400).json({
          success: false,
          message: "Recipient role not found"
        });
      }

      // Perform stock transfer
      const result = await StockManagement.transferStock(
        productId,
        fromUserId,
        fromRole,
        toUserId,
        toRole,
        Number(quantity),
        details
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in transferStock controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  /**
   * Get current stock level
   */
  static async getCurrentStock(req: Request, res: Response) {
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

      // Initialize stock management
      const stockManager = new StockManagement(productId, userId);
      
      // Get current stock
      const currentStock = await stockManager.getCurrentStock();

      return res.status(200).json({
        success: true,
        productId,
        currentStock
      });
    } catch (error) {
      console.error("Error in getCurrentStock controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  /**
   * Get stock transaction history
   */
  static async getStockHistory(req: Request, res: Response) {
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

      // Initialize stock management
      const stockManager = new StockManagement(productId, userId);
      
      // Get stock history
      const history = await stockManager.getStockHistory();

      return res.status(200).json({
        success: true,
        productId,
        history
      });
    } catch (error) {
      console.error("Error in getStockHistory controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  /**
   * Check if product has low stock
   */
  static async checkLowStock(req: Request, res: Response) {
    try {
      const { productId } = req.params;
      const { threshold } = req.query;
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

      // Initialize stock management
      const stockManager = new StockManagement(productId, userId);
      
      // Set custom threshold if provided
      if (threshold && !isNaN(Number(threshold))) {
        stockManager.setLowStockThreshold(Number(threshold));
      }

      // Check if stock is low
      const isLowStock = await stockManager.isLowStock();
      const currentStock = await stockManager.getCurrentStock();

      return res.status(200).json({
        success: true,
        productId,
        currentStock,
        isLowStock
      });
    } catch (error) {
      console.error("Error in checkLowStock controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
} 