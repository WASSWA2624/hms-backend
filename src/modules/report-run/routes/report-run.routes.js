/**
 * Report run routes
 *
 * @module modules/report-run/routes
 * @description Report run endpoints mounted at /api/v1/report-runs
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const reportRunController = require('@controllers/report-run/report-run.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createReportRunSchema,
  updateReportRunSchema,
  reportRunIdParamsSchema,
  listReportRunsQuerySchema
} = require('@validations/report-run/report-run.schema');

/**
 * @description List report runs with pagination and filters
 * @method GET
 * @route /api/v1/report-runs/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [tenant_id] - Filter by tenant ID (UUID)
 * @queryParams {string} [report_definition_id] - Filter by report definition ID (UUID)
 * @queryParams {string} [format] - Filter by format (PDF, EXCEL, CSV, JSON)
 * @queryParams {string} [status] - Filter by status (PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED)
 * @queryParams {string} [created_by] - Filter by creator ID (UUID)
 * @bodyParams None
 * @returns {Object} Paginated list of report runs
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listReportRunsQuerySchema }),
  reportRunController.listReportRuns
);

/**
 * @description Get report run by ID
 * @method GET
 * @route /api/v1/report-runs/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Report run ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Report run data
 * @throws 401 Unauthorized
 * @throws 404 Report run not found
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: reportRunIdParamsSchema }),
  reportRunController.getReportRunById
);

/**
 * @description Create new report run
 * @method POST
 * @route /api/v1/report-runs/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} tenant_id - Tenant ID (required, UUID)
 * @bodyParams {string} report_definition_id - Report definition ID (required, UUID)
 * @bodyParams {string} format - Report format (required, PDF, EXCEL, CSV, JSON)
 * @bodyParams {Object} [parameters] - Parameter values JSON
 * @returns {Object} Created report run
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createReportRunSchema }),
  reportRunController.createReportRun
);

/**
 * @description Update report run
 * @method PUT
 * @route /api/v1/report-runs/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Report run ID (UUID)
 * @queryParams None
 * @bodyParams {string} [status] - Report run status (PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED)
 * @bodyParams {string} [file_path] - File path for generated report (max 255 chars)
 * @bodyParams {string} [error_message] - Error message if failed
 * @bodyParams {string} [started_at] - When processing started (ISO 8601 datetime)
 * @bodyParams {string} [completed_at] - When processing completed (ISO 8601 datetime)
 * @returns {Object} Updated report run
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Report run not found
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: reportRunIdParamsSchema, body: updateReportRunSchema }),
  reportRunController.updateReportRun
);

/**
 * @description Delete report run (soft delete)
 * @method DELETE
 * @route /api/v1/report-runs/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users (admin)
 * @urlParams {string} id - Report run ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Report run not found
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: reportRunIdParamsSchema }),
  reportRunController.deleteReportRun
);

module.exports = router;
