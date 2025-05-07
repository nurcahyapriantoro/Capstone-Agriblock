import express from "express";
import { Request, Response } from "express";
import { isAuthenticated } from "../../middleware/auth";
import PaymentManagementController from "../controller/PaymentManagementController";
import { validateUserRoles } from "../../middleware/roleValidator";
import { UserRole } from "../../enum";
import { PaymentType, PaymentStatus } from "../../core/PaymentManagement";

const router = express.Router();

/**
 * @swagger
 * /payment/create:
 *   post:
 *     summary: Create a new payment
 *     description: Creates a new payment for a product purchase
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toUserId
 *               - productId
 *               - amount
 *               - paymentType
 *             properties:
 *               toUserId:
 *                 type: string
 *                 description: ID of the payment recipient
 *               productId:
 *                 type: string
 *                 description: ID of the product being paid for
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               paymentType:
 *                 type: string
 *                 enum: [PRODUCT_PURCHASE, SERVICE_FEE, ADVANCE_PAYMENT, PARTIAL_PAYMENT, FINAL_PAYMENT]
 *                 description: Type of payment 
 *               description:
 *                 type: string
 *                 description: Payment description or notes
 *               details:
 *                 type: object
 *                 description: Additional payment details
 *     responses:
 *       201:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post("/create", 
  isAuthenticated, 
  validateUserRoles([UserRole.FARMER, UserRole.COLLECTOR, UserRole.TRADER, UserRole.RETAILER, UserRole.CONSUMER]),
  PaymentManagementController.createPayment
);

/**
 * @swagger
 * /payment/{productId}/history:
 *   get:
 *     summary: Get payment history for a product
 *     description: Retrieves the complete payment history for a specific product
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the product
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 productId:
 *                   type: string
 *                 history:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *       404:
 *         description: Product not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/:productId/history", 
  isAuthenticated,
  validateUserRoles([UserRole.FARMER, UserRole.COLLECTOR, UserRole.TRADER, UserRole.RETAILER]),
  PaymentManagementController.getPaymentHistory
);

/**
 * @swagger
 * /payment/{productId}/total:
 *   get:
 *     summary: Get total payments for a product
 *     description: Retrieves the total amount of payments for a specific product
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the product
 *     responses:
 *       200:
 *         description: Total payments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 productId:
 *                   type: string
 *                 totalAmount:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/:productId/total", 
  isAuthenticated,
  validateUserRoles([UserRole.FARMER, UserRole.COLLECTOR, UserRole.TRADER, UserRole.RETAILER]),
  PaymentManagementController.getTotalPayments
);

/**
 * @swagger
 * /payment/{productId}/sent:
 *   get:
 *     summary: Get payments made by the user for a product
 *     description: Retrieves all payments made by the authenticated user for a specific product
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the product
 *     responses:
 *       200:
 *         description: User payments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 productId:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 payments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/:productId/sent",
  isAuthenticated,
  validateUserRoles([UserRole.FARMER, UserRole.COLLECTOR, UserRole.TRADER, UserRole.RETAILER, UserRole.CONSUMER]),
  PaymentManagementController.getUserPayments
);

/**
 * @swagger
 * /payment/{productId}/received:
 *   get:
 *     summary: Get payments received by the user for a product
 *     description: Retrieves all payments received by the authenticated user for a specific product
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the product
 *     responses:
 *       200:
 *         description: User received payments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 productId:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 payments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/:productId/received",
  isAuthenticated,
  validateUserRoles([UserRole.FARMER, UserRole.COLLECTOR, UserRole.TRADER, UserRole.RETAILER]),
  PaymentManagementController.getUserReceivedPayments
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         paymentId:
 *           type: string
 *           description: Unique payment ID
 *         transactionId:
 *           type: string
 *           description: Associated blockchain transaction ID (if applicable)
 *         fromUserId:
 *           type: string
 *           description: User making the payment
 *         fromRole:
 *           type: string
 *           enum: [FARMER, COLLECTOR, TRADER, RETAILER, CONSUMER]
 *           description: Role of the user making the payment
 *         toUserId:
 *           type: string
 *           description: User receiving the payment
 *         toRole:
 *           type: string
 *           enum: [FARMER, COLLECTOR, TRADER, RETAILER, CONSUMER]
 *           description: Role of the user receiving the payment
 *         productId:
 *           type: string
 *           description: Product being purchased (if applicable)
 *         amount:
 *           type: number
 *           description: Payment amount
 *         status:
 *           type: string
 *           enum: [PENDING, COMPLETED, FAILED, REFUNDED, CANCELED]
 *           description: Current payment status
 *         paymentType: 
 *           type: string
 *           enum: [PRODUCT_PURCHASE, SERVICE_FEE, ADVANCE_PAYMENT, PARTIAL_PAYMENT, FINAL_PAYMENT, REFUND]
 *           description: Type of payment
 *         description:
 *           type: string
 *           description: Payment description
 *         timestamp:
 *           type: number
 *           description: Timestamp of the payment
 *         details:
 *           type: object
 *           description: Additional payment details
 */

export default router;