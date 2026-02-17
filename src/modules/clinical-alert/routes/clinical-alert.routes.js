/**
 * Clinical Alert routes
 *
 * @module modules/clinical-alert/routes
 * @description Clinical alert endpoints mounted at /api/v1/clinical-alerts
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const clinicalAlertController = require('@controllers/clinical-alert/clinical-alert.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createClinicalAlertSchema,
  updateClinicalAlertSchema,
  clinicalAlertIdParamsSchema,
  listClinicalAlertsQuerySchema
} = require('@validations/clinical-alert/clinical-alert.schema');

/**
 * @description List clinical alerts with pagination and filters
 * @method GET
 * @route /api/v1/clinical-alerts/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [encounter_id] - Filter by encounter ID (UUID)
 * @queryParams {string} [severity] - Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)
 * @bodyParams None
 * @returns {Object} Paginated list of clinical alerts
 * @throws 401 Unauthorized
 */
router.get(
  '/',  validateRequest({ query: listClinicalAlertsQuerySchema }),

  authenticate(),
  clinicalAlertController.listClinicalAlerts
);

/**
 * @description Get clinical alert by ID
 * @method GET
 * @route /api/v1/clinical-alerts/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Clinical alert ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Clinical alert data
 * @throws 401 Unauthorized
 * @throws 404 Clinical alert not found
 */
router.get(
  '/:id',  validateRequest({ params: clinicalAlertIdParamsSchema }),

  authenticate(),
  clinicalAlertController.getClinicalAlertById
);

/**
 * @description Create new clinical alert
 * @method POST
 * @route /api/v1/clinical-alerts/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} encounter_id - Encounter ID (required, UUID)
 * @bodyParams {string} severity - Alert severity (required, LOW/MEDIUM/HIGH/CRITICAL)
 * @bodyParams {string} message - Alert message (required, text)
 * @returns {Object} Created clinical alert
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 */
router.post(
  '/',  validateRequest({ body: createClinicalAlertSchema }),

  authenticate(),
  clinicalAlertController.createClinicalAlert
);

/**
 * @description Update clinical alert
 * @method PUT
 * @route /api/v1/clinical-alerts/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Clinical alert ID (UUID)
 * @queryParams None
 * @bodyParams {string} [encounter_id] - Encounter ID (UUID)
 * @bodyParams {string} [severity] - Alert severity (LOW/MEDIUM/HIGH/CRITICAL)
 * @bodyParams {string} [message] - Alert message (text)
 * @returns {Object} Updated clinical alert
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Clinical alert not found
 * @throws 400 Foreign key constraint violation
 */
router.put(
  '/:id',  validateRequest({ params: clinicalAlertIdParamsSchema, body: updateClinicalAlertSchema }),

  authenticate(),
  clinicalAlertController.updateClinicalAlert
);

/**
 * @description Delete clinical alert (soft delete)
 * @method DELETE
 * @route /api/v1/clinical-alerts/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Clinical alert ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Clinical alert not found
 */
router.delete(
  '/:id',  validateRequest({ params: clinicalAlertIdParamsSchema }),

  authenticate(),
  clinicalAlertController.deleteClinicalAlert
);

module.exports = router;
