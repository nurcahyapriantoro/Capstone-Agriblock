import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to track product views for analytics
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export const trackProductView = async (req: Request, res: Response, next: NextFunction) => {
  // Get productId from request params or query
  const productId = req.params.productId || req.query.productId as string;
  
  // If no productId, skip tracking
  if (!productId) {
    return next();
  }
  
  try {
    // Import ProductAnalyticsService dynamically to avoid circular dependencies
    const ProductAnalyticsService = (await import('../services/ProductAnalyticsService')).default;
    
    // Get user ID from authenticated user if available
    const userId = req.user?.id;
    
    // Get IP address from request
    const ip = 
      req.headers['x-forwarded-for'] as string || 
      req.socket.remoteAddress || 
      'unknown';
      
    // Get user agent
    const userAgent = req.headers['user-agent'];
    
    // Record the view asynchronously - don't wait for it to complete
    ProductAnalyticsService.recordView(
      productId, 
      userId, 
      ip,
      userAgent
    ).catch(error => {
      console.error(`Error recording product view for ${productId}:`, error);
    });
    
    // Continue with the request
    next();
  } catch (error) {
    // Log the error but don't fail the request
    console.error('Error in product view tracking middleware:', error);
    next();
  }
};

/**
 * Middleware to track product transactions for analytics
 * @param req Express request
 * @param res Express response
 * @param next Next function
 */
export const trackProductTransaction = async (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  // Get productId from request params, body or query
  const productId = 
    req.params.productId || 
    (req.body && req.body.productId) || 
    req.query.productId as string;
  
  // If no productId, skip tracking
  if (!productId) {
    return next();
  }
  
  // Override the send method to capture the response
  res.send = function(body) {
    // Restore original send method
    res.send = originalSend;
    
    // Check if the response is successful
    let isSuccess = false;
    try {
      const data = JSON.parse(body);
      isSuccess = data.success === true;
    } catch {
      isSuccess = res.statusCode >= 200 && res.statusCode < 300;
    }
    
    // If the response is successful, record the transaction
    if (isSuccess) {
      // Import ProductAnalyticsService dynamically
      import('../services/ProductAnalyticsService')
        .then(({ default: ProductAnalyticsService }) => {
          // Record the transaction asynchronously
          ProductAnalyticsService.recordTransaction(productId)
            .catch(error => {
              console.error(`Error recording product transaction for ${productId}:`, error);
            });
        })
        .catch(error => {
          console.error('Error importing ProductAnalyticsService:', error);
        });
    }
    
    // Call the original send method
    return originalSend.call(res, body);
  };
  
  next();
}; 