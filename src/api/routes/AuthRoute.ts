import { Router } from "express"
import passport from "passport"
import { googleLogin, findOrCreateGoogleUser, registerWithGoogle } from "../controller/UserController"
import catcher from "../helper/handler"
import { configurePassport } from "../../config/passport"
import session from "express-session"
import { jwtConfig } from "../../config"
import { UserRole } from "../../enum"
import { Request, Response } from "express"

// Configure passport with our findOrCreateGoogleUser function
const passportInstance = configurePassport(findOrCreateGoogleUser);

const router = Router()

// Configure session middleware
router.use(session({
  secret: process.env.SESSION_SECRET || jwtConfig.secret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Initialize passport
router.use(passportInstance.initialize());
router.use(passportInstance.session());

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication operations including Google OAuth
 */

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Start Google OAuth authentication
 *     tags: [Auth]
 *     description: |
 *       Redirects the user to Google's OAuth 2.0 consent screen.
 *       This is the first step in the Google authentication flow.
 *       The user will be prompted to grant access to their profile and email.
 *     responses:
 *       302:
 *         description: Redirects to Google authentication page
 */
router.get('/google', (req, res, next) => {
  console.log('Starting Google OAuth flow...');
  next();
}, 
  passport.authenticate('google', { 
    scope: ['profile', 'email']
  })
);

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback endpoint
 *     tags: [Auth]
 *     description: |
 *       Callback URL that Google redirects to after user authentication.
 *       - For existing users: Completes the authentication and returns a JWT token
 *       - For new users: Redirects to role selection page
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Google (handled automatically)
 *       - in: query
 *         name: isNewUser
 *         schema:
 *           type: boolean
 *         description: Flag indicating if this is a new user registration
 *     responses:
 *       302:
 *         description: |
 *           Redirects to either:
 *           - Role selection page (for new users)
 *           - Frontend application with JWT token (for existing users)
 *       401:
 *         description: Authentication failed
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
 *                   example: "Authentication failed"
 */
router.get('/google/callback', (req, res, next) => {
  console.log('Auth route: Handling Google callback at path:', req.path);
  console.log('Full URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
  console.log('Query params:', req.query);
  next();
},
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: true // Gunakan session untuk menyimpan profil sementara
  }),
  catcher((req: Request, res: Response) => {
    // Cek apakah pengguna baru atau sudah ada
    const isNewUser = req.query.isNewUser === 'true';
    console.log('User authentication successful, isNewUser:', isNewUser);
    
    if (isNewUser) {
      // Redirect ke halaman pilih role
      return res.redirect('/api/auth/select-role');
    }
    
    // Jika bukan pengguna baru, lanjutkan ke login seperti biasa
    return googleLogin(req, res);
  })
);

/**
 * @swagger
 * /auth/select-role:
 *   get:
 *     summary: Role selection page for new Google users
 *     tags: [Auth]
 *     description: |
 *       Displays a form for new users who authenticated with Google to select their role.
 *       This step is required before account creation is completed.
 *       The user must have authenticated with Google first to access this page.
 *     responses:
 *       200:
 *         description: HTML form for role selection
 *       302:
 *         description: Redirects to Google login if not authenticated
 */
router.get('/select-role', (req, res) => {
  // Cek apakah user sudah autentikasi dengan Google
  if (!(req.session as any).googleProfile) {
    return res.redirect('/api/auth/google');
  }
  
  // Kirim HTML form sederhana
  const roleOptions = Object.values(UserRole)
    .map(role => `<option value="${role}">${role}</option>`)
    .join('');
  
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Pilih Role - Agrichain</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
      h1 { color: #333; }
      select { width: 100%; padding: 8px; margin: 10px 0; }
      button { background: #4285f4; color: white; border: none; padding: 10px 15px; cursor: pointer; }
    </style>
  </head>
  <body>
    <h1>Pilih Role untuk Akun Anda</h1>
    <p>Anda berhasil login dengan Google. Silakan pilih role untuk akun Anda:</p>
    
    <form action="/api/auth/register-google" method="post">
      <select name="role" required>
        <option value="">-- Pilih Role --</option>
        ${roleOptions}
      </select>
      <p>
        <button type="submit">Daftar</button>
      </p>
    </form>
  </body>
  </html>
  `;
  
  res.send(html);
});

/**
 * @swagger
 * /auth/register-google:
 *   post:
 *     summary: Complete registration with Google account
 *     tags: [Auth]
 *     description: |
 *       Creates a new user account using the Google profile information and selected role.
 *       This endpoint:
 *       - Creates a blockchain wallet
 *       - Encrypts the private key
 *       - Generates a JWT token
 *       - Returns complete user information
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [FARMER, COLLECTOR, TRADER, RETAILER, CONSUMER, ADMIN, PRODUCER, INSPECTOR, MEDIATOR]
 *                 example: "FARMER"
 *                 description: User's role in the system
 *     responses:
 *       201:
 *         description: Registration successful
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
 *                   example: "User registered successfully with Google account"
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
 *                           example: "user@gmail.com"
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
 *         description: Invalid input or missing Google profile
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
 *                   example: "Role tidak valid"
 *       409:
 *         description: Email already in use
 *       500:
 *         description: Server error
 */
router.post('/register-google', catcher(registerWithGoogle));

/**
 * @swagger
 * /auth/login-success:
 *   get:
 *     summary: Success page after authentication
 *     tags: [Auth]
 *     description: |
 *       Page that displays a success message after successful authentication.
 *       This can be used as a callback target or redirect destination.
 *     responses:
 *       200:
 *         description: Success message
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
 */
router.get('/login-success', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Login successful"
  });
});

export default router; 