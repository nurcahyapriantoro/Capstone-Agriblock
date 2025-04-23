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
        // Add other user properties as needed
      };
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Extract and verify token
    const token = authHeader.split(' ')[1];
    
    // Make sure the secret exists
    const secret = jwtConfig.secret || 'fallback_secret_for_dev';
    
    // Verify token with enhanced options
    const decoded = jwt.verify(token, secret, {
      algorithms: [jwtConfig.algorithm as jwt.Algorithm],
      issuer: jwtConfig.issuer
    });
    
    // Add user data to request object, safely type cast
    const payload = decoded as jwt.JwtPayload;
    req.user = {
      id: payload.id as string,
      role: payload.role as string
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
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
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
 * Alias for the authentication middleware (used in different parts of the codebase)
 */
export const authenticateJWT = isAuthenticated; 