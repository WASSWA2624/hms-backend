/**
 * Logger Utility
 * 
 * Writes logs to daily log files per error-logging.mdc
 * All logs are sanitized to prevent sensitive data leakage
 * Log levels: info, warn, error
 * 
 * Logs are written to: logs/YYYY-MM-DD.txt
 */

const fs = require('fs');
const path = require('path');
const { sanitize } = require('@lib/logging/sanitize');

// Ensure logs directory exists (per project-structure.mdc: logs/)
const LOGS_DIR = path.join(process.cwd(), 'logs');

/**
 * Ensure logs directory exists
 */
const ensureLogsDirectory = () => {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
};

/**
 * Get today's log file path
 * 
 * @returns {string} Path to today's log file
 */
const getLogFilePath = () => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(LOGS_DIR, `${dateStr}.txt`);
};

/**
 * Format log entry with timestamp and level
 * 
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {any} [data] - Optional data to include
 * @returns {string} Formatted log entry
 */
const formatLogEntry = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase().padEnd(5);
  
  let logLine = `[${timestamp}] [${levelUpper}] ${message}`;
  
  if (data !== null && data !== undefined) {
    // Sanitize data before logging
    const sanitizedData = sanitize(data);
    try {
      const dataStr = typeof sanitizedData === 'string' 
        ? sanitizedData 
        : JSON.stringify(sanitizedData, null, 2);
      logLine += `\n${dataStr}`;
    } catch (err) {
      // If JSON.stringify fails, just log as string
      logLine += `\n${String(sanitizedData)}`;
    }
  }
  
  return logLine + '\n';
};

/**
 * Write log entry to file
 * 
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {any} [data] - Optional data
 */
const writeLog = (level, message, data = null) => {
  try {
    ensureLogsDirectory();
    const logFilePath = getLogFilePath();
    const logEntry = formatLogEntry(level, message, data);
    
    // Append to log file (create if doesn't exist)
    fs.appendFileSync(logFilePath, logEntry, 'utf8');
  } catch (err) {
    // If logging fails, write to console as fallback
    // This prevents logging errors from crashing the application
    console.error('Failed to write log:', err.message);
    console.error(`[${level.toUpperCase()}] ${message}`, data);
  }
};

/**
 * Log info message
 * 
 * @param {string} message - Log message
 * @param {any} [data] - Optional data
 */
const info = (message, data = null) => {
  writeLog('info', message, data);
};

/**
 * Log warning message
 * 
 * @param {string} message - Log message
 * @param {any} [data] - Optional data
 */
const warn = (message, data = null) => {
  writeLog('warn', message, data);
};

/**
 * Log error message
 * 
 * @param {string} message - Log message
 * @param {any} [data] - Optional data (error object, etc.)
 */
const error = (message, data = null) => {
  writeLog('error', message, data);
};

module.exports = {
  info,
  warn,
  error
};

