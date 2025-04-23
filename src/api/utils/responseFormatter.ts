import { Response } from 'express';

/**
 * Standard API response formatter to ensure consistency across all controllers
 */
export class ApiResponse {
  /**
   * Send a success response
   * @param res Express response object
   * @param data Data to include in the response
   * @param message Optional success message
   * @param statusCode HTTP status code (default: 200)
   */
  static success(
    res: Response, 
    data: any = null, 
    message: string = 'Operation successful', 
    statusCode: number = 200
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Send an error response
   * @param res Express response object
   * @param message Error message
   * @param statusCode HTTP status code (default: 400)
   * @param errors Additional error details
   */
  static error(
    res: Response, 
    message: string = 'Operation failed', 
    statusCode: number = 400,
    errors: any = null
  ): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      errors
    });
  }

  /**
   * Send a not found response
   * @param res Express response object
   * @param message Not found message
   */
  static notFound(
    res: Response, 
    message: string = 'Resource not found'
  ): Response {
    return res.status(404).json({
      success: false,
      message
    });
  }

  /**
   * Send an unauthorized response
   * @param res Express response object
   * @param message Unauthorized message
   */
  static unauthorized(
    res: Response, 
    message: string = 'Unauthorized access'
  ): Response {
    return res.status(401).json({
      success: false,
      message
    });
  }

  /**
   * Send a forbidden response
   * @param res Express response object
   * @param message Forbidden message
   */
  static forbidden(
    res: Response, 
    message: string = 'Forbidden access'
  ): Response {
    return res.status(403).json({
      success: false,
      message
    });
  }

  /**
   * Send a server error response
   * @param res Express response object
   * @param message Server error message
   * @param error Original error object
   */
  static serverError(
    res: Response, 
    message: string = 'Internal server error',
    error: any = null
  ): Response {
    // Log the error for debugging
    console.error('Server Error:', error);
    
    return res.status(500).json({
      success: false,
      message
    });
  }
} 