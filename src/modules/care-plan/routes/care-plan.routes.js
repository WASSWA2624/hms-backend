/**
 * Care Plan routes
 *
 * @module modules/care-plan/routes
 * @description Care plan endpoints mounted at /api/v1/care-plans
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const carePlanController = require('@controllers/care-plan/care-plan.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createCarePlanSchema,
  updateCarePlanSchema,
  carePlanIdParamsSchema,
  listCarePlansQuerySchema
} = require('@validations/care-plan/care-plan.schema');

/**
 * @description List care plans with pagination and filters
 * @method GET
 * @route /api/v1/care-plans/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [encounter_id] - Filter by encounter ID (UUID)
 * @queryParams {string} [start_date] - Filter by start date (ISO 8601 datetime)
 * @queryParams {string} [end_date] - Filter by end date (ISO 8601 datetime)
 * @bodyParams None
 * @returns {Object} Paginated list of care plans
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listCarePlansQuerySchema }),
  carePlanController.listCarePlans
);

/**
 * @description Get care plan by ID
 * @method GET
 * @route /api/v1/care-plans/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Care plan ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Care plan data
 * @throws 401 Unauthorized
 * @throws 404 Care plan not found
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: carePlanIdParamsSchema }),
  carePlanController.getCarePlanById
);

/**
 * @description Create new care plan
 * @method POST
 * @route /api/v1/care-plans/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} encounter_id - Encounter ID (required, UUID)
 * @bodyParams {string} plan - Care plan details (required, text)
 * @bodyParams {string} [start_date] - Start date (ISO 8601 datetime)
 * @bodyParams {string} [end_date] - End date (ISO 8601 datetime)
 * @returns {Object} Created care plan
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createCarePlanSchema }),
  carePlanController.createCarePlan
);

/**
 * @description Update care plan
 * @method PUT
 * @route /api/v1/care-plans/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Care plan ID (UUID)
 * @queryParams None
 * @bodyParams {string} [encounter_id] - Encounter ID (UUID)
 * @bodyParams {string} [plan] - Care plan details (text)
 * @bodyParams {string} [start_date] - Start date (ISO 8601 datetime)
 * @bodyParams {string} [end_date] - End date (ISO 8601 datetime)
 * @returns {Object} Updated care plan
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Care plan not found
 * @throws 400 Foreign key constraint violation
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: carePlanIdParamsSchema, body: updateCarePlanSchema }),
  carePlanController.updateCarePlan
);

/**
 * @description Delete care plan (soft delete)
 * @method DELETE
 * @route /api/v1/care-plans/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Care plan ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Care plan not found
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: carePlanIdParamsSchema }),
  carePlanController.deleteCarePlan
);

module.exports = router;
