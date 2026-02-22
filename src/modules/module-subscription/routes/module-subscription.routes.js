/**
 * Module subscription routes
 *
 * @module modules/module-subscription/routes
 * @description Module subscription endpoints mounted at /api/v1/module-subscriptions
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const moduleSubscriptionController = require('@controllers/module-subscription/module-subscription.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createModuleSubscriptionSchema,
  updateModuleSubscriptionSchema,
  moduleSubscriptionActivationSchema,
  moduleSubscriptionIdParamsSchema,
  listModuleSubscriptionsQuerySchema
} = require('@validations/module-subscription/module-subscription.schema');

/**
 * @description List module subscriptions with pagination and filters
 * @method GET
 * @route /api/v1/module-subscriptions/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [module_id] - Filter by module ID (UUID)
 * @queryParams {string} [subscription_id] - Filter by subscription ID (UUID)
 * @queryParams {string} [is_active] - Filter by active status (true/false)
 * @bodyParams None
 * @returns {Object} Paginated list of module subscriptions
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  validateRequest({ query: listModuleSubscriptionsQuerySchema }),

  authenticate(),
  moduleSubscriptionController.listModuleSubscriptions
);

/**
 * @description Get module subscription by ID
 * @method GET
 * @route /api/v1/module-subscriptions/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Module subscription ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Module subscription data
 * @throws 401 Unauthorized
 * @throws 404 Module subscription not found
 */
router.get(
  '/:id',
  validateRequest({ params: moduleSubscriptionIdParamsSchema }),

  authenticate(),
  moduleSubscriptionController.getModuleSubscriptionById
);

/**
 * @description Create new module subscription
 * @method POST
 * @route /api/v1/module-subscriptions/
 * @authentication Required (JWT)
 * @permissions Authenticated users (admin)
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} module_id - Module ID (required, UUID)
 * @bodyParams {string} subscription_id - Subscription ID (required, UUID)
 * @bodyParams {boolean} [is_active=true] - Active status
 * @returns {Object} Created module subscription
 * @throws 401 Unauthorized
 * @throws 400 Validation error or foreign key violation
 * @throws 409 Duplicate module-subscription combination
 */
router.post(
  '/',
  validateRequest({ body: createModuleSubscriptionSchema }),

  authenticate(),
  moduleSubscriptionController.createModuleSubscription
);

/**
 * @description Update module subscription
 * @method PUT
 * @route /api/v1/module-subscriptions/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users (admin)
 * @urlParams {string} id - Module subscription ID (UUID)
 * @queryParams None
 * @bodyParams {string} [module_id] - Module ID (UUID)
 * @bodyParams {string} [subscription_id] - Subscription ID (UUID)
 * @bodyParams {boolean} [is_active] - Active status
 * @returns {Object} Updated module subscription
 * @throws 401 Unauthorized
 * @throws 400 Validation error or foreign key violation
 * @throws 404 Module subscription not found
 * @throws 409 Duplicate module-subscription combination
 */
router.put(
  '/:id',
  validateRequest({ params: moduleSubscriptionIdParamsSchema, body: updateModuleSubscriptionSchema }),

  authenticate(),
  moduleSubscriptionController.updateModuleSubscription
);

/**
 * @description Delete module subscription (soft delete)
 * @method DELETE
 * @route /api/v1/module-subscriptions/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users (admin)
 * @urlParams {string} id - Module subscription ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Module subscription not found
 */
router.delete(
  '/:id',
  validateRequest({ params: moduleSubscriptionIdParamsSchema }),

  authenticate(),
  moduleSubscriptionController.deleteModuleSubscription
);

router.post(
  '/:id/activate',
  validateRequest({ params: moduleSubscriptionIdParamsSchema, body: moduleSubscriptionActivationSchema }),

  authenticate(),
  moduleSubscriptionController.activateModuleSubscription
);

router.post(
  '/:id/deactivate',
  validateRequest({ params: moduleSubscriptionIdParamsSchema, body: moduleSubscriptionActivationSchema }),

  authenticate(),
  moduleSubscriptionController.deactivateModuleSubscription
);

router.get(
  '/:id/eligibility-check',
  validateRequest({ params: moduleSubscriptionIdParamsSchema }),

  authenticate(),
  moduleSubscriptionController.checkModuleSubscriptionEligibility
);

module.exports = router;
