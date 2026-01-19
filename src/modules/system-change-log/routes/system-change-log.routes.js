/**
 * System change log routes
 *
 * @module modules/system-change-log/routes
 * @description System change log endpoints mounted at /api/v1/system-change-logs
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const systemChangeLogController = require('../controllers/system-change-log.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createSystemChangeLogSchema,
  updateSystemChangeLogSchema,
  approveSystemChangeLogSchema,
  implementSystemChangeLogSchema,
  systemChangeLogIdParamsSchema,
  listSystemChangeLogsQuerySchema
} = require('../schemas/system-change-log.schema');

/**
 * @description List system change logs with pagination and filters
 * @method GET
 * @route /api/v1/system-change-logs/
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listSystemChangeLogsQuerySchema }),
  systemChangeLogController.listSystemChangeLogs
);

/**
 * @description Get system change log by ID
 * @method GET
 * @route /api/v1/system-change-logs/:id
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: systemChangeLogIdParamsSchema }),
  systemChangeLogController.getSystemChangeLogById
);

/**
 * @description Create new system change log
 * @method POST
 * @route /api/v1/system-change-logs/
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createSystemChangeLogSchema }),
  systemChangeLogController.createSystemChangeLog
);

/**
 * @description Update system change log
 * @method PUT
 * @route /api/v1/system-change-logs/:id
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: systemChangeLogIdParamsSchema, body: updateSystemChangeLogSchema }),
  systemChangeLogController.updateSystemChangeLog
);

/**
 * @description Approve system change log
 * @method POST
 * @route /api/v1/system-change-logs/:id/approve
 */
router.post(
  '/:id/approve',
  authenticate(),
  validateRequest({ params: systemChangeLogIdParamsSchema, body: approveSystemChangeLogSchema }),
  systemChangeLogController.approveSystemChangeLog
);

/**
 * @description Implement system change log
 * @method POST
 * @route /api/v1/system-change-logs/:id/implement
 */
router.post(
  '/:id/implement',
  authenticate(),
  validateRequest({ params: systemChangeLogIdParamsSchema, body: implementSystemChangeLogSchema }),
  systemChangeLogController.implementSystemChangeLog
);

/**
 * @description Delete system change log (soft delete)
 * @method DELETE
 * @route /api/v1/system-change-logs/:id
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: systemChangeLogIdParamsSchema }),
  systemChangeLogController.deleteSystemChangeLog
);

module.exports = router;
