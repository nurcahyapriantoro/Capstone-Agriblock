import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Pastikan direktori log ada
const logDir = path.join(process.cwd(), 'log');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Format untuk console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Format untuk file output (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'agrichain-service' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Helper methods for logging transactions
const logTransaction = (txType: string, txData: any) => {
  logger.info(`Transaction [${txType}] created`, {
    transactionType: txType,
    data: txData
  });
};

const logBlockCreation = (blockData: any) => {
  logger.info(`Block created`, {
    blockNumber: blockData.number,
    transactions: blockData.data ? blockData.data.length : 0,
    hash: blockData.hash
  });
};

// Utility function for logging API requests
const logAPIRequest = (req: any, res: any, responseTime: number) => {
  logger.info(`${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    userId: req.user?.id || 'unauthenticated'
  });
};

// Export the logger
export { 
  logger, 
  logTransaction, 
  logBlockCreation,
  logAPIRequest
}; 