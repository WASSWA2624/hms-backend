/**
 * CORS Configuration
 * 
 * CORS configuration per cors.mdc
 * Reads CORS_ORIGINS from @config/env
 * Environment-aware origins (different for dev/staging/production)
 */

const { CORS_ORIGINS, NODE_ENV } = require('@config/env');
const { HttpError } = require('@lib/errors');
const { logger } = require('@lib/logging');

/**
 * Get CORS configuration
 * 
 * @returns {Object} CORS middleware options
 */
const getCorsConfig = () => {
  // In development, allow localhost origins
  // In production, only allow explicitly configured origins
  const baseOrigins = Array.isArray(CORS_ORIGINS) ? CORS_ORIGINS : [];
  const origins = NODE_ENV === 'development'
    ? Array.from(new Set([...baseOrigins, 'http://localhost:3000', 'http://localhost:3001']))
    : baseOrigins;

  // Never use wildcard with credentials; require explicit origins
  const allowedOrigins = origins.filter(Boolean);
  
  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS origin denied', { origin });
        callback(new HttpError('errors.cors.forbidden', 403));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token'
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset'
    ],
    maxAge: 86400 // 24 hours
  };
};

module.exports = {
  getCorsConfig,
  corsOptions: getCorsConfig()
};

