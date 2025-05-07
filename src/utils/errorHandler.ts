import { Response } from 'express';

/**
 * Error codes for common application errors
 * Use these to create consistent error responses
 */
export enum ErrorCode {
  // General errors
  GENERAL_ERROR = 'GENERAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  CONFLICT = 'CONFLICT',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // Product errors
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  PRODUCT_CREATE_FAILED = 'PRODUCT_CREATE_FAILED',
  PRODUCT_UPDATE_FAILED = 'PRODUCT_UPDATE_FAILED',
  PRODUCT_TRANSFER_FAILED = 'PRODUCT_TRANSFER_FAILED',
  PRODUCT_IMAGE_UPLOAD_FAILED = 'PRODUCT_IMAGE_UPLOAD_FAILED',
  INVALID_PRODUCT_DATA = 'INVALID_PRODUCT_DATA',
  PRODUCT_ALREADY_RECALLED = 'PRODUCT_ALREADY_RECALLED',
  PRODUCT_OUT_OF_STOCK = 'PRODUCT_OUT_OF_STOCK',

  // User errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_CREATE_FAILED = 'USER_CREATE_FAILED',
  USER_UPDATE_FAILED = 'USER_UPDATE_FAILED',
  INVALID_USER_ROLE = 'INVALID_USER_ROLE',
  UNAUTHORIZED_ROLE = 'UNAUTHORIZED_ROLE',

  // Authentication errors
  AUTH_FAILED = 'AUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Database errors
  DB_ERROR = 'DB_ERROR',
  QUERY_FAILED = 'QUERY_FAILED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',

  // Blockchain errors
  BLOCKCHAIN_ERROR = 'BLOCKCHAIN_ERROR',
  TRANSACTION_VERIFICATION_FAILED = 'TRANSACTION_VERIFICATION_FAILED',
  CHAIN_VALIDATION_FAILED = 'CHAIN_VALIDATION_FAILED',

  // File/upload errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  TOO_MANY_FILES = 'TOO_MANY_FILES',

  // Batch operation errors
  BATCH_JOB_FAILED = 'BATCH_JOB_FAILED',
  BATCH_JOB_NOT_FOUND = 'BATCH_JOB_NOT_FOUND'
}

/**
 * Maps error codes to HTTP status codes
 */
export const HTTP_STATUS_CODES: Record<ErrorCode, number> = {
  // General errors
  [ErrorCode.GENERAL_ERROR]: 500,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.TOO_MANY_REQUESTS]: 429,

  // Product errors
  [ErrorCode.PRODUCT_NOT_FOUND]: 404,
  [ErrorCode.PRODUCT_CREATE_FAILED]: 400,
  [ErrorCode.PRODUCT_UPDATE_FAILED]: 400,
  [ErrorCode.PRODUCT_TRANSFER_FAILED]: 400,
  [ErrorCode.PRODUCT_IMAGE_UPLOAD_FAILED]: 400,
  [ErrorCode.INVALID_PRODUCT_DATA]: 400,
  [ErrorCode.PRODUCT_ALREADY_RECALLED]: 400,
  [ErrorCode.PRODUCT_OUT_OF_STOCK]: 400,

  // User errors
  [ErrorCode.USER_NOT_FOUND]: 404,
  [ErrorCode.USER_CREATE_FAILED]: 400,
  [ErrorCode.USER_UPDATE_FAILED]: 400,
  [ErrorCode.INVALID_USER_ROLE]: 400,
  [ErrorCode.UNAUTHORIZED_ROLE]: 403,

  // Authentication errors
  [ErrorCode.AUTH_FAILED]: 401,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.INVALID_CREDENTIALS]: 401,

  // Database errors
  [ErrorCode.DB_ERROR]: 500,
  [ErrorCode.QUERY_FAILED]: 500,
  [ErrorCode.TRANSACTION_FAILED]: 500,

  // Blockchain errors
  [ErrorCode.BLOCKCHAIN_ERROR]: 500,
  [ErrorCode.TRANSACTION_VERIFICATION_FAILED]: 400,
  [ErrorCode.CHAIN_VALIDATION_FAILED]: 500,

  // File/upload errors
  [ErrorCode.FILE_TOO_LARGE]: 413,
  [ErrorCode.INVALID_FILE_TYPE]: 400,
  [ErrorCode.FILE_UPLOAD_FAILED]: 500,
  [ErrorCode.TOO_MANY_FILES]: 400,

  // Batch operation errors
  [ErrorCode.BATCH_JOB_FAILED]: 500,
  [ErrorCode.BATCH_JOB_NOT_FOUND]: 404
};

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    timestamp: number;
    path?: string;
  };
}

/**
 * Application error class
 */
export class AppError extends Error {
  code: ErrorCode;
  details?: any;
  path?: string;

  constructor(code: ErrorCode, message: string, details?: any, path?: string) {
    super(message);
    this.code = code;
    this.details = details;
    this.path = path;
    
    // Ensures that instanceof works correctly
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Creates a structured error response
   */
  toResponse(): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: Date.now(),
        path: this.path
      }
    };
  }
}

/**
 * Sends a standardized error response
 * @param res Express response object
 * @param error AppError or ErrorCode
 * @param message Optional message (required if error is an ErrorCode)
 * @param details Optional details
 * @param path Optional path
 */
export function sendErrorResponse(
  res: Response,
  error: AppError | ErrorCode,
  message?: string,
  details?: any,
  path?: string
): void {
  if (error instanceof AppError) {
    const statusCode = HTTP_STATUS_CODES[error.code] || 500;
    res.status(statusCode).json(error.toResponse());
  } else {
    const appError = new AppError(
      error,
      message || 'An error occurred',
      details,
      path
    );
    const statusCode = HTTP_STATUS_CODES[error] || 500;
    res.status(statusCode).json(appError.toResponse());
  }
}

/**
 * Global error handler middleware
 */
export function globalErrorHandler(err: any, req: any, res: Response, next: any): void {
  console.error('Global error handler caught:', err);
  
  if (err instanceof AppError) {
    sendErrorResponse(res, err);
  } else {
    // Log unexpected errors
    console.error('Unexpected error:', err);
    
    // Create a generic server error
    const appError = new AppError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? {
        message: err.message,
        stack: err.stack
      } : undefined,
      req.path
    );
    
    sendErrorResponse(res, appError);
  }
}

/**
 * Create and throw an AppError
 * @param code Error code
 * @param message Error message
 * @param details Optional details
 * @param path Optional path
 * @throws AppError
 */
export function throwError(code: ErrorCode, message: string, details?: any, path?: string): never {
  throw new AppError(code, message, details, path);
}

/**
 * Assert a condition, throwing an AppError if it fails
 * @param condition Condition to assert
 * @param code Error code to use if condition fails
 * @param message Error message to use if condition fails
 * @param details Optional details to include in error
 * @param path Optional path to include in error
 * @throws AppError if condition is false
 */
export function assertOrThrow(
  condition: any,
  code: ErrorCode,
  message: string,
  details?: any,
  path?: string
): void {
  if (!condition) {
    throwError(code, message, details, path);
  }
} 