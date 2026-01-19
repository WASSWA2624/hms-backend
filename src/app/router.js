/**
 * Root Router
 *
 * Health endpoints are at root level (not under /api/v1/)
 * Per health-checks.mdc: Health endpoints are public at root level
 * Per api-versioning.mdc: All API endpoints must be versioned under /api/v1/
 */

const express = require('express');
const router = express.Router();

// Health check utilities
const { healthCheck, readinessCheck, livenessCheck } = require('@lib/health');
const { asyncHandler } = require('@lib/async');
const { sendSuccess } = require('@lib/response');

/**
 * @description Health check endpoint (public)
 * @method GET
 * @route /health
 * @authentication None
 * @permissions Public
 * @urlParams None
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Health status payload
 * @throws 503 Service unavailable
 */
router.get('/health', (req, res) => {
  const health = healthCheck();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  return sendSuccess(res, statusCode, 'messages.health.check', health);
});

/**
 * @description Readiness check endpoint (public)
 * @method GET
 * @route /ready
 * @authentication None
 * @permissions Public
 * @urlParams None
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Readiness status payload
 * @throws 503 Service unavailable
 */
router.get('/ready', asyncHandler(async (req, res) => {
  const readiness = await readinessCheck();
  const statusCode = readiness.status === 'ready' ? 200 : 503;
  return sendSuccess(res, statusCode, 'messages.readiness.check', readiness);
}));

/**
 * @description Liveness check endpoint (public)
 * @method GET
 * @route /live
 * @authentication None
 * @permissions Public
 * @urlParams None
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Liveness status payload
 */
router.get('/live', (req, res) => {
  const liveness = livenessCheck();
  return sendSuccess(res, 200, 'messages.liveness.check', liveness);
});

/**
 * API v1 Router
 * Per api-versioning.mdc: All API endpoints must be versioned
 * Per module-creation.mdc: Modules are mounted under /api/v1/<module>
 */
const apiV1Router = express.Router();

// Mount module routes under /api/v1/
// Per module-creation.mdc step 7: Use relative paths to mount modules
apiV1Router.use('/auth', require('../modules/auth/routes/auth.routes'));
apiV1Router.use('/user-sessions', require('../modules/user-session/routes/user-session.routes'));

// Mount API v1 router
router.use('/api/v1', apiV1Router);

module.exports = router;

