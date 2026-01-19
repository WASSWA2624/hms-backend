/**
 * Staff leave routes
 *
 * @module modules/staff-leave/routes
 * @description Staff leave endpoints mounted at /api/v1/staff-leaves
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const staffLeaveController = require('../controllers/staff-leave.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createStaffLeaveSchema,
  updateStaffLeaveSchema,
  staffLeaveIdParamsSchema,
  listStaffLeavesQuerySchema
} = require('../schemas/staff-leave.schema');

/**
 * @description List staff leaves with pagination and filters
 * @method GET
 * @route /api/v1/staff-leaves/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [staff_profile_id] - Filter by staff profile ID (UUID)
 * @queryParams {string} [status] - Filter by status (REQUESTED, APPROVED, REJECTED, CANCELLED)
 * @bodyParams None
 * @returns {Object} Paginated list of staff leaves
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listStaffLeavesQuerySchema }),
  staffLeaveController.listStaffLeaves
);

/**
 * @description Get staff leave by ID
 * @method GET
 * @route /api/v1/staff-leaves/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Staff leave ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Staff leave data
 * @throws 401 Unauthorized
 * @throws 404 Staff leave not found
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: staffLeaveIdParamsSchema }),
  staffLeaveController.getStaffLeaveById
);

/**
 * @description Create new staff leave
 * @method POST
 * @route /api/v1/staff-leaves/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} staff_profile_id - Staff profile ID (required, UUID)
 * @bodyParams {string} status - Leave status (required, REQUESTED, APPROVED, REJECTED, CANCELLED)
 * @bodyParams {Date} start_date - Leave start date (required)
 * @bodyParams {Date} end_date - Leave end date (required)
 * @bodyParams {string} [reason] - Leave reason
 * @returns {Object} Created staff leave
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createStaffLeaveSchema }),
  staffLeaveController.createStaffLeave
);

/**
 * @description Update staff leave
 * @method PUT
 * @route /api/v1/staff-leaves/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Staff leave ID (UUID)
 * @queryParams None
 * @bodyParams {string} [status] - Leave status (REQUESTED, APPROVED, REJECTED, CANCELLED)
 * @bodyParams {Date} [start_date] - Leave start date
 * @bodyParams {Date} [end_date] - Leave end date
 * @bodyParams {string} [reason] - Leave reason
 * @returns {Object} Updated staff leave
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Staff leave not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: staffLeaveIdParamsSchema, body: updateStaffLeaveSchema }),
  staffLeaveController.updateStaffLeave
);

/**
 * @description Delete staff leave (soft delete)
 * @method DELETE
 * @route /api/v1/staff-leaves/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Staff leave ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Staff leave not found
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: staffLeaveIdParamsSchema }),
  staffLeaveController.deleteStaffLeave
);

module.exports = router;
