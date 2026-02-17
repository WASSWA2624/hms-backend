/**
 * Staff position routes
 *
 * @module modules/staff-position/routes
 * @description Staff position endpoints mounted at /api/v1/staff-positions
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const staffPositionController = require('@controllers/staff-position/staff-position.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate, requireAuth } = require('@middlewares/auth.middleware');
const {
  createStaffPositionSchema,
  updateStaffPositionSchema,
  staffPositionIdParamsSchema,
  listStaffPositionsQuerySchema
} = require('@validations/staff-position/staff-position.schema');

const STAFF_POSITION_MANAGE_ROLES = ['TENANT_ADMIN', 'FACILITY_ADMIN', 'SUPER_ADMIN', 'HR'];

/**
 * @description List staff positions with pagination and filters
 * @method GET
 * @route /api/v1/staff-positions/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [tenant_id] - Filter by tenant ID (UUID)
 * @queryParams {string} [facility_id] - Filter by facility ID (UUID)
 * @queryParams {string} [department_id] - Filter by department ID (UUID)
 * @queryParams {string} [name] - Filter by position name (partial match)
 * @queryParams {string} [is_active] - Filter by active status (true/false)
 * @queryParams {string} [search] - Search in name and description
 * @bodyParams None
 * @returns {Object} Paginated list of staff positions
 * @throws 401 Unauthorized
 */
router.get(
  '/',  validateRequest({ query: listStaffPositionsQuerySchema }),

  authenticate(),
  staffPositionController.listStaffPositions
);

/**
 * @description Get staff position by ID
 * @method GET
 * @route /api/v1/staff-positions/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Staff position ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Staff position data
 * @throws 401 Unauthorized
 * @throws 404 Staff position not found
 */
router.get(
  '/:id',  validateRequest({ params: staffPositionIdParamsSchema }),

  authenticate(),
  staffPositionController.getStaffPositionById
);

/**
 * @description Create new staff position
 * @method POST
 * @route /api/v1/staff-positions/
 * @authentication Required (JWT)
 * @permissions SUPER_ADMIN, TENANT_ADMIN, FACILITY_ADMIN, HR
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} tenant_id - Tenant ID (required, UUID)
 * @bodyParams {string} [facility_id] - Facility ID (UUID)
 * @bodyParams {string} [department_id] - Department ID (UUID)
 * @bodyParams {string} name - Position title (required, max 120 chars)
 * @bodyParams {string} [description] - Position description (max 255 chars)
 * @bodyParams {boolean} [is_active=true] - Active status
 * @returns {Object} Created staff position
 * @throws 401 Unauthorized
 * @throws 403 Insufficient permissions
 * @throws 400 Validation error
 */
router.post(
  '/',  validateRequest({ body: createStaffPositionSchema }),

  requireAuth(STAFF_POSITION_MANAGE_ROLES),
  staffPositionController.createStaffPosition
);

/**
 * @description Update staff position
 * @method PUT
 * @route /api/v1/staff-positions/:id
 * @authentication Required (JWT)
 * @permissions SUPER_ADMIN, TENANT_ADMIN, FACILITY_ADMIN, HR
 * @urlParams {string} id - Staff position ID (UUID)
 * @queryParams None
 * @bodyParams {string} [facility_id] - Facility ID (UUID)
 * @bodyParams {string} [department_id] - Department ID (UUID)
 * @bodyParams {string} [name] - Position title (max 120 chars)
 * @bodyParams {string} [description] - Position description (max 255 chars)
 * @bodyParams {boolean} [is_active] - Active status
 * @returns {Object} Updated staff position
 * @throws 401 Unauthorized
 * @throws 403 Insufficient permissions
 * @throws 400 Validation error
 * @throws 404 Staff position not found
 */
router.put(
  '/:id',  validateRequest({ params: staffPositionIdParamsSchema, body: updateStaffPositionSchema }),

  requireAuth(STAFF_POSITION_MANAGE_ROLES),
  staffPositionController.updateStaffPosition
);

/**
 * @description Delete staff position (soft delete)
 * @method DELETE
 * @route /api/v1/staff-positions/:id
 * @authentication Required (JWT)
 * @permissions SUPER_ADMIN, TENANT_ADMIN, FACILITY_ADMIN, HR
 * @urlParams {string} id - Staff position ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 403 Insufficient permissions
 * @throws 404 Staff position not found
 */
router.delete(
  '/:id',  validateRequest({ params: staffPositionIdParamsSchema }),

  requireAuth(STAFF_POSITION_MANAGE_ROLES),
  staffPositionController.deleteStaffPosition
);

module.exports = router;
