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
  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8081',
    'http://127.0.0.1:8081'
  ];
  
  const origins = NODE_ENV === 'development'
    ? Array.from(new Set([...baseOrigins, ...devOrigins]))
    : baseOrigins;

  // Never use wildcard with credentials; require explicit origins
  const allowedOrigins = origins.filter(Boolean);

  if (NODE_ENV === 'development') {
    logger.info('CORS configuration initialized', { 
      origins: allowedOrigins,
      baseOrigins,
      nodeEnv: NODE_ENV
    });
  }
  
  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        if (NODE_ENV === 'development') {
          logger.info('CORS: No origin header, allowing request');
        }
        return callback(null, true);
      }
      
      // Normalize origin (remove trailing slash if present)
      const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
      
      // Check if origin is in allowed list (check both original and normalized)
      const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes(normalizedOrigin);
      
      if (isAllowed) {
        if (NODE_ENV === 'development') {
          logger.info('CORS origin allowed', { origin, normalizedOrigin });
        }
        callback(null, true);
      } else {
        logger.warn('CORS origin denied', { 
          origin, 
          normalizedOrigin,
          allowedOrigins,
          originInList: allowedOrigins.includes(origin),
          normalizedInList: allowedOrigins.includes(normalizedOrigin),
          baseOrigins,
          nodeEnv: NODE_ENV
        });
        // CORS middleware expects Error object, not HttpError
        const corsError = new Error('CORS: Origin not allowed');
        corsError.statusCode = 403;
        callback(corsError);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'Accept-Language',
      'X-Locale',
      'X-Timezone',
      'X-Platform',
      'Sec-CH-UA',
      'Sec-CH-UA-Mobile',
      'Sec-CH-UA-Platform'
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

