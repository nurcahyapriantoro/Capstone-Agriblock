import { Request, Response } from 'express';
import { container, injectable, inject } from 'tsyringe';
import StockManagement from '../../service/StockManagement';

// Register StockManagement service in the container
container.register<StockManagement>("StockManagement", {
  useClass: StockManagement
});

@injectable()
class StockManagementController {
  private stockManagement: StockManagement;

  constructor(@inject("StockManagement") stockManagement: StockManagement) {
    this.stockManagement = stockManagement;
  }

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

      await this.stockManagement.stockIn(
        userId,
        productId,
        quantity,
        reason || 'Regular stock-in'
      );

      res.status(200).json({ message: 'Stock added successfully' });
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

      await this.stockManagement.stockOut(
        userId,
        productId,
        quantity,
        reason || 'Regular stock-out'
      );

      res.status(200).json({ message: 'Stock removed successfully' });
    } catch (error: any) {
      console.error('Error in stockOut controller:', error);
      
      if (error.message === 'Insufficient stock') {
        res.status(400).json({ message: error.message });
        return;
      }
      
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

      await this.stockManagement.adjustStock(
        userId,
        productId,
        newQuantity,
        reason || 'Stock adjustment'
      );

      res.status(200).json({ message: 'Stock adjusted successfully' });
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

      await this.stockManagement.transferStock(
        fromUserId,
        toUserId,
        productId,
        quantity,
        reason || 'Stock transfer'
      );

      res.status(200).json({ message: 'Stock transferred successfully' });
    } catch (error: any) {
      console.error('Error in transferStock controller:', error);
      
      if (error.message === 'Insufficient stock for transfer') {
        res.status(400).json({ message: error.message });
        return;
      }
      
      res.status(500).json({ message: error.message || 'Error transferring stock' });
    }
  }

  /**
   * Get current stock for a product
   */
  async getCurrentStock(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;

      if (!productId) {
        res.status(400).json({ message: 'Product ID is required' });
        return;
      }

      const stock = await this.stockManagement.getCurrentStock(productId);
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

      if (!productId) {
        res.status(400).json({ message: 'Product ID is required' });
        return;
      }

      const history = await this.stockManagement.getStockHistory(productId);
      res.status(200).json(history);
    } catch (error: any) {
      console.error('Error getting stock history:', error);
      res.status(500).json({ message: error.message || 'Error retrieving stock history' });
    }
  }

  /**
   * Check if stock is below threshold
   */
  async checkLowStock(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const { threshold = 10 } = req.query;

      if (!productId) {
        res.status(400).json({ message: 'Product ID is required' });
        return;
      }

      const thresholdValue = parseInt(threshold as string) || 10;
      const isLowStock = await this.stockManagement.checkLowStock(productId, thresholdValue);
      
      const currentStock = await this.stockManagement.getCurrentStock(productId);
      
      res.status(200).json({ 
        productId, 
        isLowStock, 
        currentStock,
        threshold: thresholdValue
      });
    } catch (error: any) {
      console.error('Error checking low stock:', error);
      res.status(500).json({ message: error.message || 'Error checking stock level' });
    }
  }
}

export default StockManagementController; 