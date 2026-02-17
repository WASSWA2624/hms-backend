/**
 * Module routes
 *
 * @module modules/module/routes
 * @description Module endpoints mounted at /api/v1/modules
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const moduleController = require('@controllers/module/module.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createModuleSchema,
  updateModuleSchema,
  moduleIdParamsSchema,
  listModulesQuerySchema
} = require('@validations/module/module.schema');

/**
 * @description List modules with pagination and filters
 * @method GET
 * @route /api/v1/modules/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [search] - Search by name or description
 * @bodyParams None
 * @returns {Object} Paginated list of modules
 * @throws 401 Unauthorized
 */
router.get(
  '/',  validateRequest({ query: listModulesQuerySchema }),

  authenticate(),
  moduleController.listModules
);

/**
 * @description Get module by ID
 * @method GET
 * @route /api/v1/modules/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Module ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Module data
 * @throws 401 Unauthorized
 * @throws 404 Module not found
 */
router.get(
  '/:id',  validateRequest({ params: moduleIdParamsSchema }),

  authenticate(),
  moduleController.getModuleById
);

/**
 * @description Create new module
 * @method POST
 * @route /api/v1/modules/
 * @authentication Required (JWT)
 * @permissions Authenticated users (admin)
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} name - Module name (required, max 120 chars)
 * @bodyParams {string} [description] - Module description
 * @returns {Object} Created module
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 409 Duplicate name
 */
router.post(
  '/',  validateRequest({ body: createModuleSchema }),

  authenticate(),
  moduleController.createModule
);

/**
 * @description Update module
 * @method PUT
 * @route /api/v1/modules/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users (admin)
 * @urlParams {string} id - Module ID (UUID)
 * @queryParams None
 * @bodyParams {string} [name] - Module name (max 120 chars)
 * @bodyParams {string} [description] - Module description
 * @returns {Object} Updated module
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Module not found
 * @throws 409 Duplicate name
 */
router.put(
  '/:id',  validateRequest({ params: moduleIdParamsSchema, body: updateModuleSchema }),

  authenticate(),
  moduleController.updateModule
);

/**
 * @description Delete module (soft delete)
 * @method DELETE
 * @route /api/v1/modules/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users (admin)
 * @urlParams {string} id - Module ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Module not found
 */
router.delete(
  '/:id',  validateRequest({ params: moduleIdParamsSchema }),

  authenticate(),
  moduleController.deleteModule
);

module.exports = router;
