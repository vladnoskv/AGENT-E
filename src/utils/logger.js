import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure logs directory exists
const logsDir = join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    targets: [
      {
        target: 'pino-pretty',
        level: 'trace',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
      {
        target: 'pino/file',
        level: 'debug',
        options: {
          destination: join(logsDir, 'agentx.log'),
          mkdir: true,
        },
      },
    ],
  },
});

// Add request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    }, 'Request processed');
  });
  
  next();
};

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  logger.error({
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      name: err.name,
      code: err.code,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
    },
  }, 'Request error');
  
  res.status(statusCode).json({
    error: {
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

// Export the logger instance
export { logger };

// Log uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught Exception');
  // Don't exit immediately, allow the process to continue if possible
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ error: reason, promise }, 'Unhandled Rejection');
  // Don't exit immediately, allow the process to continue if possible
});
