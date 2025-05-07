import dotenv from 'dotenv';
dotenv.config();

// JWT Configuration - Disederhanakan untuk konsistensi
export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'default_secret_key',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h'
};

export * from "./appConfig"
export * from "./blockchainConfig"
export * from "./envConfig"
export * from "./swaggerConfig"
