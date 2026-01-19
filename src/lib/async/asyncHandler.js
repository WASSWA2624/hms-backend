/**
 * Async Handler Utility
 * 
 * Wraps async route handlers to catch errors and pass them to error middleware
 * Per coding-standards.mdc: All async logic must use try/catch
 * This utility eliminates the need for try/catch blocks in every route handler
 * 
 * Usage:
 *   router.get('/users', asyncHandler(async (req, res) => {
 *     const users = await userService.findAll();
 *     sendSuccess(res, 200, 'Users retrieved', users);
 *   }));
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler that catches errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    // Wrap the async function in a Promise
    // If the function returns a Promise, resolve it
    // If it throws an error, catch it and pass to error middleware
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = { asyncHandler };

