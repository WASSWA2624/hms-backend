/**
 * Diagnosis routes
 *
 * @module modules/diagnosis/routes
 * @description Diagnosis endpoints mounted at /api/v1/diagnoses
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const diagnosisController = require('@controllers/diagnosis/diagnosis.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createDiagnosisSchema,
  updateDiagnosisSchema,
  diagnosisIdParamsSchema,
  listDiagnosesQuerySchema
} = require('@validations/diagnosis/diagnosis.schema');

/**
 * @description List diagnoses with pagination and filters
 * @method GET
 * @route /api/v1/diagnoses/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [encounter_id] - Filter by encounter ID (UUID)
 * @queryParams {string} [diagnosis_type] - Filter by diagnosis type (PRIMARY, SECONDARY, DIFFERENTIAL)
 * @queryParams {string} [code] - Filter by code (partial match)
 * @bodyParams None
 * @returns {Object} Paginated list of diagnoses
 * @throws 401 Unauthorized
 */
router.get(
  '/',  validateRequest({ query: listDiagnosesQuerySchema }),

  authenticate(),
  diagnosisController.listDiagnoses
);

/**
 * @description Get diagnosis by ID
 * @method GET
 * @route /api/v1/diagnoses/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Diagnosis ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Diagnosis data
 * @throws 401 Unauthorized
 * @throws 404 Diagnosis not found
 */
router.get(
  '/:id',  validateRequest({ params: diagnosisIdParamsSchema }),

  authenticate(),
  diagnosisController.getDiagnosisById
);

/**
 * @description Create new diagnosis
 * @method POST
 * @route /api/v1/diagnoses/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} encounter_id - Encounter ID (required, UUID)
 * @bodyParams {string} diagnosis_type - Diagnosis type (required, PRIMARY/SECONDARY/DIFFERENTIAL)
 * @bodyParams {string} [code] - Diagnosis code (max 80 chars)
 * @bodyParams {string} description - Diagnosis description (required, max 65535 chars)
 * @returns {Object} Created diagnosis
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',  validateRequest({ body: createDiagnosisSchema }),

  authenticate(),
  diagnosisController.createDiagnosis
);

/**
 * @description Update diagnosis
 * @method PUT
 * @route /api/v1/diagnoses/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Diagnosis ID (UUID)
 * @queryParams None
 * @bodyParams {string} [diagnosis_type] - Diagnosis type (PRIMARY/SECONDARY/DIFFERENTIAL)
 * @bodyParams {string} [code] - Diagnosis code (max 80 chars)
 * @bodyParams {string} [description] - Diagnosis description (max 65535 chars)
 * @returns {Object} Updated diagnosis
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Diagnosis not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',  validateRequest({ params: diagnosisIdParamsSchema, body: updateDiagnosisSchema }),

  authenticate(),
  diagnosisController.updateDiagnosis
);

/**
 * @description Delete diagnosis (soft delete)
 * @method DELETE
 * @route /api/v1/diagnoses/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Diagnosis ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Diagnosis not found
 */
router.delete(
  '/:id',  validateRequest({ params: diagnosisIdParamsSchema }),

  authenticate(),
  diagnosisController.deleteDiagnosis
);

module.exports = router;
