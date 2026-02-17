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
const systemChangeLogController = require('@controllers/system-change-log/system-change-log.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createSystemChangeLogSchema,
  updateSystemChangeLogSchema,
  approveSystemChangeLogSchema,
  implementSystemChangeLogSchema,
  systemChangeLogIdParamsSchema,
  listSystemChangeLogsQuerySchema
} = require('@validations/system-change-log/system-change-log.schema');

/**
 * @description List system change logs with pagination and filters
 * @method GET
 * @route /api/v1/system-change-logs/
 */
router.get(
  '/',  validateRequest({ query: listSystemChangeLogsQuerySchema }),

  authenticate(),
  systemChangeLogController.listSystemChangeLogs
);

/**
 * @description Get system change log by ID
 * @method GET
 * @route /api/v1/system-change-logs/:id
 */
router.get(
  '/:id',  validateRequest({ params: systemChangeLogIdParamsSchema }),

  authenticate(),
  systemChangeLogController.getSystemChangeLogById
);

/**
 * @description Create new system change log
 * @method POST
 * @route /api/v1/system-change-logs/
 */
router.post(
  '/',  validateRequest({ body: createSystemChangeLogSchema }),

  authenticate(),
  systemChangeLogController.createSystemChangeLog
);

/**
 * @description Update system change log
 * @method PUT
 * @route /api/v1/system-change-logs/:id
 */
router.put(
  '/:id',  validateRequest({ params: systemChangeLogIdParamsSchema, body: updateSystemChangeLogSchema }),

  authenticate(),
  systemChangeLogController.updateSystemChangeLog
);

/**
 * @description Approve system change log
 * @method POST
 * @route /api/v1/system-change-logs/:id/approve
 */
router.post(
  '/:id/approve',  validateRequest({ params: systemChangeLogIdParamsSchema, body: approveSystemChangeLogSchema }),

  authenticate(),
  systemChangeLogController.approveSystemChangeLog
);

/**
 * @description Implement system change log
 * @method POST
 * @route /api/v1/system-change-logs/:id/implement
 */
router.post(
  '/:id/implement',  validateRequest({ params: systemChangeLogIdParamsSchema, body: implementSystemChangeLogSchema }),

  authenticate(),
  systemChangeLogController.implementSystemChangeLog
);

/**
 * @description Delete system change log (soft delete)
 * @method DELETE
 * @route /api/v1/system-change-logs/:id
 */
router.delete(
  '/:id',  validateRequest({ params: systemChangeLogIdParamsSchema }),

  authenticate(),
  systemChangeLogController.deleteSystemChangeLog
);

module.exports = router;
