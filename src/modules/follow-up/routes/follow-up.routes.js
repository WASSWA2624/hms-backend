/**
 * Follow-up routes
 *
 * @module modules/follow-up/routes
 * @description Follow-up endpoints mounted at /api/v1/follow-ups
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const followUpController = require('@controllers/follow-up/follow-up.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createFollowUpSchema,
  updateFollowUpSchema,
  followUpIdParamsSchema,
  listFollowUpsQuerySchema
} = require('@validations/follow-up/follow-up.schema');

/**
 * @description List follow-ups with pagination and filters
 * @method GET
 * @route /api/v1/follow-ups/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [encounter_id] - Filter by encounter ID (UUID)
 * @bodyParams None
 * @returns {Object} Paginated list of follow-ups
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listFollowUpsQuerySchema }),
  followUpController.listFollowUps
);

/**
 * @description Get follow-up by ID
 * @method GET
 * @route /api/v1/follow-ups/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Follow-up ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Follow-up data
 * @throws 401 Unauthorized
 * @throws 404 Follow-up not found
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: followUpIdParamsSchema }),
  followUpController.getFollowUpById
);

/**
 * @description Create new follow-up
 * @method POST
 * @route /api/v1/follow-ups/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} encounter_id - Encounter ID (required, UUID)
 * @bodyParams {string} scheduled_at - Scheduled date and time (required, ISO datetime)
 * @bodyParams {string} [notes] - Follow-up notes (max 10000 characters)
 * @returns {Object} Created follow-up
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createFollowUpSchema }),
  followUpController.createFollowUp
);

/**
 * @description Update follow-up
 * @method PUT
 * @route /api/v1/follow-ups/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Follow-up ID (UUID)
 * @queryParams None
 * @bodyParams {string} [scheduled_at] - Scheduled date and time (ISO datetime)
 * @bodyParams {string} [notes] - Follow-up notes (max 10000 characters)
 * @returns {Object} Updated follow-up
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Follow-up not found
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: followUpIdParamsSchema, body: updateFollowUpSchema }),
  followUpController.updateFollowUp
);

/**
 * @description Delete follow-up (soft delete)
 * @method DELETE
 * @route /api/v1/follow-ups/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Follow-up ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Follow-up not found
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: followUpIdParamsSchema }),
  followUpController.deleteFollowUp
);

module.exports = router;
