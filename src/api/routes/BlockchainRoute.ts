import express from "express";
import { Request, Response } from "express";

import catcher from "../helper/handler"
import {
  getLastBlock,
  getBlockchainState,
} from "../controller/BlockchainController"

const router = express.Router();

/**
 * @swagger
 * /blockchain/status:
 *   get:
 *     summary: Get blockchain status
 *     description: Retrieves current status of the blockchain network
 *     tags: [Blockchain]
 *     responses:
 *       200:
 *         description: Blockchain status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BlockchainStatus'
 *       500:
 *         description: Server error
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    // Mock data - in a real implementation this would be obtained from the blockchain service
    const blockchainStatus = {
      networkName: "AgriChain Mainnet",
      currentHeight: 12458,
      totalTransactions: 53240,
      lastBlockTime: new Date().toISOString(),
      averageBlockTime: 5.2,
      nodesOnline: 8,
      isHealthy: true
    };

    res.status(200).json({
      success: true,
      data: blockchainStatus
    });
  } catch (error) {
    console.error("Error getting blockchain status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get blockchain status"
    });
  }
});

/**
 * @swagger
 * /blockchain/blocks:
 *   get:
 *     summary: Get blockchain blocks
 *     description: Retrieves a list of blocks in the blockchain
 *     tags: [Blockchain]
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
 *         description: Number of blocks per page
 *     responses:
 *       200:
 *         description: List of blockchain blocks
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
 *                     $ref: '#/components/schemas/Block'
 *       500:
 *         description: Server error
 */
router.get("/blocks", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Mock data - in a real implementation this would be obtained from the blockchain service
    const mockBlocks = [];
    const startHeight = 12458 - ((page - 1) * limit);
    
    for (let i = 0; i < limit && startHeight - i > 0; i++) {
      const blockHeight = startHeight - i;
      mockBlocks.push({
        hash: `block-hash-${blockHeight}`,
        previousHash: `block-hash-${blockHeight - 1}`,
        height: blockHeight,
        timestamp: new Date(Date.now() - (i * 5000)).toISOString(),
        transactions: [],
        transactionCount: Math.floor(Math.random() * 10),
        size: Math.floor(Math.random() * 1000) + 500,
        createdBy: `node-${Math.floor(Math.random() * 8) + 1}`
      });
    }

    res.status(200).json({
      success: true,
      data: mockBlocks,
      pagination: {
        page,
        limit,
        totalBlocks: 12458,
        totalPages: Math.ceil(12458 / limit)
      }
    });
  } catch (error) {
    console.error("Error getting blockchain blocks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get blockchain blocks"
    });
  }
});

/**
 * @swagger
 * /blockchain/blocks/{blockId}:
 *   get:
 *     summary: Get block by ID
 *     description: Retrieves details of a specific block by its ID or height
 *     tags: [Blockchain]
 *     parameters:
 *       - in: path
 *         name: blockId
 *         required: true
 *         schema:
 *           type: string
 *         description: Block ID or block height
 *     responses:
 *       200:
 *         description: Block details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Block'
 *       404:
 *         description: Block not found
 *       500:
 *         description: Server error
 */
router.get("/blocks/:blockId", async (req: Request, res: Response) => {
  try {
    const { blockId } = req.params;
    const isNumeric = /^\d+$/.test(blockId);
    
    // Mock data - in a real implementation this would be obtained from the blockchain service
    const mockBlock = {
      hash: isNumeric ? `block-hash-${blockId}` : blockId,
      previousHash: isNumeric ? `block-hash-${parseInt(blockId) - 1}` : `prev-${blockId}`,
      height: isNumeric ? parseInt(blockId) : 12345,
      timestamp: new Date().toISOString(),
      transactions: [],
      transactionCount: 5,
      size: 723,
      createdBy: "node-3"
    };

    res.status(200).json({
      success: true,
      data: mockBlock
    });
  } catch (error) {
    console.error("Error getting block details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get block details"
    });
  }
});

/**
 * @swagger
 * /blockchain/transactions/{txId}:
 *   get:
 *     summary: Get transaction by ID
 *     description: Retrieves details of a specific transaction by its ID
 *     tags: [Blockchain]
 *     parameters:
 *       - in: path
 *         name: txId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
router.get("/transactions/:txId", async (req: Request, res: Response) => {
  try {
    const { txId } = req.params;
    
    // Mock data - in a real implementation this would be obtained from the blockchain service
    const mockTransaction = {
      txId: txId,
      blockHash: "block-hash-12345",
      blockHeight: 12345,
      timestamp: new Date().toISOString(),
      type: "TRANSFER",
      sender: "user-abc-123",
      receiver: "user-xyz-789",
      productId: "product-123",
      data: {
        quantity: 100,
        price: 25000
      },
      status: "CONFIRMED"
    };

    res.status(200).json({
      success: true,
      data: mockTransaction
    });
  } catch (error) {
    console.error("Error getting transaction details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get transaction details"
    });
  }
});

/**
 * @swagger
 * /blockchain/product/{productId}/history:
 *   get:
 *     summary: Get product history on blockchain
 *     description: Retrieves the complete history of a product from the blockchain
 *     tags: [Blockchain]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product transaction history
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
 *                     $ref: '#/components/schemas/ProductHistoryEntry'
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.get("/product/:productId/history", async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    
    // Mock data - in a real implementation this would be obtained from the blockchain service
    const mockHistory = [
      {
        txId: `tx-${Date.now()}-1`,
        timestamp: new Date(Date.now() - 5000000).toISOString(),
        action: "CREATED",
        performedBy: "farmer-123",
        roleType: "FARMER",
        details: {
          name: "Beras Organik Premium",
          quantity: 100
        },
        blockHeight: 12300
      },
      {
        txId: `tx-${Date.now()}-2`,
        timestamp: new Date(Date.now() - 3000000).toISOString(),
        action: "VERIFIED",
        performedBy: "inspector-456",
        roleType: "INSPECTOR",
        details: {
          quality: "Premium",
          passedTests: ["visual", "chemical", "weight"]
        },
        blockHeight: 12350
      },
      {
        txId: `tx-${Date.now()}-3`,
        timestamp: new Date(Date.now() - 1000000).toISOString(),
        action: "TRANSFERRED",
        performedBy: "distributor-789",
        roleType: "DISTRIBUTOR",
        details: {
          fromUser: "farmer-123",
          toUser: "distributor-789",
          quantity: 50
        },
        blockHeight: 12400
      }
    ];

    res.status(200).json({
      success: true,
      data: mockHistory
    });
  } catch (error) {
    console.error("Error getting product history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get product history"
    });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     BlockchainStatus:
 *       type: object
 *       properties:
 *         networkName:
 *           type: string
 *           description: Name of the blockchain network
 *         currentHeight:
 *           type: integer
 *           description: Current height/length of the blockchain
 *         totalTransactions:
 *           type: integer
 *           description: Total number of transactions in the blockchain
 *         lastBlockTime:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the last block
 *         averageBlockTime:
 *           type: number
 *           description: Average time between blocks in seconds
 *         nodesOnline:
 *           type: integer
 *           description: Number of nodes currently online
 *         isHealthy:
 *           type: boolean
 *           description: Whether the blockchain is functioning normally
 *           
 *     Block:
 *       type: object
 *       properties:
 *         hash:
 *           type: string
 *           description: Block hash
 *         previousHash:
 *           type: string
 *           description: Hash of the previous block
 *         height:
 *           type: integer
 *           description: Block height/position in the chain
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Block creation time
 *         transactions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Transaction'
 *         transactionCount:
 *           type: integer
 *           description: Number of transactions in the block
 *         size:
 *           type: integer
 *           description: Size of the block in bytes
 *         createdBy:
 *           type: string
 *           description: Node that created this block
 *           
 *     Transaction:
 *       type: object
 *       properties:
 *         txId:
 *           type: string
 *           description: Transaction ID
 *         blockHash:
 *           type: string
 *           description: Hash of the block containing this transaction
 *         blockHeight:
 *           type: integer
 *           description: Height of the block containing this transaction
 *         timestamp:
 *           type: string
 *           format: date-time
 *         type:
 *           type: string
 *           enum: [CREATION, TRANSFER, VERIFICATION, RECALL, PAYMENT]
 *           description: Type of transaction
 *         sender:
 *           type: string
 *           description: Transaction sender
 *         receiver:
 *           type: string
 *           description: Transaction receiver (if applicable)
 *         productId:
 *           type: string
 *           description: Reference to the product (if applicable)
 *         data:
 *           type: object
 *           description: Transaction payload/data
 *         status:
 *           type: string
 *           enum: [CONFIRMED, PENDING, FAILED]
 *           description: Transaction status
 *           
 *     ProductHistoryEntry:
 *       type: object
 *       properties:
 *         txId:
 *           type: string
 *           description: Transaction ID
 *         timestamp:
 *           type: string
 *           format: date-time
 *         action:
 *           type: string
 *           enum: [CREATED, VERIFIED, TRANSFERRED, RECALLED, UPDATED]
 *           description: Action performed on the product
 *         performedBy:
 *           type: string
 *           description: ID of the user who performed the action
 *         roleType:
 *           type: string
 *           enum: [FARMER, DISTRIBUTOR, RETAILER, INSPECTOR, ADMIN]
 *           description: Role of the user who performed the action
 *         details:
 *           type: object
 *           description: Action-specific details
 *         blockHeight:
 *           type: integer
 *           description: Block height where this event was recorded
 */

router.get("/last-block", catcher(getLastBlock))
router.get("/state", catcher(getBlockchainState))

export default router
