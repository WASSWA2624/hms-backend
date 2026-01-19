/**
 * Appointment routes
 *
 * @module modules/appointment/routes
 * @description Appointment endpoints mounted at /api/v1/appointments
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const appointmentController = require('@controllers/appointment/appointment.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createAppointmentSchema,
  updateAppointmentSchema,
  cancelAppointmentSchema,
  appointmentIdParamsSchema,
  listAppointmentsQuerySchema
} = require('@validations/appointment/appointment.schema');

/**
 * @description List appointments with pagination and filters
 * @method GET
 * @route /api/v1/appointments/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams {number} [page=1] - Page number
 * @queryParams {number} [limit=20] - Items per page
 * @queryParams {string} [sort_by=created_at] - Field to sort by
 * @queryParams {string} [order=desc] - Sort order (asc/desc)
 * @queryParams {string} [tenant_id] - Filter by tenant ID (UUID)
 * @queryParams {string} [facility_id] - Filter by facility ID (UUID)
 * @queryParams {string} [patient_id] - Filter by patient ID (UUID)
 * @queryParams {string} [provider_user_id] - Filter by provider user ID (UUID)
 * @queryParams {string} [status] - Filter by status (SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW)
 * @queryParams {string} [search] - Search in reason field
 * @bodyParams None
 * @returns {Object} Paginated list of appointments
 * @throws 401 Unauthorized
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listAppointmentsQuerySchema }),
  appointmentController.listAppointments
);

/**
 * @description Get appointment by ID
 * @method GET
 * @route /api/v1/appointments/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Appointment ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {Object} Appointment data
 * @throws 401 Unauthorized
 * @throws 404 Appointment not found
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: appointmentIdParamsSchema }),
  appointmentController.getAppointmentById
);

/**
 * @description Create new appointment
 * @method POST
 * @route /api/v1/appointments/
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams None
 * @queryParams None
 * @bodyParams {string} tenant_id - Tenant ID (required, UUID)
 * @bodyParams {string} [facility_id] - Facility ID (UUID)
 * @bodyParams {string} patient_id - Patient ID (required, UUID)
 * @bodyParams {string} [provider_user_id] - Provider user ID (UUID)
 * @bodyParams {string} status - Appointment status (required, SCHEDULED/CONFIRMED/IN_PROGRESS/COMPLETED/CANCELLED/NO_SHOW)
 * @bodyParams {string} scheduled_start - Scheduled start time (required, ISO 8601 datetime)
 * @bodyParams {string} scheduled_end - Scheduled end time (required, ISO 8601 datetime)
 * @bodyParams {string} [reason] - Appointment reason (max 65535 chars)
 * @returns {Object} Created appointment
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createAppointmentSchema }),
  appointmentController.createAppointment
);

/**
 * @description Update appointment
 * @method PUT
 * @route /api/v1/appointments/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Appointment ID (UUID)
 * @queryParams None
 * @bodyParams {string} [facility_id] - Facility ID (UUID)
 * @bodyParams {string} [patient_id] - Patient ID (UUID)
 * @bodyParams {string} [provider_user_id] - Provider user ID (UUID)
 * @bodyParams {string} [status] - Appointment status (SCHEDULED/CONFIRMED/IN_PROGRESS/COMPLETED/CANCELLED/NO_SHOW)
 * @bodyParams {string} [scheduled_start] - Scheduled start time (ISO 8601 datetime)
 * @bodyParams {string} [scheduled_end] - Scheduled end time (ISO 8601 datetime)
 * @bodyParams {string} [reason] - Appointment reason (max 65535 chars)
 * @returns {Object} Updated appointment
 * @throws 401 Unauthorized
 * @throws 400 Validation error
 * @throws 404 Appointment not found
 * @throws 400 Foreign key constraint violation
 * @throws 409 Unique constraint violation
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: appointmentIdParamsSchema, body: updateAppointmentSchema }),
  appointmentController.updateAppointment
);

/**
 * @description Delete appointment (soft delete)
 * @method DELETE
 * @route /api/v1/appointments/:id
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Appointment ID (UUID)
 * @queryParams None
 * @bodyParams None
 * @returns {void} 204 No Content
 * @throws 401 Unauthorized
 * @throws 404 Appointment not found
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: appointmentIdParamsSchema }),
  appointmentController.deleteAppointment
);

/**
 * @description Cancel appointment
 * @method POST
 * @route /api/v1/appointments/:id/cancel
 * @authentication Required (JWT)
 * @permissions Authenticated users
 * @urlParams {string} id - Appointment ID (UUID)
 * @queryParams None
 * @bodyParams {string} [reason] - Cancellation reason (max 65535 chars)
 * @returns {Object} Cancelled appointment
 * @throws 401 Unauthorized
 * @throws 404 Appointment not found
 * @throws 400 Appointment already cancelled
 */
router.post(
  '/:id/cancel',
  authenticate(),
  validateRequest({ params: appointmentIdParamsSchema, body: cancelAppointmentSchema }),
  appointmentController.cancelAppointment
);

module.exports = router;
