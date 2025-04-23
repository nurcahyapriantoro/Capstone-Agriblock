import { Request, Response } from 'express';
import { container, injectable, inject } from 'tsyringe';
import StockManagement from '../../core/StockManagement';
import { StockChangeReason, UserRole } from '../../enum';
import { isAuthenticated } from '../../middleware/auth';
import RoleService from '../../core/RoleService';

// Register StockManagement service in the container
container.register<StockManagement>("StockManagement", {
  useClass: StockManagement
});

@injectable()
class StockManagementController {
  private stockManagementInstances: Map<string, StockManagement> = new Map();

  /**
   * Handle stock-in operations
   */
  async stockIn(req: Request, res: Response): Promise<void> {
    try {
      const { productId, quantity, reason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      if (!productId || !quantity || quantity <= 0) {
        res.status(400).json({ message: 'Invalid product or quantity' });
        return;
      }

      // Create or get StockManagement instance for this product
      const stockManager = new StockManagement(productId, userId);
      await stockManager.initialize();

      const result = await stockManager.stockIn(
        quantity,
        reason || StockChangeReason.PURCHASE
      );

      if (!result.success) {
        res.status(400).json({ message: result.message });
        return;
      }

      res.status(200).json({ 
        message: 'Stock added successfully',
        currentStock: result.currentStock,
        transactionId: result.transactionId
      });
    } catch (error: any) {
      console.error('Error in stockIn controller:', error);
      res.status(500).json({ message: error.message || 'Error processing stock-in' });
    }
  }

  /**
   * Handle stock-out operations
   */
  async stockOut(req: Request, res: Response): Promise<void> {
    try {
      const { productId, quantity, reason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      if (!productId || !quantity || quantity <= 0) {
        res.status(400).json({ message: 'Invalid product or quantity' });
        return;
      }

      // Create or get StockManagement instance for this product
      const stockManager = new StockManagement(productId, userId);
      await stockManager.initialize();

      const result = await stockManager.stockOut(
        quantity,
        reason || StockChangeReason.SALE
      );

      if (!result.success) {
        res.status(400).json({ message: result.message });
        return;
      }

      res.status(200).json({ 
        message: 'Stock removed successfully',
        currentStock: result.currentStock,
        transactionId: result.transactionId
      });
    } catch (error: any) {
      console.error('Error in stockOut controller:', error);
      res.status(500).json({ message: error.message || 'Error processing stock-out' });
    }
  }

  /**
   * Handle stock adjustment operations
   */
  async adjustStock(req: Request, res: Response): Promise<void> {
    try {
      const { productId, newQuantity, reason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      if (!productId || newQuantity === undefined || newQuantity < 0) {
        res.status(400).json({ message: 'Invalid product or quantity' });
        return;
      }

      // Create or get StockManagement instance for this product
      const stockManager = new StockManagement(productId, userId);
      await stockManager.initialize();

      const result = await stockManager.adjustStock(
        newQuantity,
        reason || StockChangeReason.ADJUSTMENT
      );

      if (!result.success) {
        res.status(400).json({ message: result.message });
        return;
      }

      res.status(200).json({ 
        message: 'Stock adjusted successfully',
        currentStock: result.currentStock,
        transactionId: result.transactionId
      });
    } catch (error: any) {
      console.error('Error in adjustStock controller:', error);
      res.status(500).json({ message: error.message || 'Error adjusting stock' });
    }
  }

  /**
   * Handle stock transfer operations
   */
  async transferStock(req: Request, res: Response): Promise<void> {
    try {
      const { productId, toUserId, quantity, reason } = req.body;
      const fromUserId = req.user?.id;

      if (!fromUserId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      if (!productId || !toUserId || !quantity || quantity <= 0) {
        res.status(400).json({ message: 'Invalid transfer parameters' });
        return;
      }

      if (fromUserId === toUserId) {
        res.status(400).json({ message: 'Cannot transfer to yourself' });
        return;
      }

      // Get user roles
      const fromRole = await RoleService.getUserRole(fromUserId);
      const toRole = await RoleService.getUserRole(toUserId);
      
      if (!fromRole || !toRole) {
        res.status(400).json({ message: 'User role not found' });
        return;
      }

      const result = await StockManagement.transferStock(
        productId,
        fromUserId,
        fromRole as UserRole,
        toUserId,
        toRole as UserRole,
        quantity,
        { reason: reason || StockChangeReason.TRANSFER_OUT }
      );

      if (!result.success) {
        res.status(400).json({ message: result.message });
        return;
      }

      res.status(200).json({ 
        message: 'Stock transferred successfully',
        transactionId: result.transactionId
      });
    } catch (error: any) {
      console.error('Error in transferStock controller:', error);
      res.status(500).json({ message: error.message || 'Error transferring stock' });
    }
  }

  /**
   * Get current stock for a product
   */
  async getCurrentStock(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const userId = req.user?.id || '';

      if (!productId) {
        res.status(400).json({ message: 'Product ID is required' });
        return;
      }
      
      const stockManager = new StockManagement(productId, userId);
      const stock = await stockManager.getCurrentStock();
      
      res.status(200).json({ productId, stock });
    } catch (error: any) {
      console.error('Error getting current stock:', error);
      res.status(500).json({ message: error.message || 'Error retrieving stock information' });
    }
  }

  /**
   * Get stock history for a product
   */
  async getStockHistory(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const userId = req.user?.id || '';

      if (!productId) {
        res.status(400).json({ message: 'Product ID is required' });
        return;
      }

      const stockManager = new StockManagement(productId, userId);
      const history = await stockManager.getStockHistory();
      
      res.status(200).json(history);
    } catch (error: any) {
      console.error('Error getting stock history:', error);
      res.status(500).json({ message: error.message || 'Error retrieving stock history' });
    }
  }

  /**
   * Check if product has low stock
   */
  async checkLowStock(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const { threshold } = req.query;
      const userId = req.user?.id || '';

      if (!productId) {
        res.status(400).json({ message: 'Product ID is required' });
        return;
      }

      const stockManager = new StockManagement(productId, userId);
      
      // Set custom threshold if provided
      if (threshold && !isNaN(Number(threshold))) {
        stockManager.setLowStockThreshold(Number(threshold));
      }

      const isLowStock = await stockManager.isLowStock();
      const currentStock = await stockManager.getCurrentStock();
      
      res.status(200).json({ 
        productId, 
        isLowStock, 
        currentStock,
        threshold: threshold ? Number(threshold) : undefined
      });
    } catch (error: any) {
      console.error('Error checking low stock:', error);
      res.status(500).json({ message: error.message || 'Error checking stock levels' });
    }
  }
}

export default StockManagementController; 