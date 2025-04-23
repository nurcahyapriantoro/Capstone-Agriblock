import dotenv from 'dotenv';
import crypto from 'crypto';

// Pastikan environment variables sudah dimuat
dotenv.config();

// Generate secret yang aman
let jwtSecret: string;

if (process.env.JWT_SECRET) {
  jwtSecret = process.env.JWT_SECRET;
} else {
  // Fallback untuk development only
  console.warn('WARNING: JWT_SECRET not found in environment variables. Using a random string for development only!');
  console.warn('This is NOT secure for production environments.');
  jwtSecret = crypto.randomBytes(64).toString('hex');
}

// Pastikan nilai algoritma yang valid
const validAlgorithms = ['HS256', 'HS384', 'HS512', 'RS256'];
const jwtAlgorithm = process.env.JWT_ALGORITHM && validAlgorithms.includes(process.env.JWT_ALGORITHM)
  ? process.env.JWT_ALGORITHM
  : 'HS256';

export const jwtConfig = {
  // Tidak akan pernah undefined
  secret: jwtSecret,
  // Token berlaku 24 jam (production)
  expiresIn: process.env.NODE_ENV === 'production' ? '24h' : '7d',
  // Token refresh berlaku 30 hari (production)
  refreshExpiresIn: process.env.NODE_ENV === 'production' ? '30d' : '90d',
  // Algorithm untuk JWT
  algorithm: jwtAlgorithm,
  // Issuer untuk validasi tambahan
  issuer: 'agrichain-api'
}; 