/**
 * Patient routes
 *
 * @module modules/patient/routes
 * @description Patient endpoints mounted at /api/v1/patients
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const patientController = require('@controllers/patient/patient.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createPatientSchema,
  updatePatientSchema,
  patientIdParamsSchema,
  listPatientsQuerySchema
} = require('@validations/patient/patient.schema');

/**
 * @description List patients with pagination and filters
 * @method GET
 * @route /api/v1/patients/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [tenant_id] - Filter by tenant ID (UUID)
 * @queryParams {string} [facility_id] - Filter by facility ID (UUID)
 * @queryParams {string} [first_name] - Filter by first name (partial match)
 * @queryParams {string} [last_name] - Filter by last name (partial match)
 * @queryParams {string} [gender] - Filter by gender (MALE, FEMALE, OTHER, UNKNOWN)
 * @queryParams {string} [is_active] - Filter by active status (true/false)
 * @queryParams {string} [search] - Search in first_name and last_name fields
 * @bodyParams None
 * @returns {Object} Paginated list of patients
 * @throws 401 Unauthorized
 */
router.get(
  '/',  validateRequest({ query: listPatientsQuerySchema }),

  authenticate(),
  patientController.listPatients
);

/**
 * @description Get patient by ID
 * @method GET
 * @route /api/v1/patients/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Patient ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Patient data
 * @throws 401 Unauthorized
 * @throws 404 Patient not found
 */
router.get(
  '/:id',  validateRequest({ params: patientIdParamsSchema }),

  authenticate(),
  patientController.getPatientById
);

/**
 * @description Create new patient
 * @method POST
 * @route /api/v1/patients/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} tenant_id - Tenant ID (required, UUID)
 * @bodyParams {string} [facility_id] - Facility ID (UUID)
 * @bodyParams {string} first_name - Patient first name (required, max 120 chars)
 * @bodyParams {string} last_name - Patient last name (required, max 120 chars)
 * @bodyParams {string} [date_of_birth] - Date of birth (ISO 8601 datetime)
 * @bodyParams {string} [gender] - Gender (MALE/FEMALE/OTHER/UNKNOWN)
 * @bodyParams {boolean} [is_active=true] - Active status
 * @returns {Object} Created patient
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',  validateRequest({ body: createPatientSchema }),

  authenticate(),
  patientController.createPatient
);

/**
 * @description Update patient
 * @method PUT
 * @route /api/v1/patients/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Patient ID (UUID)
 * @queryParams None
 * @bodyParams {string} [facility_id] - Facility ID (UUID)
 * @bodyParams {string} [first_name] - Patient first name (max 120 chars)
 * @bodyParams {string} [last_name] - Patient last name (max 120 chars)
 * @bodyParams {string} [date_of_birth] - Date of birth (ISO 8601 datetime)
 * @bodyParams {string} [gender] - Gender (MALE/FEMALE/OTHER/UNKNOWN)
 * @bodyParams {boolean} [is_active] - Active status
 * @returns {Object} Updated patient
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Patient not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',  validateRequest({ params: patientIdParamsSchema, body: updatePatientSchema }),

  authenticate(),
  patientController.updatePatient
);

/**
 * @description Delete patient (soft delete)
 * @method DELETE
 * @route /api/v1/patients/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Patient ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Patient not found
 */
router.delete(
  '/:id',  validateRequest({ params: patientIdParamsSchema }),

  authenticate(),
  patientController.deletePatient
);

module.exports = router;
