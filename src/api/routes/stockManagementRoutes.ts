import { Router } from 'express';
import StockManagementController from '../controller/StockManagementController';
import { isAuthenticated } from '../../middleware/auth';
import { validateUserRoles } from '../../middleware/roleValidator';
import { UserRole } from '../../enum';

const router = Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Stock-in endpoint
router.post(
  '/stock-in',
  validateUserRoles([UserRole.FARMER, UserRole.COLLECTOR, UserRole.TRADER, UserRole.RETAILER]), 
  StockManagementController.stockIn
);

// Stock-out endpoint
router.post(
  '/stock-out',
  validateUserRoles([UserRole.FARMER, UserRole.COLLECTOR, UserRole.TRADER, UserRole.RETAILER]),
  StockManagementController.stockOut
);

// Adjust stock endpoint
router.post(
  '/adjust',
  validateUserRoles([UserRole.FARMER, UserRole.COLLECTOR, UserRole.TRADER, UserRole.RETAILER]),
  StockManagementController.adjustStock
);

// Transfer stock endpoint
router.post(
  '/transfer',
  validateUserRoles([UserRole.FARMER, UserRole.COLLECTOR, UserRole.TRADER, UserRole.RETAILER]),
  StockManagementController.transferStock
);

// Get current stock level
router.get(
  '/:productId',
  validateUserRoles([UserRole.FARMER, UserRole.COLLECTOR, UserRole.TRADER, UserRole.RETAILER, UserRole.CONSUMER]),
  StockManagementController.getCurrentStock
);

// Get stock history
router.get(
  '/:productId/history',
  validateUserRoles([UserRole.FARMER, UserRole.COLLECTOR, UserRole.TRADER, UserRole.RETAILER]),
  StockManagementController.getStockHistory
);

// Check low stock
router.get(
  '/:productId/low-stock',
  validateUserRoles([UserRole.FARMER, UserRole.COLLECTOR, UserRole.TRADER, UserRole.RETAILER]),
  StockManagementController.checkLowStock
);

export default router; 