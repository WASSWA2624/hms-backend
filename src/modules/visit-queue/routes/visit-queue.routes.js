/**
 * Visit queue routes
 *
 * @module modules/visit-queue/routes
 * @description Visit queue endpoints mounted at /api/v1/visit-queues
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const visitQueueController = require('@controllers/visit-queue/visit-queue.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createVisitQueueSchema,
  updateVisitQueueSchema,
  visitQueueIdParamsSchema,
  listVisitQueuesQuerySchema
} = require('@validations/visit-queue/visit-queue.schema');

/**
 * @description List visit queue entries with pagination and filters
 * @method GET
 * @route /api/v1/visit-queues/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=queued_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [tenant_id] - Filter by tenant ID (UUID)
 * @queryParams {string} [facility_id] - Filter by facility ID (UUID)
 * @queryParams {string} [patient_id] - Filter by patient ID (UUID)
 * @queryParams {string} [appointment_id] - Filter by appointment ID (UUID)
 * @queryParams {string} [provider_user_id] - Filter by provider user ID (UUID)
 * @queryParams {string} [status] - Filter by status (SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW)
 * @queryParams {string} [search] - Search query
 * @bodyParams None
 * @returns {Object} Paginated list of visit queue entries
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listVisitQueuesQuerySchema }),
  visitQueueController.listVisitQueues
);

/**
 * @description Get visit queue entry by ID
 * @method GET
 * @route /api/v1/visit-queues/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Visit queue entry ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Visit queue entry data
 * @throws 401 Unauthorized
 * @throws 404 Visit queue entry not found
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: visitQueueIdParamsSchema }),
  visitQueueController.getVisitQueueById
);

/**
 * @description Create new visit queue entry
 * @method POST
 * @route /api/v1/visit-queues/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} tenant_id - Tenant ID (required, UUID)
 * @bodyParams {string} [facility_id] - Facility ID (UUID)
 * @bodyParams {string} patient_id - Patient ID (required, UUID)
 * @bodyParams {string} [appointment_id] - Appointment ID (UUID)
 * @bodyParams {string} [provider_user_id] - Provider user ID (UUID)
 * @bodyParams {string} status - Status (required, SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW)
 * @bodyParams {string} [queued_at] - Queue time (ISO 8601 datetime)
 * @returns {Object} Created visit queue entry
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createVisitQueueSchema }),
  visitQueueController.createVisitQueue
);

/**
 * @description Update visit queue entry
 * @method PUT
 * @route /api/v1/visit-queues/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Visit queue entry ID (UUID)
 * @queryParams None
 * @bodyParams {string} [facility_id] - Facility ID (UUID)
 * @bodyParams {string} [appointment_id] - Appointment ID (UUID)
 * @bodyParams {string} [provider_user_id] - Provider user ID (UUID)
 * @bodyParams {string} [status] - Status (SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW)
 * @bodyParams {string} [queued_at] - Queue time (ISO 8601 datetime)
 * @returns {Object} Updated visit queue entry
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Visit queue entry not found
 * @throws 400 Foreign key constraint violation
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: visitQueueIdParamsSchema, body: updateVisitQueueSchema }),
  visitQueueController.updateVisitQueue
);

/**
 * @description Delete visit queue entry (soft delete)
 * @method DELETE
 * @route /api/v1/visit-queues/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Visit queue entry ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Visit queue entry not found
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: visitQueueIdParamsSchema }),
  visitQueueController.deleteVisitQueue
);

module.exports = router;
