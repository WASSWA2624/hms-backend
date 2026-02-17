/**
 * Patient controller
 *
 * @module modules/patient/controllers
 * @description Request handlers for patient endpoints.
 * Per module-creation.mdc: All methods wrapped with asyncHandler.
 * Per response-format.mdc: Use standardized response helpers.
 */

const patientService = require('@services/patient/patient.service');
const { asyncHandler } = require('@lib/async');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');
const { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT } = require('@config/constants');

/**
 * List patients with pagination
 * GET /api/v1/patients
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const listPatients = asyncHandler(async (req, res) => {
  const {
    tenant_id,
    facility_id,
    first_name,
    last_name,
    gender,
    is_active,
    search,
    page = DEFAULT_PAGE,
    limit = DEFAULT_PAGE_LIMIT,
    sort_by,
    order = 'asc'
  } = req.query;

  const filters = {
    tenant_id,
    facility_id,
    first_name,
    last_name,
    gender,
    is_active,
    search
  };

  const userId = req.user?.id;
  const ipAddress = req.ip;

  const result = await patientService.listPatients(
    filters,
    parseInt(page),
    parseInt(limit),
    sort_by,
    order,
    userId,
    ipAddress
  );

  sendPaginated(res, 'messages.patient.list.success', result.patients, result.pagination);
});

/**
 * Get patient by ID
 * GET /api/v1/patients/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const getPatientById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const patient = await patientService.getPatientById(id, userId, ipAddress);

  sendSuccess(res, 200, 'messages.patient.get.success', patient);
});

/**
 * Create new patient
 * POST /api/v1/patients
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const createPatient = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const patient = await patientService.createPatient(req.body, userId, ipAddress);

  sendSuccess(res, 201, 'messages.patient.create.success', patient);
});

/**
 * Update patient
 * PUT /api/v1/patients/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const updatePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  const patient = await patientService.updatePatient(id, req.body, userId, ipAddress);

  sendSuccess(res, 200, 'messages.patient.update.success', patient);
});

/**
 * Delete patient (soft delete)
 * DELETE /api/v1/patients/:id
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
const deletePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  await patientService.deletePatient(id, userId, ipAddress);

  sendNoContent(res);
});

module.exports = {
  listPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient
};
