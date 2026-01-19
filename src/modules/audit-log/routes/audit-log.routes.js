/**
 * Audit log routes
 *
 * @module modules/audit-log/routes
 * @description Route definitions for audit log endpoints.
 * Per module-creation.mdc: Mount endpoints as per P010_api_endpoints.mdc
 * Per api.mdc: All routes must be under /api/v1
 */

const express = require('express');
const router = express.Router();

// Middleware
const validate = require('@middlewares/validate.middleware');

// Schemas
const {
  auditLogIdParamsSchema,
  userIdParamsSchema,
  entityParamsSchema,
  listAuditLogsQuerySchema
} = require('@modules/audit-log/schemas/audit-log.schema');

// Controller
const auditLogController = require('@modules/audit-log/controllers/audit-log.controller');

/**
 * @route GET /api/v1/audit-logs/user/:userId
 * @desc Get audit logs by user ID
 * @access Private (requires authentication)
 */
router.get(
  '/user/:userId',
  validate({ params: userIdParamsSchema, query: listAuditLogsQuerySchema }),
  auditLogController.getAuditLogsByUserId
);

/**
 * @route GET /api/v1/audit-logs/entity/:entity/:entityId
 * @desc Get audit logs by entity
 * @access Private (requires authentication)
 */
router.get(
  '/entity/:entity/:entityId',
  validate({ params: entityParamsSchema, query: listAuditLogsQuerySchema }),
  auditLogController.getAuditLogsByEntity
);

/**
 * @route GET /api/v1/audit-logs/:id
 * @desc Get audit log by ID
 * @access Private (requires authentication)
 */
router.get(
  '/:id',
  validate({ params: auditLogIdParamsSchema }),
  auditLogController.getAuditLogById
);

/**
 * @route GET /api/v1/audit-logs
 * @desc Get paginated list of audit logs
 * @access Private (requires authentication)
 */
router.get(
  '/',
  validate({ query: listAuditLogsQuerySchema }),
  auditLogController.getAuditLogs
);

module.exports = router;
