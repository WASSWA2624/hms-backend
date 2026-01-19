/**
 * Payroll run routes
 *
 * @module modules/payroll-run/routes
 * @description Payroll run endpoints mounted at /api/v1/payroll-runs
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const payrollRunController = require('../controllers/payroll-run.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createPayrollRunSchema,
  updatePayrollRunSchema,
  payrollRunIdParamsSchema,
  listPayrollRunsQuerySchema
} = require('../schemas/payroll-run.schema');

/**
 * @description List payroll runs with pagination and filters
 * @method GET
 * @route /api/v1/payroll-runs/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [tenant_id] - Filter by tenant ID (UUID)
 * @queryParams {string} [status] - Filter by status (DRAFT, PROCESSED, PAID, CANCELLED)
 * @queryParams {string} [period_start_from] - Filter by period_start from date (ISO format)
 * @queryParams {string} [period_start_to] - Filter by period_start to date (ISO format)
 * @queryParams {string} [period_end_from] - Filter by period_end from date (ISO format)
 * @queryParams {string} [period_end_to] - Filter by period_end to date (ISO format)
 * @bodyParams None
 * @returns {Object} Paginated list of payroll runs
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listPayrollRunsQuerySchema }),
  payrollRunController.listPayrollRuns
);

/**
 * @description Get payroll run by ID
 * @method GET
 * @route /api/v1/payroll-runs/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Payroll run ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Payroll run data
 * @throws 401 Unauthorized
 * @throws 404 Payroll run not found
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: payrollRunIdParamsSchema }),
  payrollRunController.getPayrollRunById
);

/**
 * @description Create new payroll run
 * @method POST
 * @route /api/v1/payroll-runs/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} tenant_id - Tenant ID (required, UUID)
 * @bodyParams {string} period_start - Period start date (required, ISO format)
 * @bodyParams {string} period_end - Period end date (required, ISO format, must be after period_start)
 * @bodyParams {string} [status=DRAFT] - Status (DRAFT, PROCESSED, PAID, CANCELLED)
 * @returns {Object} Created payroll run
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createPayrollRunSchema }),
  payrollRunController.createPayrollRun
);

/**
 * @description Update payroll run
 * @method PUT
 * @route /api/v1/payroll-runs/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Payroll run ID (UUID)
 * @queryParams None
 * @bodyParams {string} [period_start] - Period start date (ISO format)
 * @bodyParams {string} [period_end] - Period end date (ISO format, must be after period_start)
 * @bodyParams {string} [status] - Status (DRAFT, PROCESSED, PAID, CANCELLED)
 * @returns {Object} Updated payroll run
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Payroll run not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: payrollRunIdParamsSchema, body: updatePayrollRunSchema }),
  payrollRunController.updatePayrollRun
);

/**
 * @description Delete payroll run (soft delete)
 * @method DELETE
 * @route /api/v1/payroll-runs/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Payroll run ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Payroll run not found
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: payrollRunIdParamsSchema }),
  payrollRunController.deletePayrollRun
);

module.exports = router;
