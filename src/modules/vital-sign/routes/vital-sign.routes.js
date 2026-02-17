/**
 * Vital Sign routes
 *
 * @module modules/vital-sign/routes
 * @description Vital sign endpoints mounted at /api/v1/vital-signs
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const vitalSignController = require('@controllers/vital-sign/vital-sign.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createVitalSignSchema,
  updateVitalSignSchema,
  vitalSignIdParamsSchema,
  listVitalSignsQuerySchema
} = require('@validations/vital-sign/vital-sign.schema');

/**
 * @description List vital signs with pagination and filters
 * @method GET
 * @route /api/v1/vital-signs/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=recorded_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [encounter_id] - Filter by encounter ID (UUID)
 * @queryParams {string} [vital_type] - Filter by vital type (TEMPERATURE, BLOOD_PRESSURE, HEART_RATE, RESPIRATORY_RATE, OXYGEN_SATURATION, WEIGHT, HEIGHT, BMI)
 * @bodyParams None
 * @returns {Object} Paginated list of vital signs
 * @throws 401 Unauthorized
 */
router.get(
  '/',  validateRequest({ query: listVitalSignsQuerySchema }),

  authenticate(),
  vitalSignController.listVitalSigns
);

/**
 * @description Get vital sign by ID
 * @method GET
 * @route /api/v1/vital-signs/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Vital sign ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Vital sign data
 * @throws 401 Unauthorized
 * @throws 404 Vital sign not found
 */
router.get(
  '/:id',  validateRequest({ params: vitalSignIdParamsSchema }),

  authenticate(),
  vitalSignController.getVitalSignById
);

/**
 * @description Create new vital sign
 * @method POST
 * @route /api/v1/vital-signs/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} encounter_id - Encounter ID (required, UUID)
 * @bodyParams {string} vital_type - Vital type (required, TEMPERATURE/BLOOD_PRESSURE/HEART_RATE/RESPIRATORY_RATE/OXYGEN_SATURATION/WEIGHT/HEIGHT/BMI)
 * @bodyParams {string} value - Vital value (required, max 80 chars)
 * @bodyParams {string} [unit] - Unit of measurement (max 20 chars)
 * @bodyParams {string} [recorded_at] - Recording timestamp (ISO 8601 datetime)
 * @returns {Object} Created vital sign
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 */
router.post(
  '/',  validateRequest({ body: createVitalSignSchema }),

  authenticate(),
  vitalSignController.createVitalSign
);

/**
 * @description Update vital sign
 * @method PUT
 * @route /api/v1/vital-signs/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Vital sign ID (UUID)
 * @queryParams None
 * @bodyParams {string} [encounter_id] - Encounter ID (UUID)
 * @bodyParams {string} [vital_type] - Vital type (TEMPERATURE/BLOOD_PRESSURE/HEART_RATE/RESPIRATORY_RATE/OXYGEN_SATURATION/WEIGHT/HEIGHT/BMI)
 * @bodyParams {string} [value] - Vital value (max 80 chars)
 * @bodyParams {string} [unit] - Unit of measurement (max 20 chars)
 * @bodyParams {string} [recorded_at] - Recording timestamp (ISO 8601 datetime)
 * @returns {Object} Updated vital sign
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Vital sign not found
 * @throws 400 Foreign key constraint violation
 */
router.put(
  '/:id',  validateRequest({ params: vitalSignIdParamsSchema, body: updateVitalSignSchema }),

  authenticate(),
  vitalSignController.updateVitalSign
);

/**
 * @description Delete vital sign (soft delete)
 * @method DELETE
 * @route /api/v1/vital-signs/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Vital sign ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Vital sign not found
 */
router.delete(
  '/:id',  validateRequest({ params: vitalSignIdParamsSchema }),

  authenticate(),
  vitalSignController.deleteVitalSign
);

module.exports = router;
