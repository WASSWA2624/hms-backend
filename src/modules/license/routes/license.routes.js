/**
 * License routes
 *
 * @module modules/license/routes
 * @description License endpoints mounted at /api/v1/licenses
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const licenseController = require('@controllers/license/license.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createLicenseSchema,
  updateLicenseSchema,
  licenseIdParamsSchema,
  listLicensesQuerySchema
} = require('@validations/license/license.schema');

/**
 * @description List licenses with pagination and filters
 * @method GET
 * @route /api/v1/licenses/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [tenant_id] - Filter by tenant ID (UUID)
 * @queryParams {string} [license_type] - Filter by license type (PER_USER/PER_FACILITY/ENTERPRISE)
 * @queryParams {string} [status] - Filter by status (ACTIVE/PAST_DUE/CANCELLED/TRIAL)
 * @bodyParams None
 * @returns {Object} Paginated list of licenses
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listLicensesQuerySchema }),
  licenseController.listLicenses
);

/**
 * @description Get license by ID
 * @method GET
 * @route /api/v1/licenses/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - License ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} License data
 * @throws 401 Unauthorized
 * @throws 404 License not found
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: licenseIdParamsSchema }),
  licenseController.getLicenseById
);

/**
 * @description Create new license
 * @method POST
 * @route /api/v1/licenses/
 * @authentication Required (JWT)
 * @permissions Authenticated users (admin)
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} tenant_id - Tenant ID (required, UUID)
 * @bodyParams {string} license_type - License type (required, enum: PER_USER/PER_FACILITY/ENTERPRISE)
 * @bodyParams {string} status - Status (required, enum: ACTIVE/PAST_DUE/CANCELLED/TRIAL)
 * @bodyParams {string} [issued_at] - Issue date (ISO 8601 datetime)
 * @bodyParams {string} [expires_at] - Expiry date (ISO 8601 datetime)
 * @returns {Object} Created license
 * @throws 401 Unauthorized
 * @throws 400 Validation error or foreign key violation
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createLicenseSchema }),
  licenseController.createLicense
);

/**
 * @description Update license
 * @method PUT
 * @route /api/v1/licenses/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users (admin)
 * @urlParams {string} id - License ID (UUID)
 * @queryParams None
 * @bodyParams {string} [tenant_id] - Tenant ID (UUID)
 * @bodyParams {string} [license_type] - License type (enum: PER_USER/PER_FACILITY/ENTERPRISE)
 * @bodyParams {string} [status] - Status (enum: ACTIVE/PAST_DUE/CANCELLED/TRIAL)
 * @bodyParams {string} [issued_at] - Issue date (ISO 8601 datetime)
 * @bodyParams {string} [expires_at] - Expiry date (ISO 8601 datetime)
 * @returns {Object} Updated license
 * @throws 401 Unauthorized
 * @throws 400 Validation error or foreign key violation
 * @throws 404 License not found
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: licenseIdParamsSchema, body: updateLicenseSchema }),
  licenseController.updateLicense
);

/**
 * @description Delete license (soft delete)
 * @method DELETE
 * @route /api/v1/licenses/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users (admin)
 * @urlParams {string} id - License ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 License not found
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: licenseIdParamsSchema }),
  licenseController.deleteLicense
);

module.exports = router;
