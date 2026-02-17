/**
 * Staff profile routes
 *
 * @module modules/staff-profile/routes
 * @description Staff profile endpoints mounted at /api/v1/staff-profiles
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const staffProfileController = require('@controllers/staff-profile/staff-profile.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createStaffProfileSchema,
  updateStaffProfileSchema,
  staffProfileIdParamsSchema,
  listStaffProfilesQuerySchema
} = require('@validations/staff-profile/staff-profile.schema');

/**
 * @description List staff profiles with pagination and filters
 * @method GET
 * @route /api/v1/staff-profiles/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [tenant_id] - Filter by tenant ID (UUID)
 * @queryParams {string} [user_id] - Filter by user ID (UUID)
 * @queryParams {string} [department_id] - Filter by department ID (UUID)
 * @queryParams {string} [staff_number] - Filter by staff number (partial match)
 * @queryParams {string} [position] - Filter by position (partial match)
 * @queryParams {string} [search] - Search in staff_number and position fields
 * @bodyParams None
 * @returns {Object} Paginated list of staff profiles
 * @throws 401 Unauthorized
 */
router.get(
  '/',  validateRequest({ query: listStaffProfilesQuerySchema }),

  authenticate(),
  staffProfileController.listStaffProfiles
);

/**
 * @description Get staff profile by ID
 * @method GET
 * @route /api/v1/staff-profiles/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Staff profile ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Staff profile data
 * @throws 401 Unauthorized
 * @throws 404 Staff profile not found
 */
router.get(
  '/:id',  validateRequest({ params: staffProfileIdParamsSchema }),

  authenticate(),
  staffProfileController.getStaffProfileById
);

/**
 * @description Create new staff profile
 * @method POST
 * @route /api/v1/staff-profiles/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} tenant_id - Tenant ID (required, UUID)
 * @bodyParams {string} user_id - User ID (required, UUID)
 * @bodyParams {string} [department_id] - Department ID (UUID)
 * @bodyParams {string} [staff_number] - Staff number (max 80 chars)
 * @bodyParams {string} [position] - Position title (max 120 chars)
 * @bodyParams {Date} [hire_date] - Hire date
 * @returns {Object} Created staff profile
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',  validateRequest({ body: createStaffProfileSchema }),

  authenticate(),
  staffProfileController.createStaffProfile
);

/**
 * @description Update staff profile
 * @method PUT
 * @route /api/v1/staff-profiles/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Staff profile ID (UUID)
 * @queryParams None
 * @bodyParams {string} [department_id] - Department ID (UUID)
 * @bodyParams {string} [staff_number] - Staff number (max 80 chars)
 * @bodyParams {string} [position] - Position title (max 120 chars)
 * @bodyParams {Date} [hire_date] - Hire date
 * @returns {Object} Updated staff profile
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Staff profile not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',  validateRequest({ params: staffProfileIdParamsSchema, body: updateStaffProfileSchema }),

  authenticate(),
  staffProfileController.updateStaffProfile
);

/**
 * @description Delete staff profile (soft delete)
 * @method DELETE
 * @route /api/v1/staff-profiles/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Staff profile ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Staff profile not found
 */
router.delete(
  '/:id',  validateRequest({ params: staffProfileIdParamsSchema }),

  authenticate(),
  staffProfileController.deleteStaffProfile
);

module.exports = router;
