/**
 * Express App Initialization
 * 
 * Express app setup with all required middlewares per architecture.mdc
 * Middleware order:
 * 1. Security headers
 * 2. CORS (handles preflight requests)
 * 3. JSON parser
 * 4. i18n locale detection
 * 5. Rate limit
 * 6. API versioning/deprecation headers
 * 7. CSRF protection
 * 8. Performance monitoring
 * 9. Routes (mounted from router)
 * 10. Error middleware (must be last)
 * 
 * Per architecture.mdc: Express.js is the only HTTP framework allowed
 */

const express = require('express');
const cors = require('cors');
const { getCorsConfig } = require('@config/cors');
const securityHeaders = require('@middlewares/security.middleware');
const csrfMiddleware = require('@middlewares/csrf.middleware');
const i18nMiddleware = require('@middlewares/i18n.middleware');
const { defaultRateLimit } = require('@middlewares/rateLimit.middleware');
const versioningMiddleware = require('@middlewares/versioning.middleware');
const performanceMiddleware = require('@middlewares/performance.middleware');
const errorMiddleware = require('@middlewares/error.middleware');

// Import root router (created in Step 1.31)
const router = require('@app/router');

/**
 * Create and configure Express application
 * 
 * @returns {Object} Configured Express app
 */
const createApp = () => {
  const app = express();
  
  try {
    // 1. Security headers middleware
    app.use(securityHeaders());

    // 2. CORS middleware (handles preflight requests)
    // Call getCorsConfig() to ensure fresh closure with current environment values
    app.use(cors(getCorsConfig()));
    
    // 3. JSON parser middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // 4. i18n locale detection middleware
    app.use(i18nMiddleware());

    // 5. Rate limit middleware (before routes)
    app.use(defaultRateLimit());

    // 6. API versioning/deprecation headers
    app.use(versioningMiddleware());
    
    // 7. CSRF middleware for state-changing routes
    app.use(csrfMiddleware());

    // 8. Performance monitoring middleware (before routes)
    app.use(performanceMiddleware());
    
    // 9. Routes (mounted from router)
    // Router will mount all module routes under /api/v1/ in Step 1.31
    app.use(router);
    
    // 10. Error middleware (must be last - catches all errors)
    app.use(errorMiddleware);
  } catch (err) {
    throw err;
  }
  
  return app;
};

module.exports = createApp;

