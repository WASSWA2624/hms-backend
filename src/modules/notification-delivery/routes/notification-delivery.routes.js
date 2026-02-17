/**
 * NotificationDelivery routes
 *
 * @module modules/notification-delivery/routes
 * @description NotificationDelivery endpoints mounted at /api/v1/notification-deliveries
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const notificationDeliveryController = require('@controllers/notification-delivery/notification-delivery.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createNotificationDeliverySchema,
  updateNotificationDeliverySchema,
  notificationDeliveryIdParamsSchema,
  listNotificationDeliveriesQuerySchema
} = require('@validations/notification-delivery/notification-delivery.schema');

/**
 * @description List notification-deliveries with pagination and filters
 * @method GET
 * @route /api/v1/notification-deliveries/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [notification_id] - Filter by notification ID (UUID)
 * @queryParams {string} [channel] - Filter by channel (EMAIL, SMS, PUSH, WHATSAPP, IN_APP)
 * @queryParams {string} [status] - Filter by status
 * @bodyParams None
 * @returns {Object} Paginated list of notification-deliveries
 * @throws 401 Unauthorized
 */
router.get(
  '/',  validateRequest({ query: listNotificationDeliveriesQuerySchema }),

  authenticate(),
  notificationDeliveryController.listNotificationDeliveries
);

/**
 * @description Get notification-delivery by ID
 * @method GET
 * @route /api/v1/notification-deliveries/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - NotificationDelivery ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} NotificationDelivery data
 * @throws 401 Unauthorized
 * @throws 404 NotificationDelivery not found
 */
router.get(
  '/:id',  validateRequest({ params: notificationDeliveryIdParamsSchema }),

  authenticate(),
  notificationDeliveryController.getNotificationDeliveryById
);

/**
 * @description Create new notification-delivery
 * @method POST
 * @route /api/v1/notification-deliveries/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} notification_id - Notification ID (required, UUID)
 * @bodyParams {string} channel - Communication channel (required, EMAIL/SMS/PUSH/WHATSAPP/IN_APP)
 * @bodyParams {string} [status] - Delivery status (max 60 chars)
 * @bodyParams {string} [sent_at] - Sent timestamp (ISO 8601 datetime)
 * @returns {Object} Created notification-delivery
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',  validateRequest({ body: createNotificationDeliverySchema }),

  authenticate(),
  notificationDeliveryController.createNotificationDelivery
);

/**
 * @description Update notification-delivery
 * @method PUT
 * @route /api/v1/notification-deliveries/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - NotificationDelivery ID (UUID)
 * @queryParams None
 * @bodyParams {string} [channel] - Communication channel (EMAIL/SMS/PUSH/WHATSAPP/IN_APP)
 * @bodyParams {string} [status] - Delivery status (max 60 chars)
 * @bodyParams {string} [sent_at] - Sent timestamp (ISO 8601 datetime)
 * @returns {Object} Updated notification-delivery
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 NotificationDelivery not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',  validateRequest({ params: notificationDeliveryIdParamsSchema, body: updateNotificationDeliverySchema }),

  authenticate(),
  notificationDeliveryController.updateNotificationDelivery
);

/**
 * @description Delete notification-delivery (soft delete)
 * @method DELETE
 * @route /api/v1/notification-deliveries/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - NotificationDelivery ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 NotificationDelivery not found
 */
router.delete(
  '/:id',  validateRequest({ params: notificationDeliveryIdParamsSchema }),

  authenticate(),
  notificationDeliveryController.deleteNotificationDelivery
);

module.exports = router;
