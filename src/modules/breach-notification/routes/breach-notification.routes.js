/**
 * Breach notification routes
 *
 * @module modules/breach-notification/routes
 * @description Breach notification endpoints mounted at /api/v1/breach-notifications
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const breachNotificationController = require('@controllers/breach-notification/breach-notification.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createBreachNotificationSchema,
  updateBreachNotificationSchema,
  resolveBreachNotificationSchema,
  breachNotificationIdParamsSchema,
  listBreachNotificationsQuerySchema
} = require('@validations/breach-notification/breach-notification.schema');

/**
 * @description List breach notifications with pagination and filters
 * @method GET
 * @route /api/v1/breach-notifications/
 */
router.get(
  '/',  validateRequest({ query: listBreachNotificationsQuerySchema }),

  authenticate(),
  breachNotificationController.listBreachNotifications
);

/**
 * @description Get breach notification by ID
 * @method GET
 * @route /api/v1/breach-notifications/:id
 */
router.get(
  '/:id',  validateRequest({ params: breachNotificationIdParamsSchema }),

  authenticate(),
  breachNotificationController.getBreachNotificationById
);

/**
 * @description Create new breach notification
 * @method POST
 * @route /api/v1/breach-notifications/
 */
router.post(
  '/',  validateRequest({ body: createBreachNotificationSchema }),

  authenticate(),
  breachNotificationController.createBreachNotification
);

/**
 * @description Update breach notification
 * @method PUT
 * @route /api/v1/breach-notifications/:id
 */
router.put(
  '/:id',  validateRequest({ params: breachNotificationIdParamsSchema, body: updateBreachNotificationSchema }),

  authenticate(),
  breachNotificationController.updateBreachNotification
);

/**
 * @description Resolve breach notification
 * @method POST
 * @route /api/v1/breach-notifications/:id/resolve
 */
router.post(
  '/:id/resolve',  validateRequest({ params: breachNotificationIdParamsSchema, body: resolveBreachNotificationSchema }),

  authenticate(),
  breachNotificationController.resolveBreachNotification
);

/**
 * @description Delete breach notification (soft delete)
 * @method DELETE
 * @route /api/v1/breach-notifications/:id
 */
router.delete(
  '/:id',  validateRequest({ params: breachNotificationIdParamsSchema }),

  authenticate(),
  breachNotificationController.deleteBreachNotification
);

module.exports = router;
