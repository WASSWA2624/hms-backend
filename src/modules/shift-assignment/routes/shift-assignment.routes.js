/**
 * Shift assignment routes
 *
 * @module modules/shift-assignment/routes
 * @description Shift assignment endpoints mounted at /api/v1/shift-assignments
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const shiftAssignmentController = require('@controllers/shift-assignment/shift-assignment.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createShiftAssignmentSchema,
  updateShiftAssignmentSchema,
  shiftAssignmentIdParamsSchema,
  listShiftAssignmentsQuerySchema
} = require('@validations/shift-assignment/shift-assignment.schema');

/**
 * @description List shift assignments with pagination and filters
 * @method GET
 * @route /api/v1/shift-assignments/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [shift_id] - Filter by shift ID (UUID)
 * @queryParams {string} [staff_profile_id] - Filter by staff profile ID (UUID)
 * @queryParams {string} [assigned_at_from] - Filter by assigned at (from, ISO 8601)
 * @queryParams {string} [assigned_at_to] - Filter by assigned at (to, ISO 8601)
 * @bodyParams None
 * @returns {Object} Paginated list of shift assignments
 * @throws 401 Unauthorized
 */
router.get(
  '/',  validateRequest({ query: listShiftAssignmentsQuerySchema }),

  authenticate(),
  shiftAssignmentController.listShiftAssignments
);

/**
 * @description Get shift assignment by ID
 * @method GET
 * @route /api/v1/shift-assignments/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Shift assignment ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Shift assignment data
 * @throws 401 Unauthorized
 * @throws 404 Shift assignment not found
 */
router.get(
  '/:id',  validateRequest({ params: shiftAssignmentIdParamsSchema }),

  authenticate(),
  shiftAssignmentController.getShiftAssignmentById
);

/**
 * @description Create new shift assignment
 * @method POST
 * @route /api/v1/shift-assignments/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} shift_id - Shift ID (required, UUID)
 * @bodyParams {string} staff_profile_id - Staff profile ID (required, UUID)
 * @bodyParams {string} [assigned_at] - Assignment date/time (ISO 8601 datetime)
 * @returns {Object} Created shift assignment
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',  validateRequest({ body: createShiftAssignmentSchema }),

  authenticate(),
  shiftAssignmentController.createShiftAssignment
);

/**
 * @description Update shift assignment
 * @method PUT
 * @route /api/v1/shift-assignments/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Shift assignment ID (UUID)
 * @queryParams None
 * @bodyParams {string} [shift_id] - Shift ID (UUID)
 * @bodyParams {string} [staff_profile_id] - Staff profile ID (UUID)
 * @bodyParams {string} [assigned_at] - Assignment date/time (ISO 8601 datetime)
 * @returns {Object} Updated shift assignment
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Shift assignment not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',  validateRequest({ params: shiftAssignmentIdParamsSchema, body: updateShiftAssignmentSchema }),

  authenticate(),
  shiftAssignmentController.updateShiftAssignment
);

/**
 * @description Delete shift assignment (soft delete)
 * @method DELETE
 * @route /api/v1/shift-assignments/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Shift assignment ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Shift assignment not found
 */
router.delete(
  '/:id',  validateRequest({ params: shiftAssignmentIdParamsSchema }),

  authenticate(),
  shiftAssignmentController.deleteShiftAssignment
);

module.exports = router;
