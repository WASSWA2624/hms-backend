/**
 * Notification routes
 *
 * @module modules/notification/routes
 * @description Notification endpoints mounted at /api/v1/notifications
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const notificationController = require('@controllers/notification/notification.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createNotificationSchema,
  updateNotificationSchema,
  notificationIdParamsSchema,
  listNotificationsQuerySchema
} = require('@validations/notification/notification.schema');

/**
 * @description List notifications with pagination and filters
 * @method GET
 * @route /api/v1/notifications/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [tenant_id] - Filter by tenant ID (UUID)
 * @queryParams {string} [user_id] - Filter by user ID (UUID)
 * @queryParams {string} [notification_type] - Filter by type (SYSTEM, APPOINTMENT, BILLING, LAB, PHARMACY)
 * @queryParams {string} [priority] - Filter by priority (LOW, MEDIUM, HIGH, URGENT)
 * @queryParams {string} [is_read] - Filter by read status (true/false)
 * @bodyParams None
 * @returns {Object} Paginated list of notifications
 * @throws 401 Unauthorized
 */
router.get(
  '/',  validateRequest({ query: listNotificationsQuerySchema }),

  authenticate(),
  notificationController.listNotifications
);

/**
 * @description Get notification by ID
 * @method GET
 * @route /api/v1/notifications/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Notification ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Notification data
 * @throws 401 Unauthorized
 * @throws 404 Notification not found
 */
router.get(
  '/:id',  validateRequest({ params: notificationIdParamsSchema }),

  authenticate(),
  notificationController.getNotificationById
);

/**
 * @description Create new notification
 * @method POST
 * @route /api/v1/notifications/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} tenant_id - Tenant ID (required, UUID)
 * @bodyParams {string} [user_id] - User ID (UUID)
 * @bodyParams {string} notification_type - Notification type (required, SYSTEM/APPOINTMENT/BILLING/LAB/PHARMACY)
 * @bodyParams {string} priority - Priority (required, LOW/MEDIUM/HIGH/URGENT)
 * @bodyParams {string} title - Notification title (required, max 255 chars)
 * @bodyParams {string} message - Notification message (required)
 * @bodyParams {string} [read_at] - Read timestamp (ISO 8601 datetime)
 * @returns {Object} Created notification
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',  validateRequest({ body: createNotificationSchema }),

  authenticate(),
  notificationController.createNotification
);

/**
 * @description Update notification
 * @method PUT
 * @route /api/v1/notifications/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Notification ID (UUID)
 * @queryParams None
 * @bodyParams {string} [user_id] - User ID (UUID)
 * @bodyParams {string} [notification_type] - Notification type (SYSTEM/APPOINTMENT/BILLING/LAB/PHARMACY)
 * @bodyParams {string} [priority] - Priority (LOW/MEDIUM/HIGH/URGENT)
 * @bodyParams {string} [title] - Notification title (max 255 chars)
 * @bodyParams {string} [message] - Notification message
 * @bodyParams {string} [read_at] - Read timestamp (ISO 8601 datetime)
 * @returns {Object} Updated notification
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Notification not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',  validateRequest({ params: notificationIdParamsSchema, body: updateNotificationSchema }),

  authenticate(),
  notificationController.updateNotification
);

/**
 * @description Delete notification (soft delete)
 * @method DELETE
 * @route /api/v1/notifications/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Notification ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Notification not found
 */
router.delete(
  '/:id',  validateRequest({ params: notificationIdParamsSchema }),

  authenticate(),
  notificationController.deleteNotification
);

module.exports = router;
