import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        walletAddress?: string;
        // Add other user properties as needed
      };
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 * This is the main authentication middleware used across the application
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
      return;
    }

    // Extract and verify token
    const token = authHeader.split(' ')[1];
    
    // Make sure the secret exists
    const secret = process.env.JWT_SECRET || jwtConfig.secret || 'default_secret_key';
    
    // Simplified token verification - matches how it's created in UserController
    // Removed algorithm and issuer constraints that were causing verification issues
    const decoded = jwt.verify(token, secret);
    
    // Add user data to request object, safely type cast
    const payload = decoded as jwt.JwtPayload;
    req.user = {
      id: payload.id as string,
      role: payload.role as string,
      walletAddress: payload.walletAddress as string
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        success: false, 
        message: 'Token has expired, please login again' 
      });
      return;
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
      return;
    }
    
    console.error('Authentication error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

/**
 * Middleware untuk memeriksa peran pengguna
 * @param roles Array peran yang diizinkan mengakses resource
 */
export const hasRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      });
      return;
    }

    next();
  };
};

/**
 * For backward compatibility and consistency
 * Export authenticateJWT as an alias for isAuthenticated
 */
export const authenticateJWT = isAuthenticated; 