/**
 * Analytics event routes
 *
 * @module modules/analytics-event/routes
 * @description Analytics event endpoints mounted at /api/v1/analytics-events
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const analyticsEventController = require('../controllers/analytics-event.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createAnalyticsEventSchema,
  updateAnalyticsEventSchema,
  analyticsEventIdParamsSchema,
  listAnalyticsEventsQuerySchema
} = require('../schemas/analytics-event.schema');

/**
 * @description List analytics events with pagination and filters
 * @method GET
 * @route /api/v1/analytics-events/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [tenant_id] - Filter by tenant ID (UUID)
 * @queryParams {string} [user_id] - Filter by user ID (UUID)
 * @queryParams {string} [event_name] - Filter by event name (partial match)
 * @queryParams {string} [search] - Search in event_name field
 * @queryParams {string} [occurred_at_from] - Filter by occurred_at from date (ISO 8601)
 * @queryParams {string} [occurred_at_to] - Filter by occurred_at to date (ISO 8601)
 * @bodyParams None
 * @returns {Object} Paginated list of analytics events
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listAnalyticsEventsQuerySchema }),
  analyticsEventController.listAnalyticsEvents
);

/**
 * @description Get analytics event by ID
 * @method GET
 * @route /api/v1/analytics-events/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Analytics event ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Analytics event data
 * @throws 401 Unauthorized
 * @throws 404 Analytics event not found
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: analyticsEventIdParamsSchema }),
  analyticsEventController.getAnalyticsEventById
);

/**
 * @description Create new analytics event
 * @method POST
 * @route /api/v1/analytics-events/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} tenant_id - Tenant ID (required, UUID)
 * @bodyParams {string} [user_id] - User ID (UUID, optional, nullable)
 * @bodyParams {string} event_name - Event name (required, max 255 chars)
 * @bodyParams {Object} [payload_json] - Event payload (JSON object, optional, nullable)
 * @bodyParams {string} [occurred_at] - Occurred at timestamp (ISO 8601)
 * @returns {Object} Created analytics event
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createAnalyticsEventSchema }),
  analyticsEventController.createAnalyticsEvent
);

/**
 * @description Update analytics event
 * @method PUT
 * @route /api/v1/analytics-events/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Analytics event ID (UUID)
 * @queryParams None
 * @bodyParams {string} [event_name] - Event name (max 255 chars)
 * @bodyParams {Object} [payload_json] - Event payload (JSON object, nullable)
 * @bodyParams {string} [occurred_at] - Occurred at timestamp (ISO 8601)
 * @returns {Object} Updated analytics event
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Analytics event not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: analyticsEventIdParamsSchema, body: updateAnalyticsEventSchema }),
  analyticsEventController.updateAnalyticsEvent
);

/**
 * @description Delete analytics event (soft delete)
 * @method DELETE
 * @route /api/v1/analytics-events/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Analytics event ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Analytics event not found
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: analyticsEventIdParamsSchema }),
  analyticsEventController.deleteAnalyticsEvent
);

module.exports = router;
