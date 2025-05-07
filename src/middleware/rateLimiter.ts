import { Request, Response, NextFunction } from 'express';

// Simple in-memory store for request counts
// In production, use Redis or another distributed store
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const ipLimiter: RateLimitStore = {};
const userLimiter: RateLimitStore = {};
const authLimiter: RateLimitStore = {};

// Configuration for different rate limits
const RATE_LIMIT_CONFIGS = {
  // General API rate limit (100 requests per 10 minutes)
  api: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 100,
    message: 'Too many requests, please try again later.'
  },
  
  // Authentication rate limit (disabled - was 5 attempts per 15 minutes)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000000, // Setting to a very high number effectively disables the limit
    message: 'Too many login attempts, please try again later.'
  },
  
  // Product creation rate limit (10 products per hour)
  productCreation: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'Product creation limit reached. Please try again later.'
  },
  
  // Transaction creation rate limit (20 transactions per hour)
  transaction: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    message: 'Transaction limit reached. Please try again later.'
  }
};

/**
 * Get rate limiter key based on request
 * @param req Express request
 * @param type Type of rate limit
 * @returns Unique key for rate limiting
 */
function getRateLimitKey(req: Request, type: 'api' | 'auth' | 'productCreation' | 'transaction'): string {
  // For auth requests, use IP address
  if (type === 'auth') {
    return `${type}:${req.ip}`;
  }
  
  // For other requests, use user ID if authenticated, otherwise IP
  const userId = req.user?.id || req.ip;
  return `${type}:${userId}`;
}

/**
 * Check if request exceeds rate limit
 * @param store Rate limit store
 * @param key Unique identifier
 * @param config Rate limit configuration
 * @returns Whether request exceeds limit
 */
function exceedsRateLimit(
  store: RateLimitStore,
  key: string,
  config: { windowMs: number; maxRequests: number }
): boolean {
  const now = Date.now();
  
  // Initialize or reset if window expired
  if (!store[key] || now > store[key].resetTime) {
    store[key] = {
      count: 0,
      resetTime: now + config.windowMs
    };
  }
  
  // Increment request count
  store[key].count++;
  
  // Check if over limit
  return store[key].count > config.maxRequests;
}

/**
 * Middleware for general API rate limiting
 */
export const apiRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const key = getRateLimitKey(req, 'api');
  
  if (exceedsRateLimit(ipLimiter, key, RATE_LIMIT_CONFIGS.api)) {
    return res.status(429).json({
      success: false,
      message: RATE_LIMIT_CONFIGS.api.message
    });
  }
  
  next();
};

/**
 * Middleware for authentication rate limiting
 */
export const authRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const key = getRateLimitKey(req, 'auth');
  
  if (exceedsRateLimit(authLimiter, key, RATE_LIMIT_CONFIGS.auth)) {
    return res.status(429).json({
      success: false,
      message: RATE_LIMIT_CONFIGS.auth.message
    });
  }
  
  next();
};

/**
 * Middleware for product creation rate limiting
 */
export const productCreationRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const key = getRateLimitKey(req, 'productCreation');
  
  if (exceedsRateLimit(userLimiter, key, RATE_LIMIT_CONFIGS.productCreation)) {
    return res.status(429).json({
      success: false,
      message: RATE_LIMIT_CONFIGS.productCreation.message
    });
  }
  
  next();
};

/**
 * Middleware for transaction rate limiting
 */
export const transactionRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const key = getRateLimitKey(req, 'transaction');
  
  if (exceedsRateLimit(userLimiter, key, RATE_LIMIT_CONFIGS.transaction)) {
    return res.status(429).json({
      success: false,
      message: RATE_LIMIT_CONFIGS.transaction.message
    });
  }
  
  next();
};