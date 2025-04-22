import { Router } from 'express';
import PaymentManagementController from '../controller/PaymentManagementController';
import { isAuthenticated } from '../../middleware/auth';
import { validateUserRoles } from '../../middleware/roleValidator';
import { UserRole } from '../../enum';

const router = Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Create payment endpoint
router.post(
  '/create',
  validateUserRoles([UserRole.FARMER, UserRole.COLLECTOR, UserRole.TRADER, UserRole.RETAILER, UserRole.CONSUMER]), 
  PaymentManagementController.createPayment
);

// Get payment history for a product
router.get(
  '/:productId/history',
  validateUserRoles([UserRole.FARMER, UserRole.COLLECTOR, UserRole.TRADER, UserRole.RETAILER]),
  PaymentManagementController.getPaymentHistory
);

// Get total payments for a product
router.get(
  '/:productId/total',
  validateUserRoles([UserRole.FARMER, UserRole.COLLECTOR, UserRole.TRADER, UserRole.RETAILER]),
  PaymentManagementController.getTotalPayments
);

// Get payments made by the authenticated user for a product
router.get(
  '/:productId/sent',
  validateUserRoles([UserRole.FARMER, UserRole.COLLECTOR, UserRole.TRADER, UserRole.RETAILER, UserRole.CONSUMER]),
  PaymentManagementController.getUserPayments
);

// Get payments received by the authenticated user for a product
router.get(
  '/:productId/received',
  validateUserRoles([UserRole.FARMER, UserRole.COLLECTOR, UserRole.TRADER, UserRole.RETAILER]),
  PaymentManagementController.getUserReceivedPayments
);

export default router; 