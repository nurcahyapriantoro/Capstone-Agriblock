import express from "express";
import { 
  createProduct, 
  getProduct, 
  getProductsByOwner, 
  transferOwnership 
} from "../controller/ProductController";

const router = express.Router();

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - ownerId
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 description: Product name
 *               ownerId:
 *                 type: string
 *                 description: ID of the product owner (usually a farmer ID)
 *               category:
 *                 type: string
 *                 description: Product category
 *               initialQuantity:
 *                 type: number
 *                 description: Initial product quantity
 *               unit:
 *                 type: string
 *                 description: Unit of measurement (kg, ton, etc.)
 *               price:
 *                 type: number
 *                 description: Product price
 *               locationGrown:
 *                 type: string
 *                 description: Location where the product was grown
 *               harvestDate:
 *                 type: string
 *                 format: date
 *                 description: Date of harvest
 *               certifications:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of certifications
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post("/", createProduct);

/**
 * @swagger
 * /api/products/{productId}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the product
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 ownerId:
 *                   type: string
 *                 category:
 *                   type: string
 *                 createdAt:
 *                   type: number
 *       404:
 *         description: Product not found
 */
router.get("/:productId", getProduct);

/**
 * @swagger
 * /api/products/owner/{ownerId}:
 *   get:
 *     summary: Get all products owned by a specific user
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: ownerId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the owner
 *     responses:
 *       200:
 *         description: List of products
 *       404:
 *         description: No products found or owner doesn't exist
 */
router.get("/owner/:ownerId", getProductsByOwner);

/**
 * @swagger
 * /api/products/transfer:
 *   post:
 *     summary: Transfer product ownership
 *     tags: [Products]
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
 *               - fromUserId
 *               - toUserId
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID of the product to transfer
 *               fromUserId:
 *                 type: string
 *                 description: Current owner ID
 *               toUserId:
 *                 type: string
 *                 description: New owner ID
 *     responses:
 *       200:
 *         description: Ownership transferred successfully
 *       400:
 *         description: Invalid transfer request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the current owner
 */
router.post("/transfer", transferOwnership);

export default router; 