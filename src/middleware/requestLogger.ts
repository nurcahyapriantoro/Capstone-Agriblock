import { Request, Response, NextFunction } from 'express';
import { logger, logAPIRequest } from '../utils/logger';

/**
 * Middleware untuk logging request API dengan waktu respons
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Catat waktu mulai request
  const start = Date.now();
  
  // Listener untuk logging setelah respons dikirim
  res.on('finish', () => {
    const duration = Date.now() - start;
    logAPIRequest(req, res, duration);
  });
  
  next();
};

/**
 * Middleware untuk logging error
 */
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  logger.error(`Error processing request: ${err.message}`, {
    method: req.method,
    url: req.url,
    error: err.stack,
    userId: req.user?.id || 'unauthenticated'
  });
  
  next(err);
}; 