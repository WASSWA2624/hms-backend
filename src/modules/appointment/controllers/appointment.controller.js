/**
 * Appointment controller
 *
 * @module modules/appointment/controllers
 * @description Request handlers for appointment endpoints.
 * Per module-creation.mdc: All methods wrapped with asyncHandler.
 * Per response-format.mdc: Use standardized response helpers.
 */

const appointmentService = require('../services/appointment.service');
const { asyncHandler } = require('@lib/async');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');
const { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT } = require('@config/constants');

/**
 * List appointments with pagination
 * GET /api/v1/appointments
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const listAppointments = asyncHandler(async (req, res) => {
  const {
    tenant_id,
    facility_id,
    patient_id,
    provider_user_id,
    status,
    search,
    page = DEFAULT_PAGE,
    limit = DEFAULT_PAGE_LIMIT,
    sort_by,
    order = 'asc'
  } = req.query;

  const filters = {
    tenant_id,
    facility_id,
    patient_id,
    provider_user_id,
    status,
    search
  };

  const userId = req.user?.id;
  const ipAddress = req.ip;

  const result = await appointmentService.listAppointments(
    filters,
    parseInt(page),
    parseInt(limit),
    sort_by,
    order,
    userId,
    ipAddress
  );

  sendPaginated(res, 'messages.appointment.list.success', result.appointments, result.pagination);
});

/**
 * Get appointment by ID
 * GET /api/v1/appointments/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const getAppointmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const appointment = await appointmentService.getAppointmentById(id, userId, ipAddress);

  sendSuccess(res, 200, 'messages.appointment.get.success', appointment);
});

/**
 * Create new appointment
 * POST /api/v1/appointments
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const createAppointment = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const appointment = await appointmentService.createAppointment(req.body, userId, ipAddress);

  sendSuccess(res, 201, 'messages.appointment.create.success', appointment);
});

/**
 * Update appointment
 * PUT /api/v1/appointments/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const updateAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const appointment = await appointmentService.updateAppointment(id, req.body, userId, ipAddress);

  sendSuccess(res, 200, 'messages.appointment.update.success', appointment);
});

/**
 * Delete appointment (soft delete)
 * DELETE /api/v1/appointments/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const deleteAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  await appointmentService.deleteAppointment(id, userId, ipAddress);

  sendNoContent(res);
});

/**
 * Cancel appointment
 * POST /api/v1/appointments/:id/cancel
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const appointment = await appointmentService.cancelAppointment(id, reason, userId, ipAddress);

  sendSuccess(res, 200, 'messages.appointment.cancel.success', appointment);
});

module.exports = {
  listAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  cancelAppointment
};
