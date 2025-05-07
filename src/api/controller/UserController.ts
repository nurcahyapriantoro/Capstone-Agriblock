import type { Request, Response } from "express"
import { generateKeyPair } from "../../../utils/keypair"
import { stateDB, txhashDB } from "../../helper/level.db.client"
import jwt from 'jsonwebtoken'
import { UserRole } from "../../enum"
import { encryptPrivateKey, decryptPrivateKey } from "../../utils/encryption"
import { v4 as uuidv4 } from 'uuid'
import { Profile } from 'passport-google-oauth20'
import bcrypt from 'bcrypt'

import { ec as EC } from "elliptic"
import { jwtConfig } from '../../config'

// Interface untuk data user
interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  walletAddress: string;
  encryptedPrivateKey: string;
  googleId?: string;
  phone?: string;
  address?: string;
  profilePicture?: string;
  createdAt: number;
  updatedAt: number;
}

// Interface untuk histori perubahan profil
interface ProfileChangeHistory {
  userId: string;
  timestamp: number;
  changedFields: string[];
  oldValues: Record<string, any>;
  newValues: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Temporary in-memory user database sebagai cache
// Di produksi, ini sepenuhnya menggunakan database
let usersCache: User[] = [];
let usersCacheInitialized = false;

// Helper function untuk menyimpan user ke database persisten
async function saveUserToDb(user: User): Promise<void> {
  try {
    // Simpan user berdasarkan ID
    await txhashDB.put(`user:${user.id}`, JSON.stringify(user));
    
    // Simpan juga indeks berdasarkan email untuk pencarian
    await txhashDB.put(`user-email:${user.email.toLowerCase()}`, user.id);
    
    // Jika ada googleId, simpan indeks berdasarkan googleId
    if (user.googleId) {
      await txhashDB.put(`user-google:${user.googleId}`, user.id);
    }
    
    // Update cache
    const existingIndex = usersCache.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      usersCache[existingIndex] = user;
    } else {
      usersCache.push(user);
    }
  } catch (error) {
    console.error(`Error saving user ${user.id} to database:`, error);
    throw error;
  }
}

// Helper function untuk mendapatkan user dari database
async function getUserById(userId: string): Promise<User | null> {
  try {
    console.log(`getUserById - Looking for user ID: ${userId}`);
    
    // Cek cache dulu jika sudah diinisialisasi
    if (usersCacheInitialized) {
      const cachedUser = usersCache.find(u => u.id === userId);
      console.log(`getUserById - Found in cache: ${cachedUser ? 'Yes' : 'No'}`);
      
      if (cachedUser) return cachedUser;
    }
    
    // Jika tidak ada di cache, cari di database
    console.log(`getUserById - Checking database for user:${userId}`);
    try {
      const userData = await txhashDB.get(`user:${userId}`);
      console.log(`getUserById - Database lookup successful`);
      
      // Parse data user
      const user = JSON.parse(userData) as User;
      
      // Update cache jika sudah diinisialisasi
      if (usersCacheInitialized) {
        const cacheIndex = usersCache.findIndex(u => u.id === user.id);
        if (cacheIndex >= 0) {
          usersCache[cacheIndex] = user;
        } else {
          usersCache.push(user);
        }
      }
      
      return user;
    } catch (dbError: any) {
      console.error(`getUserById - Database error:`, dbError);
      return null;
    }
  } catch (error) {
    console.error(`User dengan ID ${userId} tidak ditemukan:`, error);
    return null;
  }
}

// Helper function untuk mendapatkan user berdasarkan email
async function getUserByEmail(email: string): Promise<User | null> {
  try {
    if (!email) {
      console.error("getUserByEmail called with empty email");
      return null;
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    console.log(`Searching for user with email: ${normalizedEmail}`);
    
    // First check directly in the database without depending on cache
    try {
      // Try to get user ID from email index
      console.log(`Looking up user email index: user-email:${normalizedEmail}`);
      const userId = await txhashDB.get(`user-email:${normalizedEmail}`);
      console.log(`Found user ID from email index: ${userId}`);
      
      // Get full user data based on ID
      console.log(`Getting full user data for ID: ${userId}`);
      const userData = await txhashDB.get(`user:${userId}`);
      
      if (!userData) {
        console.log(`No user data found for ID: ${userId}`);
        return null;
      }
      
      const user = JSON.parse(userData) as User;
      console.log(`User found in database: ${user.id}`);
      
      // Update cache if it's initialized
      if (usersCacheInitialized) {
        const cacheIndex = usersCache.findIndex(u => u.id === user.id);
        if (cacheIndex >= 0) {
          usersCache[cacheIndex] = user;
        } else {
          usersCache.push(user);
        }
        console.log(`User ${user.id} added/updated in cache`);
      }
      
      return user;
    } catch (error: any) {
      // This section runs if the database lookup fails
      
      // If error is NOT_FOUND, we can still check the cache
      if (error.type === 'NotFoundError' || error.code === 'LEVEL_NOT_FOUND') {
        console.log(`User with email ${normalizedEmail} not found in database, checking cache`);
        
        // Only check the cache if it's initialized
        if (usersCacheInitialized) {
          console.log(`Checking cache (${usersCache.length} users in cache)`);
          const cachedUser = usersCache.find(u => u && u.email && u.email.toLowerCase() === normalizedEmail);
          
          if (cachedUser) {
            console.log(`User found in cache: ${cachedUser.id}`);
            
            // Double check: verify if this user actually exists in the database
            try {
              await txhashDB.get(`user:${cachedUser.id}`);
              return cachedUser;
            } catch (err) {
              console.log(`User found in cache but not in database. Removing from cache.`);
              usersCache = usersCache.filter(u => u.id !== cachedUser.id);
              return null;
            }
          }
        }
        
        return null;
      }
      
      // For other database errors
      console.warn(`Unexpected database error looking up email ${normalizedEmail}:`, error);
      
      // As a fallback, check the cache if initialized
      if (usersCacheInitialized) {
        const cachedUser = usersCache.find(u => u && u.email && u.email.toLowerCase() === normalizedEmail);
        if (cachedUser) {
          console.log(`User found in cache after DB error: ${cachedUser.id}`);
          return cachedUser;
        }
      }
      
      return null;
    }
  } catch (error) {
    console.error(`Error in getUserByEmail for ${email}:`, error);
    return null;
  }
}

// Helper function untuk mendapatkan user berdasarkan GoogleId
async function getUserByGoogleId(googleId: string): Promise<User | null> {
  try {
    // Cek cache dulu jika sudah diinisialisasi
    if (usersCacheInitialized) {
      const cachedUser = usersCache.find(u => u.googleId === googleId);
      if (cachedUser) return cachedUser;
    }
    
    // Jika tidak ada di cache, cari di database
    try {
      const userId = await txhashDB.get(`user-google:${googleId}`);
      return await getUserById(userId);
    } catch (error: any) {
      // Jika level DB memberikan error NOT_FOUND, ini berarti user tidak ada
      if (error.type === 'NotFoundError' || error.code === 'LEVEL_NOT_FOUND') {
        console.log(`User with Google ID ${googleId} not found in database`);
        return null;
      }
      
      console.error(`Error fetching user with Google ID ${googleId}:`, error);
      return null;
    }
  } catch (error) {
    console.error(`Error in getUserByGoogleId for ${googleId}:`, error);
    return null;
  }
}

// Helper untuk inisialisasi cache saat startup
async function initUserCache(): Promise<void> {
  try {
    console.log('Starting user cache initialization...');
    
    // Reset cache
    usersCache = [];
    usersCacheInitialized = false;
    
    // Check if database is ready before trying to access it
    let dbReady = false;
    let retryCount = 0;
    const maxRetries = 5;
    
    while (!dbReady && retryCount < maxRetries) {
      try {
        // More robust database readiness check with retry
        await txhashDB.get('__test__').catch(err => {
          if (err.type === 'NotFoundError' || err.code === 'LEVEL_NOT_FOUND') {
            // This is expected for a non-existent key - database is working
            dbReady = true;
          } else {
            throw err;
          }
        });
        
        // If we get here without an error, database is accessible
        dbReady = true;
        console.log('Database connection verified, loading user data...');
      } catch (error) {
        retryCount++;
        console.log(`Database not ready (attempt ${retryCount}/${maxRetries}), waiting before retry...`);
        // Wait 2 seconds between retries
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (!dbReady) {
      throw new Error('Database not accessible after multiple attempts');
    }
    
    // Get all keys with user: prefix
    let allKeys;
    try {
      allKeys = await txhashDB.keys().all();
    } catch (error) {
      console.error('Error retrieving keys from database:', error);
      throw new Error('Failed to retrieve user keys from database');
    }
    
    const userKeys = allKeys.filter(key => key.toString().startsWith('user:'));
    console.log(`Found ${userKeys.length} user keys in database`);
    
    // Load all users into cache with proper error handling for each user
    for (const key of userKeys) {
      try {
        const userData = await txhashDB.get(key);
        const user = JSON.parse(userData) as User;
        
        // Verify that the user has all required fields
        if (user && user.id && user.email) {
          usersCache.push(user);
          
          // Ensure email index exists
          await txhashDB.put(`user-email:${user.email.toLowerCase()}`, user.id)
            .catch(e => console.error(`Failed to ensure email index for user ${user.id}:`, e));
          
          // Ensure Google ID index exists if applicable
          if (user.googleId) {
            await txhashDB.put(`user-google:${user.googleId}`, user.id)
              .catch(e => console.error(`Failed to ensure Google ID index for user ${user.id}:`, e));
          }
        } else {
          console.error(`Invalid user data found for key ${key}:`, user);
        }
      } catch (error) {
        console.error(`Error loading user from key ${key}:`, error);
        // Continue to next user
      }
    }
    
    console.log(`Successfully loaded ${usersCache.length} users into cache`);
    
    // Set flag that cache is successfully initialized
    usersCacheInitialized = true;
    
    // Verify email indices
    console.log('Verifying email indices...');
    let fixedIndices = 0;
    
    for (const user of usersCache) {
      try {
        const storedId = await txhashDB.get(`user-email:${user.email.toLowerCase()}`).catch(() => null);
        
        if (!storedId || storedId !== user.id) {
          console.log(`Fixing email index for user ${user.id} (${user.email})`);
          await txhashDB.put(`user-email:${user.email.toLowerCase()}`, user.id);
          fixedIndices++;
        }
      } catch (error) {
        console.error(`Error verifying email index for user ${user.id}:`, error);
      }
    }
    
    if (fixedIndices > 0) {
      console.log(`Fixed ${fixedIndices} email indices`);
    } else {
      console.log('All email indices are valid');
    }
  } catch (error) {
    console.error('Error initializing user cache:', error);
    // Mark cache as not initialized
    usersCacheInitialized = false;
    // Clear any partial cache to prevent inconsistent state
    usersCache = [];
    throw error;
  }
}

// Fungsi untuk memastikan cache diinisialisasi
async function ensureCacheInitialized(): Promise<boolean> {
  try {
    // First verify database is ready before trying to initialize cache
    try {
      await txhashDB.get('__test__').catch(err => {
        if (err.type !== 'NotFoundError') throw err;
      });
      console.log('Database verified accessible during ensureCacheInitialized');
    } catch (error) {
      console.error('Database not ready during ensureCacheInitialized:', error);
      return false;
    }

    if (!usersCacheInitialized) {
      console.log('Cache not initialized, initializing now...');
      try {
        await initUserCache();
        if (usersCacheInitialized) {
          console.log('Cache initialization successful');
          return true;
        } else {
          console.error('Cache initialization failed to mark cache as initialized');
          return false;
        }
      } catch (error) {
        console.error('Error during cache initialization:', error);
        return false;
      }
    } else {
      // Cache is already initialized, but let's verify its contents
      console.log('Cache already initialized, verifying integrity');
      
      if (usersCache.length === 0) {
        console.log('Cache is empty, re-initializing to ensure correctness');
        try {
          await initUserCache();
          return usersCacheInitialized;
        } catch (err) {
          console.error('Failed to re-initialize empty cache:', err);
          return usersCacheInitialized; // Return current state even if re-init failed
        }
      }
      
      return true;
    }
  } catch (error) {
    console.error('Unexpected error in ensureCacheInitialized:', error);
    return usersCacheInitialized; // Return current state
  }
}

// Initialize user cache di startup aplikasi - dengan retry mechanism
(async function initializeCacheWithRetry() {
  let attemptCount = 0;
  const maxAttempts = 8; // Increased from 5
  const initialDelay = 2000; // Start with 2 seconds delay
  
  while (!usersCacheInitialized && attemptCount < maxAttempts) {
    try {
      attemptCount++;
      console.log(`Attempt ${attemptCount} to initialize user cache...`);
      await initUserCache();
      if (usersCacheInitialized) {
        console.log('User cache initialized successfully!');
      }
    } catch (error) {
      console.error(`Failed attempt ${attemptCount} to initialize cache:`, error);
      // Wait with exponential backoff (2s, 4s, 8s, etc.)
      const delay = initialDelay * Math.pow(1.5, attemptCount - 1);
      console.log(`Waiting ${delay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  if (!usersCacheInitialized) {
    console.error(`Failed to initialize user cache after ${maxAttempts} attempts. Will continue but may cause issues.`);
    console.error('Users may still be able to log in through direct database access, but performance might be affected.');
  }
})();

// Fungsi helper untuk menyimpan histori perubahan profil
async function saveProfileChangeHistory(history: ProfileChangeHistory): Promise<void> {
  try {
    // Simpan histori di database dengan format key yang unik berdasarkan timestamp
    await txhashDB.put(`profile-history:${history.userId}:${history.timestamp}`, JSON.stringify(history));
    console.log(`Profile change history saved for user ${history.userId}`);
  } catch (error) {
    console.error(`Error saving profile change history for user ${history.userId}:`, error);
  }
}

// Fungsi helper untuk mendapatkan histori perubahan profil
async function fetchProfileChangeHistory(userId: string): Promise<ProfileChangeHistory[]> {
  try {
    // Dapatkan semua kunci histori untuk user tertentu
    const allKeys = await txhashDB.keys().all();
    const userHistoryKeys = allKeys.filter(key => key.toString().startsWith(`profile-history:${userId}:`));
    
    const historyList: ProfileChangeHistory[] = [];
    
    for (const key of userHistoryKeys) {
      try {
        const historyData = await txhashDB.get(key);
        historyList.push(JSON.parse(historyData) as ProfileChangeHistory);
      } catch (error) {
        console.error(`Error loading history from key ${key}:`, error);
      }
    }
    
    // Urutkan berdasarkan timestamp terbaru
    return historyList.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error(`Error retrieving profile change history for user ${userId}:`, error);
    return [];
  }
}

/**
 * Mendaftarkan user baru dengan role yang dipilih
 */
const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    // Note: Input validation is now handled by Yup middleware
    // So we can skip the manual validation checks

    // Normalisasi email (lowercase) untuk menghindari duplikasi dengan case berbeda
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format. Please provide a valid email address."
      });
    }

    // Validate password
    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long."
      });
    }

    // Password can include letters, numbers, underscores, and special characters
    // This validation allows a wide range of characters including _ and other special chars
    const passwordRegex = /^[a-zA-Z0-9_@#$%^&*!?~\-+=.,;:]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password may only contain letters, numbers, underscores, and special characters."
      });
    }

    // Check for disposable/temporary email domains
    // Note: Legitimate emails like university (.edu, .ac.id), corporate, and other official emails are accepted
    const disposableEmailDomains = [
      'tempmail.com', 'temp-mail.org', 'fakeinbox.com', 'guerrillamail.com', 'mailinator.com',
      'yopmail.com', '10minutemail.com', 'dispostable.com', 'trashmail.com', 'emailondeck.com',
      'maildrop.cc', 'getnada.com', 'sharklasers.com', 'tempinbox.com', 'throwawaymail.com',
      'tempr.email', 'mailnesia.com', 'tempmailaddress.com', 'temporarymail.org', 'fakemailgenerator.com'
    ];

    const emailDomain = normalizedEmail.split('@')[1];
    if (disposableEmailDomains.includes(emailDomain)) {
      return res.status(400).json({
        success: false,
        message: "Disposable or temporary email addresses are not allowed. Please use a permanent email address from a trusted provider."
      });
    }

    // Cek apakah email sudah digunakan dengan pencarian case-insensitive
    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `Email ${email} already in use. Please use a different email address or login with this email.`
      });
    }

    // Buat ID user unik
    const userId = `${role.toUpperCase().substring(0, 4)}-${uuidv4().substring(0, 8)}`;

    // Generate wallet sekaligus
    const keyPair = generateKeyPair();
    const walletAddress = keyPair.getPublic("hex");
    const privateKey = keyPair.getPrivate("hex");

    // Enkripsi private key dengan password
    const encryptedKey = encryptPrivateKey(privateKey, password);

    // Hash password untuk penyimpanan (10 rounds adalah standar yang umum digunakan)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Simpan wallet di blockchain state
    await stateDB.put(
      walletAddress,
      JSON.stringify({
        address: walletAddress,
        balance: 0,
        userId: userId
      })
    );

    // Simpan user baru
    const timestamp = Date.now();
    const newUser: User = {
      id: userId,
      email: normalizedEmail,
      password: hashedPassword, // Menyimpan password yang sudah di-hash
      name,
      role,
      walletAddress,
      encryptedPrivateKey: encryptedKey,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Simpan user ke database dan cache
    await saveUserToDb(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, role, walletAddress },
      process.env.JWT_SECRET || jwtConfig.secret || 'default_secret_key',
      { expiresIn: '24h' }
    );

    // Kirim respons
    res.status(201).json({
      success: true,
      message: "User registered successfully with wallet",
      data: {
        user: {
          id: userId,
          email,
          name,
          role,
          walletAddress
        },
        token,
        privateKey // PENTING: Hanya ditampilkan sekali saat registrasi!
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during registration"
    });
  }
};

/**
 * Login user dengan email dan password
 */
const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    console.log(`Login attempt for email: ${email}`);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Normalisasi email untuk konsistensi
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if database is ready - but a NOT_FOUND error is actually expected and means the DB is working!
    try {
      await txhashDB.get('__test__').catch(err => {
        // NOT_FOUND error is expected and indicates the database is working correctly
        if (err.type !== 'NotFoundError' && err.code !== 'LEVEL_NOT_FOUND') {
          throw err;
        }
        // If we get a NOT_FOUND error, the database is working fine
        console.log('Database is accessible (NOT_FOUND error is expected)');
      });
    } catch (error) {
      // Type check the error object before accessing its properties
      if (typeof error === 'object' && error !== null) {
        const levelError = error as { type?: string; code?: string };
        // Only return error if it's not a NOT_FOUND error
        if (levelError.type !== 'NotFoundError' && levelError.code !== 'LEVEL_NOT_FOUND') {
          console.error('Database truly not ready during login attempt:', error);
          return res.status(503).json({
            success: false,
            message: "Database service unavailable, please try again in a moment"
          });
        }
      } else {
        // Unknown error type
        console.error('Unknown database error during login attempt:', error);
        return res.status(503).json({
          success: false,
          message: "Database service unavailable, please try again in a moment"
        });
      }
    }

    // First, try to ensure cache is initialized if not already
    if (!usersCacheInitialized) {
      console.log('Cache not initialized during login attempt, trying to initialize...');
      try {
        await ensureCacheInitialized();
      } catch (error) {
        console.error('Failed to initialize cache during login, continuing with direct DB access');
        // We'll still continue with direct DB access
      }
    }

    // Cari user berdasarkan email (case insensitive) - getUserByEmail now prioritizes direct DB lookup
    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      console.log(`Login failed: User with email ${normalizedEmail} not found`);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    console.log(`User found: ${user.id}, comparing passwords`);
    
    // Verify the user data is complete
    if (!user.password) {
      console.error(`User ${user.id} has no password hash stored`);
      return res.status(500).json({
        success: false,
        message: "User account data is incomplete, please contact support"
      });
    }
    
    // Verifikasi password dengan bcrypt
    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, user.password);
      console.log(`Password match result: ${passwordMatch}`);
    } catch (error) {
      console.error(`Error comparing passwords for user ${user.id}:`, error);
      return res.status(500).json({
        success: false,
        message: "Authentication error, please try again"
      });
    }
    
    if (!passwordMatch) {
      console.log(`Login failed: Password mismatch for user ${user.id}`);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Cek apakah user sudah memiliki wallet
    let privateKey = '';
    let walletAddress = user.walletAddress;

    if (user.encryptedPrivateKey) {
      try {
        // Dekripsi private key untuk verifikasi password
        privateKey = decryptPrivateKey(user.encryptedPrivateKey, password);
      } catch (error) {
        console.error(`Error decrypting private key for user ${user.id}:`, error);
        return res.status(500).json({
          success: false,
          message: "Error retrieving wallet information"
        });
      }
    } else if (!walletAddress) {
      // Jika belum ada wallet, generate baru secara otomatis
      try {
        const keyPair = generateKeyPair();
        walletAddress = keyPair.getPublic("hex");
        privateKey = keyPair.getPrivate("hex");

        // Simpan di blockchain state
        await stateDB.put(
          walletAddress,
          JSON.stringify({
            address: walletAddress,
            balance: 0,
            userId: user.id
          })
        );

        // Update user
        user.walletAddress = walletAddress;
        user.encryptedPrivateKey = encryptPrivateKey(privateKey, password);
        user.updatedAt = Date.now();
        
        // Simpan perubahan ke database
        await saveUserToDb(user);
        console.log(`Generated new wallet for user ${user.id}`);
      } catch (error) {
        console.error(`Error generating wallet for user ${user.id}:`, error);
        return res.status(500).json({
          success: false,
          message: "Error generating wallet information"
        });
      }
    }

    // Generate JWT token using config secret
    const token = jwt.sign(
      { id: user.id, role: user.role, walletAddress },
      process.env.JWT_SECRET || jwtConfig.secret || 'default_secret_key',
      { expiresIn: '24h' }
    );

    // Update last login time
    user.updatedAt = Date.now();
    try {
      await saveUserToDb(user);
      console.log(`Updated last login time for user ${user.id}`);
    } catch (error) {
      // Not critical, just log
      console.error(`Failed to update last login time for user ${user.id}:`, error);
    }

    // Kirim respons
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          walletAddress
        },
        token,
        privateKey: privateKey || undefined // Hanya jika baru generate wallet
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during login"
    });
  }
};

/**
 * Mengambil private key (hanya dengan password)
 */
const getPrivateKey = async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const userId = req.user?.id;

    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        message: "Authentication and password required"
      });
    }

    // Cari user
    const user = await getUserById(userId);
    if (!user || !user.encryptedPrivateKey) {
      return res.status(404).json({
        success: false,
        message: "User or wallet not found"
      });
    }

    // Dekripsi private key
    try {
      const privateKey = decryptPrivateKey(user.encryptedPrivateKey, password);
      
      res.status(200).json({  
        success: true,
        data: {
          privateKey
        }
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    }
  } catch (error) {
    console.error("Error retrieving private key:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve private key"
    });
  }
};

const getUserList = async (_req: Request, res: Response) => {
  try {
    // Ambil semua data user dari database
    const allKeys = await txhashDB.keys().all();
    const userKeys = allKeys.filter(key => key.toString().startsWith('user:'));
    
    const userList = [];
    
    for (const key of userKeys) {
      try {
        const userData = await txhashDB.get(key);
        const user = JSON.parse(userData) as User;
        
        // Untuk keamanan, jangan tampilkan data sensitif
        const { password, encryptedPrivateKey, ...safeUser } = user;
        userList.push(safeUser);
      } catch (error) {
        console.error(`Error loading user from key ${key}:`, error);
      }
    }
    
    res.json({
      success: true,
      data: userList
    });
  } catch (error) {
    console.error("Error retrieving user list:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user list"
    });
  }
}

const getUser = async (req: Request, res: Response) => {
  const { address } = req.params

  try {
    // Coba ambil dari blockchain address
    const blockchainUser = await stateDB.get(address).then((data) => JSON.parse(data));
    
    // Cari user yang sesuai
    const user = await getUserById(blockchainUser.userId);
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Jangan tampilkan data sensitif
    const { password, encryptedPrivateKey, ...userInfo } = user;

    res.json({
      success: true,
      data: {
        ...userInfo,
        balance: blockchainUser.balance
      }
    });
  } catch (err) {
    res.status(404).json({
      success: false,
      message: "User not found",
    });
  }
}

/**
 * Link Google account dengan user yang sudah ada
 */
const linkGoogleAccount = async (req: Request, res: Response) => {
  const { email, password, googleId } = req.body;
  
  if (!email || !password || !googleId) {
    return res.status(400).json({
      success: false,
      message: "Email, password, and googleId are required"
    });
  }
  
  try {
    // Normalisasi email untuk konsistensi
    const normalizedEmail = email.toLowerCase().trim();
    
    // Cari user
    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }
    
    // Verifikasi password dengan bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }
    
    // Update dengan googleId
    user.googleId = googleId;
    user.updatedAt = Date.now();
    
    // Simpan perubahan
    await saveUserToDb(user);
    
    res.status(200).json({
      success: true,
      message: "Google account linked successfully"
    });
  } catch (error) {
    console.error("Error linking Google account:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while linking Google account"
    });
  }
};

/**
 * Login dengan Google (OAuth login)
 */
const googleLogin = async (req: Request, res: Response) => {
  try {
    // Jika menggunakan passport, req.user sudah ada
    if (req.user) {
      // Karena req.user dari middleware hanya memiliki id dan role,
      // kita perlu mencari user lengkap dari database untuk mendapatkan semua info
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Cari user lengkap dari database untuk mendapatkan semua info
      const fullUser = await getUserById(userId);
      if (!fullUser) {
        return res.status(404).json({
          success: false,
          message: "User not found in database"
        });
      }
      
      // Dekripsi private key untuk penggunaan satu kali
      let privateKey = '';
      try {
        // Karena login Google, kita perlu cara lain untuk mengakses privateKey
        // Dapatkan dari encryptedPrivateKey jika diperlukan (hanya untuk keperluan demo)
        // Di produksi, sebaiknya tidak mengembalikan privateKey kecuali diminta khusus
        const randomPassword = fullUser.id; // Menggunakan ID sebagai "password" untuk dekripsi
        if (fullUser.encryptedPrivateKey) {
          privateKey = decryptPrivateKey(fullUser.encryptedPrivateKey, randomPassword);
        }
      } catch (error) {
        // Gagal mendekripsi privateKey bukan error fatal
        console.error("Failed to decrypt private key during Google login:", error);
      }
      
      // Generate token using config secret
      const token = jwt.sign(
        { id: fullUser.id, role: fullUser.role, walletAddress: fullUser.walletAddress },
        process.env.JWT_SECRET || jwtConfig.secret || 'default_secret_key',
        { expiresIn: '24h' }
      );
      
      // Update last login time
      fullUser.updatedAt = Date.now();
      await saveUserToDb(fullUser);
      
      return res.status(200).json({
        success: true,
        message: "Google login successful",
        data: {
          user: {
            id: fullUser.id,
            email: fullUser.email,
            name: fullUser.name,
            role: fullUser.role,
            walletAddress: fullUser.walletAddress
          },
          token,
          privateKey: privateKey || undefined // Hanya jika bisa didekripsi
        }
      });
    }
    
    // Fallback untuk metode lama
    const { googleId } = req.body;
    
    if (!googleId) {
      return res.status(400).json({
        success: false,
        message: "Google ID is required"
      });
    }
    
    // Cari user dengan googleId
    const user = await getUserByGoogleId(googleId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account linked with this Google account"
      });
    }
    
    // Update last login time
    user.updatedAt = Date.now();
    await saveUserToDb(user);
    
    // Generate token using config secret
    const token = jwt.sign(
      { id: user.id, role: user.role, walletAddress: user.walletAddress },
      process.env.JWT_SECRET || jwtConfig.secret || 'default_secret_key',
      { expiresIn: '24h' }
    );
    
    res.status(200).json({
      success: true,
      message: "Google login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          walletAddress: user.walletAddress
        },
        token
      }
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during Google login"
    });
  }
};

/**
 * Memperbarui profil pengguna yang sedang login
 * Hanya atribut tertentu yang boleh diubah (name, phone, address, profilePicture)
 * Atribut penting seperti email, role, password tidak boleh diubah melalui fungsi ini
 */
const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Cari user dari database
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Define current time for timestamps
    const currentTime = Date.now();

    // Ambil data yang akan diupdate
    const { name, phone, address, profilePicture, email, role, password } = req.body;

    // Cek jika ada upaya mengubah atribut terlarang
    if (email !== undefined || role !== undefined || password !== undefined) {
      return res.status(403).json({
        success: false,
        message: "Email, role, dan password tidak dapat diubah melalui update profile. Harap gunakan endpoint yang sesuai untuk perubahan data sensitif"
      });
    }

    // Validasi bahwa ada setidaknya satu field yang boleh diubah
    if (name === undefined && phone === undefined && address === undefined && profilePicture === undefined) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada data yang diperbarui. Tentukan setidaknya satu field yang ingin diubah (name, phone, address, atau profilePicture)."
      });
    }

    // Untuk menyimpan histori perubahan
    const changedFields: string[] = [];
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    // Validasi nama jika disediakan
    if (name !== undefined) {
      if (!name || name.length < 3 || name.length > 50) {
        return res.status(400).json({
          success: false,
          message: "Nama harus antara 3-50 karakter"
        });
      }
      
      // Validasi nama hanya boleh huruf dan spasi
      const nameRegex = /^[a-zA-Z\s]*$/;
      if (!nameRegex.test(name)) {
        return res.status(400).json({
          success: false,
          message: "Nama hanya boleh berisi huruf dan spasi"
        });
      }
      
      if (name !== user.name) {
        changedFields.push('name');
        oldValues['name'] = user.name;
        newValues['name'] = name;
        user.name = name;
      }
    }

    // Validasi nomor telepon jika disediakan
    if (phone !== undefined) {
      // Validasi format nomor telepon
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (phone && !phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Format nomor telepon tidak valid (gunakan format +628xxx atau 08xxx)"
        });
      }
      
      if (phone !== user.phone) {
        changedFields.push('phone');
        oldValues['phone'] = user.phone;
        newValues['phone'] = phone;
        user.phone = phone;
      }
    }

    // Validasi alamat jika disediakan
    if (address !== undefined) {
      if (address && (address.length < 5 || address.length > 200)) {
        return res.status(400).json({
          success: false,
          message: "Alamat harus antara 5-200 karakter"
        });
      }
      
      if (address !== user.address) {
        changedFields.push('address');
        oldValues['address'] = user.address;
        newValues['address'] = address;
        user.address = address;
      }
    }

    // Validasi URL foto profil jika disediakan
    if (profilePicture !== undefined) {
      if (profilePicture) {
        try {
          new URL(profilePicture);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: "URL foto profil tidak valid"
          });
        }
      }
      
      if (profilePicture !== user.profilePicture) {
        changedFields.push('profilePicture');
        oldValues['profilePicture'] = user.profilePicture;
        newValues['profilePicture'] = profilePicture;
        user.profilePicture = profilePicture;
      }
    }

    // Jika tidak ada perubahan, kembalikan respons
    if (changedFields.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Tidak ada perubahan yang dilakukan pada profil",
        data: { 
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          walletAddress: user.walletAddress,
          phone: user.phone,
          address: user.address,
          profilePicture: user.profilePicture,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    }

    // Update timestamp
    user.updatedAt = currentTime;

    // Simpan perubahan ke database
    await saveUserToDb(user);

    // Simpan histori perubahan
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    await saveProfileChangeHistory({
      userId,
      timestamp: currentTime,
      changedFields,
      oldValues,
      newValues,
      ipAddress,
      userAgent
    });

    // Jangan tampilkan data sensitif dalam respons
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      walletAddress: user.walletAddress,
      phone: user.phone,
      address: user.address,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(200).json({
      success: true,
      message: "Profil berhasil diperbarui",
      data: userResponse
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user profile"
    });
  }
};

/**
 * Mengubah password pengguna
 */
const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Password lama dan baru diperlukan"
      });
    }

    // Validasi format password baru
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password baru harus minimal 8 karakter"
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password baru harus mengandung setidaknya satu huruf besar, satu huruf kecil, satu angka, dan satu karakter khusus"
      });
    }

    // Cari user dari database
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Verifikasi password lama menggunakan bcrypt
    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Password lama tidak valid"
      });
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Re-encrypt private key dengan password baru jika ada
    if (user.encryptedPrivateKey) {
      try {
        // Dekripsi dengan password lama
        const privateKey = decryptPrivateKey(user.encryptedPrivateKey, oldPassword);
        // Enkripsi ulang dengan password baru
        user.encryptedPrivateKey = encryptPrivateKey(privateKey, newPassword);
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: "Gagal mengenkripsi ulang private key"
        });
      }
    }

    // Update timestamp
    user.updatedAt = Date.now();

    // Simpan perubahan ke database
    await saveUserToDb(user);

    res.status(200).json({
      success: true,
      message: "Password berhasil diubah"
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password"
    });
  }
};

/**
 * Find or create a user based on Google profile
 */
const findOrCreateGoogleUser = async (profile: Profile): Promise<User | null> => {
  try {
    // Check if user exists with this Google ID
    let user = await getUserByGoogleId(profile.id);
    
    // If user exists, return it
    if (user) {
      return user;
    }
    
    // If not, check if email exists
    const email = profile.emails?.[0]?.value;
    if (!email) {
      console.error("Cannot create user: no email provided in Google profile");
      return null;
    }
    
    // Check if user exists with this email
    user = await getUserByEmail(email);
    
    // If user exists, link Google ID to existing account
    if (user) {
      user.googleId = profile.id;
      user.updatedAt = Date.now();
      await saveUserToDb(user);
      return user;
    }
    
    // At this point, this is a new user - but we don't create an account yet
    // Just return null and let the registration process handle it
    return null;
  } catch (error) {
    console.error("Error in findOrCreateGoogleUser:", error);
    return null;
  }
};

/**
 * Register a new user with Google account
 */
const registerWithGoogle = async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const googleProfile = (req.session as any).googleProfile;
    
    if (!googleProfile) {
      return res.status(400).json({
        success: false,
        message: "No Google profile found. Please authenticate with Google first."
      });
    }
    
    // Get profile information
    const googleId = googleProfile.id;
    const email = googleProfile.emails?.[0]?.value;
    const name = googleProfile.displayName || `${googleProfile.name?.givenName || ''} ${googleProfile.name?.familyName || ''}`.trim();
    const profilePicture = googleProfile.photos?.[0]?.value;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required but not provided by Google."
      });
    }
    
    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `Email ${email} is already registered. Please login instead.`
      });
    }
    
    // Create new user ID
    const userId = `${role.toUpperCase().substring(0, 4)}-${uuidv4().substring(0, 8)}`;
    
    // Generate a wallet
    const ec = new EC('secp256k1');
    const keyPair = ec.genKeyPair();
    const walletAddress = keyPair.getPublic('hex');
    const privateKey = keyPair.getPrivate('hex');
    
    // Generate a random password for the account (user can change later if needed)
    const temporaryPassword = uuidv4();
    const encryptedKey = encryptPrivateKey(privateKey, temporaryPassword);
    
    // Hash the temporary password before storing
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    
    // Save wallet in blockchain state
    await stateDB.put(
      walletAddress,
      JSON.stringify({
        address: walletAddress,
        balance: 0,
        userId: userId
      })
    );
    
    // Create and save the new user
    const timestamp = Date.now();
    const newUser: User = {
      id: userId,
      email: email.toLowerCase(),
      password: hashedPassword, // Store hashed temporary password
      name,
      role,
      walletAddress,
      encryptedPrivateKey: encryptedKey,
      googleId,
      profilePicture,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    await saveUserToDb(newUser);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET || jwtConfig.secret || 'default_secret_key',
      { expiresIn: '24h' }
    );
    
    // Clear the session data
    delete (req.session as any).googleProfile;
    
    // Return user data and token
    return res.status(201).json({
      success: true,
      message: "User registered successfully with Google account",
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          walletAddress: newUser.walletAddress,
          profilePicture: newUser.profilePicture
        },
        token,
        privateKey // IMPORTANT: Only show this once!
      }
    });
  } catch (error) {
    console.error("Error in registerWithGoogle:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during Google registration"
    });
  }
};

/**
 * Mendapatkan histori perubahan profil pengguna
 */
const getProfileChangeHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Cari user dari database untuk verifikasi
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Dapatkan histori perubahan profil
    const history = await fetchProfileChangeHistory(userId);
    
    // Hilangkan data sensitif seperti IP address dan user agent dari respons
    const safeHistory = history.map(item => {
      const { ipAddress, userAgent, ...safeItem } = item;
      return safeItem;
    });

    res.status(200).json({
      success: true,
      data: safeHistory
    });
  } catch (error) {
    console.error("Error retrieving profile change history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve profile change history"
    });
  }
};

export { 
  getUserList, 
  getUser, 
  register, 
  login, 
  getPrivateKey,
  linkGoogleAccount,
  googleLogin,
  updateUserProfile,
  changePassword,
  findOrCreateGoogleUser,
  registerWithGoogle,
  getProfileChangeHistory
}
