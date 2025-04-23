import { Router } from "express"

import catcher from "../helper/handler"
import {
  generateWallet,
  getUserList,
  getUser,
  register,
  login,
  getPrivateKey,
  linkGoogleAccount,
  googleLogin
} from "../controller/UserController"
import { authenticateJWT } from "../../middleware/auth"

const router = Router()

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *               role:
 *                 type: string
 *                 enum: [FARMER, COLLECTOR, TRADER, RETAILER, CONSUMER, ADMIN, PRODUCER, INSPECTOR, MEDIATOR]
 *                 description: User's role in the supply chain
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 userId:
 *                   type: string
 *       400:
 *         description: Invalid input data
 */
router.post("/register", catcher(register))

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login to the system
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", catcher(login))

/**
 * @swagger
 * /api/users/link-google:
 *   post:
 *     summary: Link Google account to user
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - googleToken
 *             properties:
 *               userId:
 *                 type: string
 *               googleToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Google account linked successfully
 *       400:
 *         description: Invalid input data
 */
router.post("/link-google", catcher(linkGoogleAccount))

/**
 * @swagger
 * /api/users/google-login:
 *   post:
 *     summary: Login with Google account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - googleToken
 *             properties:
 *               googleToken:
 *                 type: string
 *                 description: Google OAuth token
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Authentication failed
 */
router.post("/google-login", catcher(googleLogin))

/**
 * @swagger
 * /api/users/generate-wallet:
 *   post:
 *     summary: Generate blockchain wallet for user
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: Password to encrypt private key
 *     responses:
 *       201:
 *         description: Wallet generated successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/generate-wallet", authenticateJWT, catcher(generateWallet))

/**
 * @swagger
 * /api/users/private-key:
 *   post:
 *     summary: Get user's private key
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 description: Password to decrypt private key
 *     responses:
 *       200:
 *         description: Private key retrieved successfully
 *       401:
 *         description: Unauthorized or invalid password
 */
router.post("/private-key", authenticateJWT, catcher(getPrivateKey))

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get list of all users
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 */
router.get("/", catcher(getUserList))

/**
 * @swagger
 * /api/users/{address}:
 *   get:
 *     summary: Get user by blockchain address
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: address
 *         schema:
 *           type: string
 *         required: true
 *         description: User's blockchain address
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get("/:address", catcher(getUser))

export default router
