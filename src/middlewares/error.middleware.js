/**
 * Error Middleware
 * 
 * Centralized error handler middleware per error-logging.mdc
 * Uses handleApiError to format and send error responses
 * Must be the last middleware in the Express app
 * 
 * Per error-logging.mdc:
 * - All errors must be passed to centralized error middleware
 * - Error middleware must use handleApiError internally
 * - Stack traces must not be returned to clients
 */

const { handleApiError } = require('@lib/errors');
const { logger } = require('@lib/logging');

/**
 * Error middleware
 * Catches all errors and passes them to handleApiError
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorMiddleware = (err, req, res, next) => {
  // Log error for debugging (sanitized)
  logger.error('Error caught by error middleware', {
    error: err.message,
    stack: err.stack, // Stack trace logged but not sent to client
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  // Pass error to centralized error handler
  handleApiError(err, req, res, next);
};

module.exports = errorMiddleware;

