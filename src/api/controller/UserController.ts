import type { Request, Response } from "express"
import { generateKeyPair } from "../../../utils/keypair"
import { stateDB } from "../../helper/level.db.client"
import jwt from 'jsonwebtoken'
import { UserRole } from "../../enum"
import { encryptPrivateKey, decryptPrivateKey } from "../../utils/encryption"
import { v4 as uuidv4 } from 'uuid'

import { ec as EC } from "elliptic"

// Temporary in-memory user database
// In production, use a real database
const users: {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  walletAddress: string;
  encryptedPrivateKey: string;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}[] = [
  // Default users for testing
  {
    id: 'FARM-123456',
    email: 'farmer@example.com',
    password: 'password123',
    name: 'Coco',
    role: UserRole.FARMER,
    walletAddress: '', // Will be filled on first login
    encryptedPrivateKey: '', // Will be filled on first login
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'COLL-123456',
    email: 'collector@example.com',
    password: 'password123',
    name: 'Jane Collector',
    role: UserRole.COLLECTOR,
    walletAddress: '',
    encryptedPrivateKey: '',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const generateWallet = async (req: Request, res: Response) => {
  try {
    // Pastikan ada user ID
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication required to generate wallet" 
      });
    }

  const existingKeys = await stateDB.keys().all()
  let keyPair: EC.KeyPair

  do {
    keyPair = generateKeyPair()
  } while (existingKeys.includes(keyPair.getPublic("hex")))

    const walletAddress = keyPair.getPublic("hex");
    const privateKey = keyPair.getPrivate("hex");

    // Simpan di blockchain state
  await stateDB.put(
      walletAddress,
    JSON.stringify({
        address: walletAddress,
      balance: 0,
        userId: userId
      })
    )

    // Dapatkan user dari database
    const user = users.find(u => u.id === userId);
    if (user) {
      // Pastikan memiliki password
      if (!req.body.password) {
        return res.status(400).json({
          success: false,
          message: "Password is required to encrypt private key"
        });
      }

      // Enkripsi private key dengan password user
      user.walletAddress = walletAddress;
      user.encryptedPrivateKey = encryptPrivateKey(privateKey, req.body.password);
      user.updatedAt = new Date();
    }

  res.status(201).json({
      success: true,
    data: {
        publicKey: walletAddress,
        privateKey: privateKey, // Hanya ditampilkan saat generate
      },
    })
  } catch (error) {
    console.error("Error generating wallet:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate wallet"
    });
  }
}

/**
 * Mendaftarkan user baru dengan role yang dipilih
 */
const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    // Validasi input
    if (!email || !password || !name || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, password, name, and role are required"
      });
    }

    // Validasi role
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
      });
    }

    // Cek apakah email sudah digunakan
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already in use"
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
    const newUser = {
      id: userId,
      email,
      password, // Dalam produksi, password harus di-hash!
      name,
      role,
      walletAddress,
      encryptedPrivateKey: encryptedKey,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    users.push(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, role, walletAddress },
      process.env.JWT_SECRET || 'default_secret_key',
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

    // Validasi input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Cari user berdasarkan email
    const user = users.find(user => user.email === email);
    if (!user || user.password !== password) { // Dalam produksi, verifikasi hash!
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
        return res.status(401).json({
          success: false,
          message: "Invalid password"
        });
      }
    } else if (!walletAddress) {
      // Jika belum ada wallet, generate baru secara otomatis
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
      user.updatedAt = new Date();
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role, walletAddress },
      process.env.JWT_SECRET || 'default_secret_key',
      { expiresIn: '24h' }
    );

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
    const user = users.find(u => u.id === userId);
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
  // Untuk keamanan, jangan tampilkan encryptedPrivateKey
  const userList = users.map(({ encryptedPrivateKey, password, ...rest }) => rest);

  res.json({
    success: true,
    data: {
      users: userList,
    },
  });
}

const getUser = async (req: Request, res: Response) => {
  const { address } = req.params

  try {
    // Coba ambil dari blockchain address
    const blockchainUser = await stateDB.get(address).then((data) => JSON.parse(data));
    
    // Cari user yang sesuai
    const user = users.find(u => u.id === blockchainUser.userId);
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Jangan tampilkan data sensitif
    const { password, encryptedPrivateKey, ...userInfo } = user;

    res.json({
      success: true,
      data: {
        user: {
          ...userInfo,
          balance: blockchainUser.balance
        },
      },
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
  
  // Cari user
  const user = users.find(u => u.email === email);
  if (!user || user.password !== password) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password"
    });
  }
  
  // Update dengan googleId
  user.googleId = googleId;
  user.updatedAt = new Date();
  
  res.status(200).json({
    success: true,
    message: "Google account linked successfully"
  });
};

/**
 * Login dengan Google (simulasi, perlu OAuth implementation sebenarnya)
 */
const googleLogin = async (req: Request, res: Response) => {
  const { googleId } = req.body;
  
  if (!googleId) {
    return res.status(400).json({
      success: false,
      message: "Google ID is required"
    });
  }
  
  // Cari user dengan googleId
  const user = users.find(u => u.googleId === googleId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "No account linked with this Google account"
    });
  }
  
  // Generate token
  const token = jwt.sign(
    { id: user.id, role: user.role, walletAddress: user.walletAddress },
    process.env.JWT_SECRET || 'default_secret_key',
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
};

export { 
  generateWallet, 
  getUserList, 
  getUser, 
  register, 
  login, 
  getPrivateKey,
  linkGoogleAccount,
  googleLogin
}
