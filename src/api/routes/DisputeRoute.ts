import { Router } from "express";
import { 
  createDispute, 
  getDisputeById, 
  getDisputesByProduct, 
  getDisputesByUser, 
  assignMediator, 
  resolveDispute 
} from "../controller/DisputeController";
import { authenticateJWT } from "../../middleware/auth";
import catcher from "../helper/handler";

const router = Router();

/**
 * @swagger
 * /api/disputes:
 *   post:
 *     summary: Create a new dispute
 *     tags: [Disputes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - transactionId
 *               - complainantId
 *               - respondentId
 *               - type
 *               - description
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID of the product in dispute
 *               transactionId:
 *                 type: string
 *                 description: ID of the transaction related to the dispute
 *               complainantId:
 *                 type: string
 *                 description: ID of the user filing the complaint
 *               respondentId:
 *                 type: string
 *                 description: ID of the user being complained about
 *               type:
 *                 type: string
 *                 enum: [QUALITY, QUANTITY, DELIVERY, PRICE, PAYMENT, OTHER]
 *                 description: Type of dispute
 *               description:
 *                 type: string
 *                 description: Detailed description of the dispute
 *               evidence:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of evidence (could be file paths or URLs)
 *     responses:
 *       201:
 *         description: Dispute created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 disputeId:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post("/", authenticateJWT, catcher(createDispute));

/**
 * @swagger
 * /api/disputes/{disputeId}:
 *   get:
 *     summary: Get dispute by ID
 *     tags: [Disputes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: disputeId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the dispute
 *     responses:
 *       200:
 *         description: Dispute details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 dispute:
 *                   $ref: '#/components/schemas/Dispute'
 *       404:
 *         description: Dispute not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:disputeId", authenticateJWT, catcher(getDisputeById));

/**
 * @swagger
 * /api/disputes/product/{productId}:
 *   get:
 *     summary: Get all disputes for a specific product
 *     tags: [Disputes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the product
 *     responses:
 *       200:
 *         description: List of disputes for the product
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 disputes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Dispute'
 *       401:
 *         description: Unauthorized
 */
router.get("/product/:productId", authenticateJWT, catcher(getDisputesByProduct));

/**
 * @swagger
 * /api/disputes/user/{userId}:
 *   get:
 *     summary: Get all disputes involving a specific user
 *     tags: [Disputes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the user
 *     responses:
 *       200:
 *         description: List of disputes involving the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 disputes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Dispute'
 *       401:
 *         description: Unauthorized
 */
router.get("/user/:userId", authenticateJWT, catcher(getDisputesByUser));

/**
 * @swagger
 * /api/disputes/assign-mediator:
 *   post:
 *     summary: Assign a mediator to a dispute
 *     tags: [Disputes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - disputeId
 *               - mediatorId
 *             properties:
 *               disputeId:
 *                 type: string
 *                 description: ID of the dispute
 *               mediatorId:
 *                 type: string
 *                 description: ID of the mediator user
 *     responses:
 *       200:
 *         description: Mediator assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input or unauthorized mediator
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Dispute not found
 */
router.post("/assign-mediator", authenticateJWT, catcher(assignMediator));

/**
 * @swagger
 * /api/disputes/resolve:
 *   post:
 *     summary: Resolve a dispute
 *     tags: [Disputes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - disputeId
 *               - resolverId
 *               - resolutionType
 *               - description
 *             properties:
 *               disputeId:
 *                 type: string
 *                 description: ID of the dispute
 *               resolverId:
 *                 type: string
 *                 description: ID of the user resolving the dispute
 *               resolutionType:
 *                 type: string
 *                 enum: [REFUND, REPLACEMENT, PARTIAL_REFUND, CREDIT, COMPENSATION, NO_ACTION]
 *                 description: Type of resolution
 *               description:
 *                 type: string
 *                 description: Detailed description of the resolution
 *               compensation:
 *                 type: number
 *                 description: Optional compensation amount
 *     responses:
 *       200:
 *         description: Dispute resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Dispute not found
 */
router.post("/resolve", authenticateJWT, catcher(resolveDispute));

export default router; 