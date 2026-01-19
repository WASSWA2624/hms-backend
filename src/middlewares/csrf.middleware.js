/**
 * Cross-Site Request Forgery (CSRF) Protection Middleware
 *
 * Enforces CSRF tokens for state-changing requests per auth-security.mdc.
 */

const { CSRF_SECRET } = require('@config/env');
const SecurityConfig = require('@config/security');
const { HttpError } = require('@lib/errors');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'x-csrf-token';

/**
 * CSRF middleware.
 *
 * @returns {Function} Express middleware
 */
const csrfMiddleware = () => {
  return (req, res, next) => {
    if (!SecurityConfig?.csrf?.enabled) {
      return next();
    }

    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    if (!CSRF_SECRET) {
      return next(new HttpError('errors.csrf.missing', 500));
    }

    const token = req.headers[CSRF_HEADER];
    if (!token) {
      return next(new HttpError('errors.csrf.missing', 403));
    }

    if (token !== CSRF_SECRET) {
      return next(new HttpError('errors.csrf.invalid', 403));
    }

    return next();
  };
};

module.exports = csrfMiddleware;
