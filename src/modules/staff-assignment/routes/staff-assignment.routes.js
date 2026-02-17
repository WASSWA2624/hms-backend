/**
 * Staff assignment routes
 *
 * @module modules/staff-assignment/routes
 * @description Staff assignment endpoints mounted at /api/v1/staff-assignments
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const staffAssignmentController = require('@controllers/staff-assignment/staff-assignment.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createStaffAssignmentSchema,
  updateStaffAssignmentSchema,
  staffAssignmentIdParamsSchema,
  listStaffAssignmentsQuerySchema
} = require('@validations/staff-assignment/staff-assignment.schema');

/**
 * @description List staff assignments with pagination and filters
 * @method GET
 * @route /api/v1/staff-assignments/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [staff_profile_id] - Filter by staff profile ID (UUID)
 * @queryParams {string} [department_id] - Filter by department ID (UUID)
 * @queryParams {string} [unit_id] - Filter by unit ID (UUID)
 * @bodyParams None
 * @returns {Object} Paginated list of staff assignments
 * @throws 401 Unauthorized
 */
router.get(
  '/',  validateRequest({ query: listStaffAssignmentsQuerySchema }),

  authenticate(),
  staffAssignmentController.listStaffAssignments
);

/**
 * @description Get staff assignment by ID
 * @method GET
 * @route /api/v1/staff-assignments/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Staff assignment ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Staff assignment data
 * @throws 401 Unauthorized
 * @throws 404 Staff assignment not found
 */
router.get(
  '/:id',  validateRequest({ params: staffAssignmentIdParamsSchema }),

  authenticate(),
  staffAssignmentController.getStaffAssignmentById
);

/**
 * @description Create new staff assignment
 * @method POST
 * @route /api/v1/staff-assignments/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} staff_profile_id - Staff profile ID (required, UUID)
 * @bodyParams {string} [department_id] - Department ID (UUID)
 * @bodyParams {string} [unit_id] - Unit ID (UUID)
 * @bodyParams {Date} start_date - Assignment start date (required)
 * @bodyParams {Date} [end_date] - Assignment end date
 * @returns {Object} Created staff assignment
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',  validateRequest({ body: createStaffAssignmentSchema }),

  authenticate(),
  staffAssignmentController.createStaffAssignment
);

/**
 * @description Update staff assignment
 * @method PUT
 * @route /api/v1/staff-assignments/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Staff assignment ID (UUID)
 * @queryParams None
 * @bodyParams {string} [department_id] - Department ID (UUID)
 * @bodyParams {string} [unit_id] - Unit ID (UUID)
 * @bodyParams {Date} [start_date] - Assignment start date
 * @bodyParams {Date} [end_date] - Assignment end date
 * @returns {Object} Updated staff assignment
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Staff assignment not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',  validateRequest({ params: staffAssignmentIdParamsSchema, body: updateStaffAssignmentSchema }),

  authenticate(),
  staffAssignmentController.updateStaffAssignment
);

/**
 * @description Delete staff assignment (soft delete)
 * @method DELETE
 * @route /api/v1/staff-assignments/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Staff assignment ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Staff assignment not found
 */
router.delete(
  '/:id',  validateRequest({ params: staffAssignmentIdParamsSchema }),

  authenticate(),
  staffAssignmentController.deleteStaffAssignment
);

module.exports = router;
