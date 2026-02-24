/**
 * JWT Configuration
 * 
 * JWT configuration per auth-security.mdc
 * Reads JWT_SECRET from @config/env (validated to be ≥ 32 characters)
 */

const { JWT_SECRET } = require('@config/env');

// Validate JWT_SECRET length (should already be validated in env.js, but double-check)
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

module.exports = {
  // Keep short-lived access tokens but issue effectively non-expiring refresh tokens.
  accessTokenExpiration: '15m', // 15 minutes
  refreshTokenExpiration: '36500d', // 100 years
  algorithm: 'HS256',
  secret: JWT_SECRET
};

