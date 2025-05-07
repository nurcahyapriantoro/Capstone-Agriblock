import express from "express";
import { validateUserAction, validateTransaction, getUserRole } from "../controller/RoleController";

const router = express.Router();

/**
 * @swagger
 * /role/{userId}:
 *   get:
 *     summary: Get a user's role
 *     description: Retrieves the role of a user by their ID
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user
 *     responses:
 *       200:
 *         description: User role retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [FARMER, COLLECTOR, TRADER, RETAILER, CONSUMER, ADMIN, PRODUCER, INSPECTOR, MEDIATOR]
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get("/:userId", getUserRole);

/**
 * @swagger
 * /role/validate-action:
 *   post:
 *     summary: Validate if a user can perform an action
 *     description: Checks if a user has the required role/permission to perform a specific action
 *     tags: [Roles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - action
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user attempting the action
 *               action:
 *                 type: string
 *                 description: The action being attempted
 *                 enum: [CREATE_PRODUCT, EDIT_PRODUCT, DELETE_PRODUCT, TRANSFER_OWNERSHIP, VERIFY_PRODUCT, CREATE_TRANSACTION, APPROVE_TRANSACTION, CANCEL_TRANSACTION, MANAGE_USERS]
 *               resourceId:
 *                 type: string
 *                 description: ID of the resource being acted upon (optional)
 *     responses:
 *       200:
 *         description: Action validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 isAllowed:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post("/validate-action", validateUserAction);

/**
 * @swagger
 * /role/validate-transaction:
 *   post:
 *     summary: Validate a transaction between users
 *     description: Validates if a transaction between two users with different roles is allowed
 *     tags: [Roles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromUserId
 *               - toUserId
 *               - transactionType
 *             properties:
 *               fromUserId:
 *                 type: string
 *                 description: ID of the user initiating the transaction
 *               toUserId:
 *                 type: string
 *                 description: ID of the user receiving the transaction
 *               transactionType:
 *                 type: string
 *                 description: Type of transaction
 *                 enum: [PRODUCT_SALE, PRODUCT_TRANSFER, PAYMENT, SERVICE]
 *               productId:
 *                 type: string
 *                 description: ID of the product being transacted (if applicable)
 *     responses:
 *       200:
 *         description: Transaction validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 isAllowed:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 requiredApprovals:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of roles required to approve this transaction (if applicable)
 *       400:
 *         description: Invalid request
 *       404:
 *         description: One or both users not found
 *       500:
 *         description: Server error
 */
router.post("/validate-transaction", validateTransaction);

/**
 * @swagger
 * components:
 *   schemas:
 *     Role:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique role ID
 *         name:
 *           type: string
 *           enum: [FARMER, COLLECTOR, TRADER, RETAILER, CONSUMER, ADMIN, PRODUCER, INSPECTOR, MEDIATOR]
 *           description: Role name
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 *           description: List of permissions associated with this role
 *         description:
 *           type: string
 *           description: Description of the role
 *         level:
 *           type: integer
 *           description: Hierarchy level of the role (used for determining access)
 */

export default router; 