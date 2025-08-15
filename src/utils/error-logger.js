import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { format } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGS_DIR = path.join(process.cwd(), 'logs');
const ERROR_LOG_FILE = path.join(LOGS_DIR, 'error.log');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * Logs an error with timestamp and stack trace to both console and file
 * @param {Error} error - The error object to log
 * @param {string} [context=''] - Additional context about where the error occurred
 */
export function logError(error, context = '') {
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] ${context ? `[${context}] ` : ''}${error.message}\n${error.stack || 'No stack trace available'}\n\n`;
  
  // Log to console with color
  console.error('\x1b[31m', `[ERROR] ${context ? `[${context}] ` : ''}${error.message}`, '\x1b[0m');
  
  // Log to file
  fs.appendFileSync(ERROR_LOG_FILE, errorMessage, 'utf8');
}

/**
 * Wraps an async function with error handling
 * @param {Function} fn - The async function to wrap
 * @param {string} [context=''] - Context for error messages
 * @returns {Function} Wrapped function with error handling
 */
export function withErrorHandling(fn, context = '') {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      logError(error, context || fn.name);
      throw error; // Re-throw to allow further handling if needed
    }
  };
}

/**
 * Gets recent error logs
 * @param {number} [lines=50] - Number of lines to return
 * @returns {string} Recent error logs
 */
export function getRecentErrorLogs(lines = 50) {
  try {
    if (!fs.existsSync(ERROR_LOG_FILE)) {
      return 'No error logs found.';
    }
    
    const logContent = fs.readFileSync(ERROR_LOG_FILE, 'utf8');
    const logLines = logContent.split('\n').filter(line => line.trim());
    return logLines.slice(-lines).join('\n');
  } catch (error) {
    console.error('Error reading error logs:', error);
    return 'Failed to read error logs.';
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logError(error, 'uncaughtException');
  // Don't exit the process, let it continue running
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logError(error, 'unhandledRejection');
});
