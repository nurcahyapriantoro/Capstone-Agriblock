import express from 'express';
import StockManagementController from '../controllers/StockManagementController';
import { authenticateJWT } from '../../middleware/auth';
import { container } from 'tsyringe';

const router = express.Router();
const stockController = container.resolve(StockManagementController);

/**
 * @route   POST /api/stock/in
 * @desc    Add stock for a product
 * @access  Private
 */
router.post('/in', authenticateJWT, stockController.stockIn.bind(stockController));

/**
 * @route   POST /api/stock/out
 * @desc    Remove stock for a product
 * @access  Private
 */
router.post('/out', authenticateJWT, stockController.stockOut.bind(stockController));

/**
 * @route   POST /api/stock/adjust
 * @desc    Adjust stock to a specific value
 * @access  Private
 */
router.post('/adjust', authenticateJWT, stockController.adjustStock.bind(stockController));

/**
 * @route   POST /api/stock/transfer
 * @desc    Transfer stock from one user to another
 * @access  Private
 */
router.post('/transfer', authenticateJWT, stockController.transferStock.bind(stockController));

/**
 * @route   GET /api/stock/:productId
 * @desc    Get current stock for a product
 * @access  Private
 */
router.get('/:productId', authenticateJWT, stockController.getCurrentStock.bind(stockController));

/**
 * @route   GET /api/stock/:productId/history
 * @desc    Get stock history for a product
 * @access  Private
 */
router.get('/:productId/history', authenticateJWT, stockController.getStockHistory.bind(stockController));

/**
 * @route   GET /api/stock/:productId/lowstock
 * @desc    Check if stock is below threshold
 * @access  Private
 */
router.get('/:productId/lowstock', authenticateJWT, stockController.checkLowStock.bind(stockController));

export default router; 