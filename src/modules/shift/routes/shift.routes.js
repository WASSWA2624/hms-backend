/**
 * Shift routes
 *
 * @module modules/shift/routes
 * @description Shift endpoints mounted at /api/v1/shifts
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const shiftController = require('@controllers/shift/shift.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createShiftSchema,
  updateShiftSchema,
  publishShiftSchema,
  shiftIdParamsSchema,
  listShiftsQuerySchema
} = require('@validations/shift/shift.schema');

/**
 * @description List shifts with pagination and filters
 * @method GET
 * @route /api/v1/shifts/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [tenant_id] - Filter by tenant ID (UUID)
 * @queryParams {string} [facility_id] - Filter by facility ID (UUID)
 * @queryParams {string} [shift_type] - Filter by shift type (DAY/NIGHT/SWING/ON_CALL)
 * @queryParams {string} [status] - Filter by status (SCHEDULED/COMPLETED/CANCELLED)
 * @queryParams {string} [start_time_from] - Filter by start time (from, ISO 8601)
 * @queryParams {string} [start_time_to] - Filter by start time (to, ISO 8601)
 * @queryParams {string} [end_time_from] - Filter by end time (from, ISO 8601)
 * @queryParams {string} [end_time_to] - Filter by end time (to, ISO 8601)
 * @bodyParams None
 * @returns {Object} Paginated list of shifts
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listShiftsQuerySchema }),
  shiftController.listShifts
);

/**
 * @description Get shift by ID
 * @method GET
 * @route /api/v1/shifts/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Shift ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Shift data
 * @throws 401 Unauthorized
 * @throws 404 Shift not found
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: shiftIdParamsSchema }),
  shiftController.getShiftById
);

/**
 * @description Create new shift
 * @method POST
 * @route /api/v1/shifts/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} tenant_id - Tenant ID (required, UUID)
 * @bodyParams {string} [facility_id] - Facility ID (UUID)
 * @bodyParams {string} shift_type - Shift type (required, DAY/NIGHT/SWING/ON_CALL)
 * @bodyParams {string} [status=SCHEDULED] - Status (SCHEDULED/COMPLETED/CANCELLED)
 * @bodyParams {string} start_time - Start time (required, ISO 8601 datetime)
 * @bodyParams {string} end_time - End time (required, ISO 8601 datetime)
 * @returns {Object} Created shift
 * @throws 401 Unauthorized
 * @throws 400 Validation error (end_time must be after start_time)
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createShiftSchema }),
  shiftController.createShift
);

/**
 * @description Update shift
 * @method PUT
 * @route /api/v1/shifts/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Shift ID (UUID)
 * @queryParams None
 * @bodyParams {string} [facility_id] - Facility ID (UUID)
 * @bodyParams {string} [shift_type] - Shift type (DAY/NIGHT/SWING/ON_CALL)
 * @bodyParams {string} [status] - Status (SCHEDULED/COMPLETED/CANCELLED)
 * @bodyParams {string} [start_time] - Start time (ISO 8601 datetime)
 * @bodyParams {string} [end_time] - End time (ISO 8601 datetime)
 * @returns {Object} Updated shift
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Shift not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: shiftIdParamsSchema, body: updateShiftSchema }),
  shiftController.updateShift
);

/**
 * @description Delete shift (soft delete)
 * @method DELETE
 * @route /api/v1/shifts/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Shift ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Shift not found
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: shiftIdParamsSchema }),
  shiftController.deleteShift
);

/**
 * @description Publish shift schedule
 * @method POST
 * @route /api/v1/shifts/:id/publish
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Shift ID (UUID)
 * @queryParams None
 * @bodyParams {boolean} [notify_staff=true] - Whether to notify assigned staff
 * @returns {Object} Published shift
 * @throws 401 Unauthorized
 * @throws 404 Shift not found
 * @throws 400 Shift already published
 */
router.post(
  '/:id/publish',
  authenticate(),
  validateRequest({ params: shiftIdParamsSchema, body: publishShiftSchema }),
  shiftController.publishShift
);

module.exports = router;
