import { Router } from "express"

import catcher from "../helper/handler"
import {
  getUserList,
  getUser,
  register,
  login,
  getPrivateKey,
  linkGoogleAccount,
  googleLogin,
  updateUserProfile,
  changePassword,
  getProfileChangeHistory
} from "../controller/UserController"
import { authenticateJWT } from "../../middleware/auth"
import validate from "../middleware/validation"
import { registerSchema, loginSchema } from "../validation/userSchema"
import { authRateLimiter } from "../../middleware/rateLimiter"

const router = Router()

/**
 * @swagger
 * /user/register:
 *   post:
 *     summary: Register a new user with email and password
 *     tags: [Auth]
 *     description: |
 *       Register a new user with email and password. This creates a complete user account with:
 *       - User profile with selected role
 *       - Blockchain wallet with address
 *       - Encrypted private key
 *       
 *       Validation rules:
 *       - Name: 3-50 characters, letters and spaces only
 *       - Email: Must be from a valid provider (gmail.com, yahoo.com, etc.) - example.com domains not allowed
 *       - Password: Min 8 chars with at least 1 uppercase, 1 lowercase, 1 number, and 1 special character
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
 *                 description: User's full name (3-50 characters, letters and spaces only)
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address (must be from a valid provider like gmail.com)
 *                 example: "johndoe@gmail.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password (min 8 chars with uppercase, lowercase, numbers, and special characters)
 *                 example: "Password123!"
 *               role:
 *                 type: string
 *                 enum: [FARMER, COLLECTOR, TRADER, RETAILER, CONSUMER, ADMIN, PRODUCER, INSPECTOR, MEDIATOR]
 *                 description: User's role in the supply chain
 *                 example: "FARMER"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User registered successfully with wallet"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "FARM-12345678"
 *                         email:
 *                           type: string
 *                           example: "johndoe@gmail.com"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         role:
 *                           type: string
 *                           example: "FARMER"
 *                         walletAddress:
 *                           type: string
 *                           example: "0x1234567890abcdef1234567890abcdef12345678"
 *                     token:
 *                       type: string
 *                       description: JWT token for authentication
 *                     privateKey:
 *                       type: string
 *                       description: Blockchain wallet private key (only shown once)
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
 *       409:
 *         description: Email already in use
 *       429:
 *         description: Too many registration attempts
 */
router.post("/register", authRateLimiter, validate(registerSchema), catcher(register))

/**
 * @swagger
 * /user/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     description: |
 *       Login with a valid email and password. The response includes:
 *       - User profile information
 *       - JWT token for authentication
 *       - Wallet address
 *       - Private key (only if a new wallet was generated)
 *       
 *       Validation rules:
 *       - Email: Must be from a valid provider (gmail.com, yahoo.com, etc.)
 *       - Password: Min 8 chars with at least 1 uppercase, 1 lowercase, 1 number, and 1 special character
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
 *                 description: User's email address (must be from a valid provider)
 *                 example: "johndoe@gmail.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *                 example: "Password123!"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login successful" 
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "FARM-12345678"
 *                         email:
 *                           type: string
 *                           example: "johndoe@gmail.com"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         role:
 *                           type: string
 *                           example: "FARMER"
 *                         walletAddress:
 *                           type: string
 *                           example: "0x1234567890abcdef1234567890abcdef12345678"
 *                     token:
 *                       type: string
 *                       description: JWT authentication token
 *                     privateKey:
 *                       type: string
 *                       description: Private key (only shown if a new wallet was generated)
 *       400:
 *         description: Invalid input format
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", validate(loginSchema), catcher(login))

/**
 * @swagger
 * /user/link-google:
 *   post:
 * @swagger
 * /user/link-google:
 *   post:
 *     summary: Link Google account to existing user
 *     tags: [Auth]
 *     description: |
 *       Links a Google account to a user's existing account.
 *       This allows the user to login with either email/password or their Google account.
 *       The user must provide their email, password, and Google ID to link accounts.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - googleId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email of the existing user account
 *                 example: "johndoe@gmail.com"
 *               password:
 *                 type: string
 *                 description: Password of the existing user account
 *                 example: "Password123!"
 *               googleId:
 *                 type: string
 *                 description: Google account ID to link
 *                 example: "109554234823788795258"
 *     responses:
 *       200:
 *         description: Google account linked successfully
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
 *                   example: "Google account linked successfully"
 *       400:
 *         description: Missing required information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Email, password, and googleId are required"
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid email or password"
 */
router.post("/link-google", catcher(linkGoogleAccount))

/**
 * @swagger
 * /user/google-login:
 *   post:
 *     summary: Login with Google account (Legacy method)
 *     tags: [Auth]
 *     description: |
 *       **DEPRECATED**: This is a legacy method for Google login.
 *       For new implementations, use the `/auth/google` flow instead.
 *       
 *       This endpoint handles login for users who have previously linked their 
 *       Google account using the /link-google endpoint.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - googleId
 *             properties:
 *               googleId:
 *                 type: string
 *                 description: Google account ID 
 *                 example: "109554234823788795258"
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Google login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "FARM-12345678"
 *                         email:
 *                           type: string
 *                           example: "johndoe@gmail.com"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                         role:
 *                           type: string
 *                           example: "FARMER"
 *                         walletAddress:
 *                           type: string
 *                           example: "0x1234567890abcdef1234567890abcdef12345678"
 *                     token:
 *                       type: string
 *                       description: JWT authentication token
 *       400:
 *         description: Missing Google ID
 *       401:
 *         description: Authentication failed
 *       404:
 *         description: No account linked with this Google account
 */
router.post("/google-login", catcher(googleLogin))

/**
 * @swagger
 * /user/private-key:
 *   post:
 *     summary: Retrieve user's private key
 *     tags: [Wallet]
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Retrieves the user's encrypted private key by providing the password.
 *       This is useful when the user needs to access their private key after initial creation.
 *       The private key is stored encrypted and can only be decrypted with the correct password.
 *       
 *       **Security Note**: This is a sensitive operation and requires both authentication and password.
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
 *                 description: User's password to decrypt the private key
 *                 example: "Password123!"
 *     responses:
 *       200:
 *         description: Private key retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     privateKey:
 *                       type: string
 *                       description: Decrypted private key
 *                       example: "0xabcdef1234567890abcdef1234567890abcdef12345678"
 *       400:
 *         description: Missing password
 *       401:
 *         description: Invalid password
 *       404:
 *         description: User or wallet not found
 */
router.post("/private-key", authenticateJWT, catcher(getPrivateKey))

/**
 * @swagger
 * /user:
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
 * /user/{address}:
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

/**
 * @swagger
 * /user/profile:
 *   put:
 *     summary: Memperbarui profil pengguna
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Memperbarui data profil pengguna yang sedang login.
 *       Hanya beberapa field yang dapat diubah (nama, dll).
 *       Email tidak dapat diubah karena merupakan identitas utama.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nama lengkap pengguna
 *                 example: "John Doe"
 *               phone:
 *                 type: string
 *                 description: Nomor telepon pengguna
 *                 example: "+62812345678"
 *               address:
 *                 type: string
 *                 description: Alamat pengguna
 *                 example: "Jl. Contoh No. 123, Jakarta"
 *               profilePicture:
 *                 type: string
 *                 description: URL foto profil pengguna
 *                 example: "https://example.com/profile.jpg"
 *     responses:
 *       200:
 *         description: Profil berhasil diperbarui
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
 *                   example: "Profil berhasil diperbarui"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "FARM-12345678"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       example: "johndoe@gmail.com" 
 *                     role:
 *                       type: string
 *                       example: "FARMER"
 *                     walletAddress:
 *                       type: string
 *                       example: "0x1234567890abcdef1234567890abcdef12345678"
 *                     phone:
 *                       type: string
 *                       example: "+62812345678"
 *                     address:
 *                       type: string
 *                       example: "Jl. Contoh No. 123, Jakarta"
 *                     profilePicture:
 *                       type: string
 *                       example: "https://example.com/profile.jpg"
 *       400:
 *         description: Data tidak valid
 *       401:
 *         description: Tidak terotentikasi
 *       404:
 *         description: Pengguna tidak ditemukan
 */
router.put("/profile", authenticateJWT, catcher(updateUserProfile));

/**
 * @swagger
 * /user/change-password:
 *   post:
 *     summary: Mengubah password pengguna
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Mengubah password pengguna yang sedang login.
 *       Pengguna harus menyediakan password lama dan password baru.
 *       Password baru harus memenuhi persyaratan keamanan yang sama dengan registrasi.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 description: Password lama
 *                 example: "Password123!"
 *               newPassword:
 *                 type: string
 *                 description: Password baru (min 8 karakter, huruf besar, huruf kecil, angka, dan karakter khusus)
 *                 example: "NewPassword456!"
 *     responses:
 *       200:
 *         description: Password berhasil diubah
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
 *                   example: "Password berhasil diubah"
 *       400:
 *         description: Format password tidak valid
 *       401:
 *         description: Password lama tidak cocok
 *       404:
 *         description: Pengguna tidak ditemukan
 */
router.post("/change-password", authenticateJWT, catcher(changePassword));

/**
 * @swagger
 * /user/profile/history:
 *   get:
 *     summary: Mendapatkan histori perubahan profil
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Mengambil histori perubahan profil pengguna yang sedang login.
 *       Berguna untuk audit dan keamanan akun.
 *     responses:
 *       200:
 *         description: Histori perubahan profil berhasil diambil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       timestamp:
 *                         type: number
 *                         description: Waktu perubahan dalam unix timestamp
 *                         example: 1623456789000
 *                       changedFields:
 *                         type: array
 *                         description: Daftar field yang diubah
 *                         items:
 *                           type: string
 *                         example: ["name", "phone"]
 *                       oldValues:
 *                         type: object
 *                         description: Nilai lama dari field yang diubah
 *                         example: { "name": "Nama Lama", "phone": "+6281234567" }
 *                       newValues:
 *                         type: object
 *                         description: Nilai baru dari field yang diubah
 *                         example: { "name": "Nama Baru", "phone": "+6287654321" }
 *       401:
 *         description: Tidak terotentikasi
 *       404:
 *         description: Pengguna tidak ditemukan
 */
router.get("/profile/history", authenticateJWT, catcher(getProfileChangeHistory));

export default router
