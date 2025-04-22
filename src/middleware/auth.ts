import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key');
    
    // Log untuk debugging
    console.log('JWT Payload:', decoded);
    
    // Add user data to request object
    req.user = decoded as { id: string; role: string };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Alias for the authentication middleware (used in different parts of the codebase)
 */
export const authenticateJWT = isAuthenticated; 