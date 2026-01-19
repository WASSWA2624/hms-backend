/**
 * Referral routes
 *
 * @module modules/referral/routes
 * @description Referral endpoints mounted at /api/v1/referrals
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const referralController = require('@controllers/referral/referral.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createReferralSchema,
  updateReferralSchema,
  referralIdParamsSchema,
  listReferralsQuerySchema
} = require('@validations/referral/referral.schema');

/**
 * @description List referrals with pagination and filters
 * @method GET
 * @route /api/v1/referrals/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [encounter_id] - Filter by encounter ID (UUID)
 * @queryParams {string} [from_department_id] - Filter by source department ID (UUID)
 * @queryParams {string} [to_department_id] - Filter by destination department ID (UUID)
 * @queryParams {string} [status] - Filter by status (REQUESTED, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED)
 * @bodyParams None
 * @returns {Object} Paginated list of referrals
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listReferralsQuerySchema }),
  referralController.listReferrals
);

/**
 * @description Get referral by ID
 * @method GET
 * @route /api/v1/referrals/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Referral ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Referral data
 * @throws 401 Unauthorized
 * @throws 404 Referral not found
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: referralIdParamsSchema }),
  referralController.getReferralById
);

/**
 * @description Create new referral
 * @method POST
 * @route /api/v1/referrals/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} encounter_id - Encounter ID (required, UUID)
 * @bodyParams {string} [from_department_id] - Source department ID (UUID)
 * @bodyParams {string} [to_department_id] - Destination department ID (UUID)
 * @bodyParams {string} [reason] - Reason for referral (max 10000 characters)
 * @bodyParams {string} status - Status (required, PENDING/APPROVED/REJECTED/COMPLETED/CANCELLED)
 * @returns {Object} Created referral
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createReferralSchema }),
  referralController.createReferral
);

/**
 * @description Update referral
 * @method PUT
 * @route /api/v1/referrals/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Referral ID (UUID)
 * @queryParams None
 * @bodyParams {string} [from_department_id] - Source department ID (UUID)
 * @bodyParams {string} [to_department_id] - Destination department ID (UUID)
 * @bodyParams {string} [reason] - Reason for referral (max 10000 characters)
 * @bodyParams {string} [status] - Status (REQUESTED/APPROVED/IN_PROGRESS/COMPLETED/CANCELLED)
 * @returns {Object} Updated referral
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Referral not found
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: referralIdParamsSchema, body: updateReferralSchema }),
  referralController.updateReferral
);

/**
 * @description Delete referral (soft delete)
 * @method DELETE
 * @route /api/v1/referrals/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Referral ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Referral not found
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: referralIdParamsSchema }),
  referralController.deleteReferral
);

module.exports = router;
