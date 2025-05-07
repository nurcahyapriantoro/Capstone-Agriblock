import { Router } from "express"

import catcher from "../helper/handler"
import {
  getTransaction,
  signTransaction,
  createTransaction,
  getTransactionPool,
  transferCoin,
  stakeCoin,
  getTransactionFlow,
  createBenih,
  purchaseCoin,
} from "../controller/TransactionController"
import validate from "../middleware/validation"
import {
  transactionSchema,
  coinTransferSchema,
  coinStakeSchema,
  createBenihSchema,
  purchaseCoinSchema,
} from "../validation/transactionSchema"
import { transactionRateLimiter } from "../../middleware/rateLimiter"
import { transactionAmountSchema, fundTransferSchema, productTransactionSchema } from "../validation/transactionValidation"
import { authenticateJWT } from "../../middleware/auth"

const router = Router()

/**
 * @swagger
 * /transaction/create:
 *   post:
 *     summary: Create a new transaction
 *     tags: [Transactions]
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Create a new transaction with the following limits:
 *       - Min amount: 1,000 IDR
 *       - Max amount: 1,000,000,000 IDR (1 billion)
 *       - Daily limit: 50,000,000 IDR for regular users
 *       - Rate limited to 20 transactions per hour
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *               - from
 *               - to
 *             properties:
 *               data:
 *                 type: object
 *                 description: Transaction data
 *               from:
 *                 type: string
 *                 description: Sender public key
 *               to:
 *                 type: string
 *                 description: Receiver public key
 *               privateKey:
 *                 type: string
 *                 description: Private key for signing (optional if signature provided)
 *               signature:
 *                 type: string
 *                 description: Transaction signature (optional if privateKey provided)
 *               lastTransactionHash:
 *                 type: string
 *                 description: Hash of the last transaction (optional)
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *       400:
 *         description: Invalid transaction data
 *       429:
 *         description: Transaction limit reached
 */
router.post(
  "/create", 
  authenticateJWT,
  transactionRateLimiter,
  validate(transactionSchema), 
  validate(transactionAmountSchema),
  catcher(createTransaction)
)

/**
 * @swagger
 * /transaction/create-benih:
 *   post:
 *     summary: Create initial seed transaction
 *     tags: [Transactions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *               - address
 *             properties:
 *               data:
 *                 type: object
 *                 description: Seed data
 *               address:
 *                 type: string
 *                 description: Target address
 *     responses:
 *       201:
 *         description: Seed transaction created successfully
 *       400:
 *         description: Invalid seed data
 */
router.post("/create-benih", validate(createBenihSchema), catcher(createBenih))

/**
 * @swagger
 * /transaction/sign:
 *   post:
 *     summary: Sign a transaction
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - privateKey
 *               - data
 *               - from
 *               - to
 *             properties:
 *               privateKey:
 *                 type: string
 *                 description: Private key for signing
 *               data:
 *                 type: object
 *                 description: Transaction data
 *               from:
 *                 type: string
 *                 description: Sender public key
 *               to:
 *                 type: string
 *                 description: Receiver public key
 *               lastTransactionHash:
 *                 type: string
 *                 description: Hash of the last transaction (optional)
 *     responses:
 *       200:
 *         description: Transaction signed successfully
 *       400:
 *         description: Invalid transaction data or private key
 */
router.post("/sign", validate(transactionSchema), catcher(signTransaction))

/**
 * @swagger
 * /transaction/purchase-coin:
 *   post:
 *     summary: Purchase coins
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - address
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount of coins to purchase
 *               address:
 *                 type: string
 *                 description: Buyer's address
 *     responses:
 *       201:
 *         description: Coins purchased successfully
 *       400:
 *         description: Invalid purchase data
 */
router.post(
  "/purchase-coin",
  validate(purchaseCoinSchema),
  catcher(purchaseCoin)
)

/**
 * @swagger
 * /transaction/transfer-coin:
 *   post:
 *     summary: Transfer coins between accounts
 *     tags: [Transactions]
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Transfer coins between accounts with the following limits:
 *       - Min amount: 1,000 IDR
 *       - Max amount: 1,000,000,000 IDR (1 billion)
 *       - Daily limit: 50,000,000 IDR for regular users
 *       - Rate limited to 20 transactions per hour
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - privateKey
 *               - address
 *               - amount
 *             properties:
 *               privateKey:
 *                 type: string
 *                 description: Sender's private key
 *               address:
 *                 type: string
 *                 description: Receiver's address
 *               amount:
 *                 type: number
 *                 description: Amount to transfer
 *               purpose:
 *                 type: string
 *                 enum: [PAYMENT, REFUND, INVESTMENT, GIFT, OTHER]
 *                 description: Purpose of the transfer
 *     responses:
 *       201:
 *         description: Coins transferred successfully
 *       400:
 *         description: Transfer failed, insufficient balance
 *       429:
 *         description: Transaction limit reached
 */
router.post(
  "/transfer-coin",
  authenticateJWT,
  transactionRateLimiter,
  validate(coinTransferSchema),
  validate(fundTransferSchema),
  catcher(transferCoin)
)

/**
 * @swagger
 * /transaction/stake:
 *   post:
 *     summary: Stake coins
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - privateKey
 *               - amount
 *             properties:
 *               privateKey:
 *                 type: string
 *                 description: Staker's private key
 *               amount:
 *                 type: number
 *                 description: Amount to stake
 *     responses:
 *       201:
 *         description: Coins staked successfully
 *       400:
 *         description: Staking failed, insufficient balance
 */
router.post("/stake", validate(coinStakeSchema), catcher(stakeCoin))

/**
 * @swagger
 * /transaction/pool:
 *   get:
 *     summary: Get transaction pool
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: Transaction pool data
 */
router.get("/pool", catcher(getTransactionPool))

/**
 * @swagger
 * /transaction/{hash}:
 *   get:
 *     summary: Get transaction by hash
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: hash
 *         schema:
 *           type: string
 *         required: true
 *         description: Transaction hash
 *     responses:
 *       200:
 *         description: Transaction details
 *       404:
 *         description: Transaction not found
 */
router.get("/:hash", catcher(getTransaction))

/**
 * @swagger
 * /transaction/{hash}/flow:
 *   get:
 *     summary: Get transaction flow (chain of related transactions)
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: hash
 *         schema:
 *           type: string
 *         required: true
 *         description: Transaction hash
 *     responses:
 *       200:
 *         description: Transaction flow details
 *       404:
 *         description: Transaction not found
 */
router.get("/:hash/flow", catcher(getTransactionFlow))

export default router
