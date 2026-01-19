/**
 * Validation Middleware
 * 
 * Executes Zod validation on request body, params, and query
 * Per validation.mdc: Validation must run before controller logic
 * Uses validation schemas from @validations/*
 * 
 * @param {Object} schema - Zod schema object with body, params, query properties
 * @returns {Function} Express middleware function
 */

/**
 * Create validation middleware
 * 
 * @param {Object} schema - Validation schema with optional body, params, query properties
 * @param {Object} [schema.body] - Zod schema for request body
 * @param {Object} [schema.params] - Zod schema for URL parameters
 * @param {Object} [schema.query] - Zod schema for query parameters
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Validate body if schema provided
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      
      // Validate params if schema provided
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      
      // Validate query if schema provided
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      
      // All validations passed
      next();
    } catch (err) {
      // Zod validation errors are caught and passed to error middleware
      next(err);
    }
  };
};

module.exports = validate;

