/**
 * Procedure routes
 *
 * @module modules/procedure/routes
 * @description Procedure endpoints mounted at /api/v1/procedures
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const procedureController = require('@controllers/procedure/procedure.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createProcedureSchema,
  updateProcedureSchema,
  procedureIdParamsSchema,
  listProceduresQuerySchema
} = require('@validations/procedure/procedure.schema');

/**
 * @description List procedures with pagination and filters
 * @method GET
 * @route /api/v1/procedures/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [encounter_id] - Filter by encounter ID (UUID)
 * @queryParams {string} [code] - Filter by code (partial match)
 * @bodyParams None
 * @returns {Object} Paginated list of procedures
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listProceduresQuerySchema }),
  procedureController.listProcedures
);

/**
 * @description Get procedure by ID
 * @method GET
 * @route /api/v1/procedures/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Procedure ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Procedure data
 * @throws 401 Unauthorized
 * @throws 404 Procedure not found
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: procedureIdParamsSchema }),
  procedureController.getProcedureById
);

/**
 * @description Create new procedure
 * @method POST
 * @route /api/v1/procedures/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} encounter_id - Encounter ID (required, UUID)
 * @bodyParams {string} [code] - Procedure code (max 80 chars)
 * @bodyParams {string} description - Procedure description (required, max 65535 chars)
 * @bodyParams {string} [performed_at] - Performed datetime (ISO 8601)
 * @returns {Object} Created procedure
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createProcedureSchema }),
  procedureController.createProcedure
);

/**
 * @description Update procedure
 * @method PUT
 * @route /api/v1/procedures/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Procedure ID (UUID)
 * @queryParams None
 * @bodyParams {string} [code] - Procedure code (max 80 chars)
 * @bodyParams {string} [description] - Procedure description (max 65535 chars)
 * @bodyParams {string} [performed_at] - Performed datetime (ISO 8601)
 * @returns {Object} Updated procedure
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Procedure not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: procedureIdParamsSchema, body: updateProcedureSchema }),
  procedureController.updateProcedure
);

/**
 * @description Delete procedure (soft delete)
 * @method DELETE
 * @route /api/v1/procedures/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Procedure ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Procedure not found
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: procedureIdParamsSchema }),
  procedureController.deleteProcedure
);

module.exports = router;
