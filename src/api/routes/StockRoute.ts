import express from "express";
import StockManagementController from "../controller/StockManagementController";
import { isAuthenticated } from "../../middleware/auth";

const router = express.Router();
const stockController = new StockManagementController();

/**
 * @swagger
 * /stock:
 *   get:
 *     summary: Get all stock items
 *     description: Retrieves a list of all stock items in the system
 *     tags: [Stock]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of stock items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/StockItem'
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Server error
 */
router.get("/", isAuthenticated, (req, res) => {
  // This will be implemented in a future update
  res.status(200).json({
    success: true,
    message: "Get all stocks endpoint will be implemented in future update"
  });
});

/**
 * @swagger
 * /stock/{productId}:
 *   get:
 *     summary: Get current stock for a product
 *     description: Retrieves the current stock level for a specific product
 *     tags: [Stock]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Current stock information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 productId:
 *                   type: string
 *                 stock:
 *                   type: number
 *       400:
 *         description: Invalid request
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Server error
 */
router.get("/:productId", isAuthenticated, (req, res) => stockController.getCurrentStock(req, res));

/**
 * @swagger
 * /stock/{productId}/history:
 *   get:
 *     summary: Get stock history for a product
 *     description: Retrieves the complete history of stock changes for a product
 *     tags: [Stock]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Stock history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StockHistoryItem'
 *       400:
 *         description: Invalid request
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Server error
 */
router.get("/:productId/history", isAuthenticated, (req, res) => stockController.getStockHistory(req, res));

/**
 * @swagger
 * /stock/{productId}/low-stock:
 *   get:
 *     summary: Check if product has low stock
 *     description: Checks if a product's stock is below the threshold
 *     tags: [Stock]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: integer
 *         description: Custom threshold for low stock check
 *     responses:
 *       200:
 *         description: Low stock check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 productId:
 *                   type: string
 *                 isLowStock:
 *                   type: boolean
 *                 currentStock:
 *                   type: number
 *                 threshold:
 *                   type: number
 *       400:
 *         description: Invalid request
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Server error
 */
router.get("/:productId/low-stock", isAuthenticated, (req, res) => stockController.checkLowStock(req, res));

/**
 * @swagger
 * /stock/stock-in:
 *   post:
 *     summary: Add stock to a product
 *     description: Increases the stock level for a product
 *     tags: [Stock]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID
 *               quantity:
 *                 type: number
 *                 description: Quantity to add
 *               reason:
 *                 type: string
 *                 enum: [INITIAL_STOCK, PURCHASE, RETURN, ADJUSTMENT, TRANSFER_IN]
 *                 description: Reason for stock increase
 *               details:
 *                 type: object
 *                 description: Additional details about the stock operation
 *     responses:
 *       200:
 *         description: Stock added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 currentStock:
 *                   type: number
 *                 transactionId:
 *                   type: string
 *       400:
 *         description: Invalid request - includes validation errors or insufficient permissions
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Server error
 */
router.post("/stock-in", isAuthenticated, (req, res) => stockController.stockIn(req, res));

/**
 * @swagger
 * /stock/stock-out:
 *   post:
 *     summary: Remove stock from a product
 *     description: Decreases the stock level for a product
 *     tags: [Stock]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID
 *               quantity:
 *                 type: number
 *                 description: Quantity to remove
 *               reason:
 *                 type: string
 *                 enum: [SALE, DAMAGE, LOSS, EXPIRED, TRANSFER_OUT, RECALL]
 *                 description: Reason for stock decrease
 *               details:
 *                 type: object
 *                 description: Additional details about the stock operation
 *     responses:
 *       200:
 *         description: Stock removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StockUpdateResult'
 *       400:
 *         description: Invalid request - includes validation errors, insufficient stock, or insufficient permissions
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Server error
 */
router.post("/stock-out", isAuthenticated, (req, res) => stockController.stockOut(req, res));

/**
 * @swagger
 * /stock/adjust:
 *   post:
 *     summary: Adjust product stock
 *     description: Sets the stock level for a product to a specific quantity
 *     tags: [Stock]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - newQuantity
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID
 *               newQuantity:
 *                 type: number
 *                 description: New quantity to set
 *               reason:
 *                 type: string
 *                 enum: [ADJUSTMENT, INITIAL_STOCK, INVENTORY_COUNT]
 *                 description: Reason for stock adjustment
 *               details:
 *                 type: object
 *                 description: Additional details about the adjustment
 *     responses:
 *       200:
 *         description: Stock adjusted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StockUpdateResult'
 *       400:
 *         description: Invalid request - includes validation errors or insufficient permissions
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /stock/transfer:
 *   post:
 *     summary: Transfer stock between users
 *     description: Transfers ownership of stock from one user to another
 *     tags: [Stock]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - toUserId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID
 *               toUserId:
 *                 type: string
 *                 description: User ID to transfer to
 *               quantity:
 *                 type: number
 *                 description: Quantity to transfer
 *               reason:
 *                 type: string
 *                 enum: [TRANSFER_OUT]
 *                 description: Reason for stock transfer
 *               details:
 *                 type: object
 *                 description: Additional details about the transfer
 *     responses:
 *       200:
 *         description: Stock transferred successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Stock transferred successfully
 *                 transactionId:
 *                   type: string
 *       400:
 *         description: Invalid request - includes validation errors, insufficient stock, or unauthorized transfer
 *       401:
 *         description: User not authenticated
 *       500:
 *         description: Server error
 */
router.post("/transfer", isAuthenticated, (req, res) => stockController.transferStock(req, res));

/**
 * @swagger
 * components:
 *   schemas:
 *     StockItem:
 *       type: object
 *       properties:
 *         productId:
 *           type: string
 *           description: Reference to the associated product
 *         currentStock:
 *           type: number
 *           description: Current quantity in stock
 *         ownerId:
 *           type: string
 *           description: Current owner of the stock
 *         userRole:
 *           type: string
 *           enum: [FARMER, COLLECTOR, TRADER, RETAILER, CONSUMER, ADMIN, PRODUCER, INSPECTOR, MEDIATOR]
 *           description: Role of the stock owner
 *         lastUpdated:
 *           type: integer
 *           format: int64
 *           description: Last update timestamp
 *     StockUpdateResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Whether the operation was successful
 *         message:
 *           type: string
 *           description: Result message
 *         transactionId:
 *           type: string
 *           description: ID of the recorded transaction
 *         currentStock:
 *           type: number
 *           description: Current stock level after operation
 *     StockHistoryItem:
 *       type: object
 *       properties:
 *         productId:
 *           type: string
 *           description: ID of the product
 *         userId:
 *           type: string
 *           description: ID of the user who performed the operation
 *         userRole:
 *           type: string
 *           enum: [FARMER, COLLECTOR, TRADER, RETAILER, CONSUMER, ADMIN, PRODUCER, INSPECTOR, MEDIATOR]
 *           description: Role of the user
 *         quantity:
 *           type: number
 *           description: Stock quantity after the operation
 *         action:
 *           type: string
 *           enum: [STOCK_IN, STOCK_OUT, STOCK_ADJUST]
 *           description: Type of stock operation
 *         reason:
 *           type: string
 *           enum: [INITIAL_STOCK, PURCHASE, SALE, TRANSFER_IN, TRANSFER_OUT, DAMAGE, LOSS, RETURN, ADJUSTMENT, EXPIRED, RECALL]
 *           description: Reason for the stock change
 *         details:
 *           type: object
 *           description: Additional details about the transaction
 *         timestamp:
 *           type: integer
 *           format: int64
 *           description: When the change occurred
 */

export default router;