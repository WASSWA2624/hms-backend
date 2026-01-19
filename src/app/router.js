/**
 * Root Router
 *
 * Health endpoints are at root level (not under /api/v1/)
 * Per health-checks.mdc: Health endpoints are public at root level
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

module.exports = router;

