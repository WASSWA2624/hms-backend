/**
 * Triage assessment service
 *
 * @module modules/triage-assessment/services
 * @description Business logic layer for triage assessment operations.
 * Per module-creation.mdc: Only import and use its own repository.
 * Per module-creation.mdc: All mutations must call audit log.
 */

const triageAssessmentRepository = require('@modules/triage-assessment/repositories/triage-assessment.repository');
const { HttpError } = require('@lib/errors');
const { createAuditLog } = require('@lib/audit');

/**
 * List triage assessments with pagination
 *
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated triage assessments
 */
const listTriageAssessments = async (filters = {}, page = 1, limit = 20, sortBy = 'created_at', order = 'desc') => {
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: order };

  const [items, total] = await Promise.all([
    triageAssessmentRepository.findMany(filters, skip, limit, orderBy),
    triageAssessmentRepository.count(filters)
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

/**
 * Get triage assessment by ID
 *
 * @param {string} id - Triage assessment ID
 * @returns {Promise<Object>} Triage assessment object
 * @throws {HttpError} If triage assessment not found
 */
const getTriageAssessmentById = async (id) => {
  const triageAssessment = await triageAssessmentRepository.findById(id);
  
  if (!triageAssessment) {
    throw new HttpError('errors.triage_assessment.not_found', 404);
  }

  return triageAssessment;
};

/**
 * Create new triage assessment
 *
 * @param {Object} data - Triage assessment data
 * @param {Object} user - User performing the action (for audit)
 * @returns {Promise<Object>} Created triage assessment
 */
const createTriageAssessment = async (data, user) => {
  const triageAssessment = await triageAssessmentRepository.create(data);

  await createAuditLog({
    action: 'CREATE',
    resource: 'triage_assessment',
    resource_id: triageAssessment.id,
    user_id: user.id,
    tenant_id: user.tenant_id,
    details: { data }
  });

  return triageAssessment;
};

/**
 * Update triage assessment
 *
 * @param {string} id - Triage assessment ID
 * @param {Object} data - Update data
 * @param {Object} user - User performing the action (for audit)
 * @returns {Promise<Object>} Updated triage assessment
 * @throws {HttpError} If triage assessment not found
 */
const updateTriageAssessment = async (id, data, user) => {
  const existing = await triageAssessmentRepository.findById(id);
  if (!existing) {
    throw new HttpError('errors.triage_assessment.not_found', 404);
  }

  const updated = await triageAssessmentRepository.update(id, data);

  await createAuditLog({
    action: 'UPDATE',
    resource: 'triage_assessment',
    resource_id: id,
    user_id: user.id,
    tenant_id: user.tenant_id,
    details: { before: existing, after: data }
  });

  return updated;
};

/**
 * Delete triage assessment (soft delete)
 *
 * @param {string} id - Triage assessment ID
 * @param {Object} user - User performing the action (for audit)
 * @returns {Promise<Object>} Deleted triage assessment
 * @throws {HttpError} If triage assessment not found
 */
const deleteTriageAssessment = async (id, user) => {
  const existing = await triageAssessmentRepository.findById(id);
  if (!existing) {
    throw new HttpError('errors.triage_assessment.not_found', 404);
  }

  const deleted = await triageAssessmentRepository.softDelete(id);

  await createAuditLog({
    action: 'DELETE',
    resource: 'triage_assessment',
    resource_id: id,
    user_id: user.id,
    tenant_id: user.tenant_id,
    details: { data: existing }
  });

  return deleted;
};

module.exports = {
  listTriageAssessments,
  getTriageAssessmentById,
  createTriageAssessment,
  updateTriageAssessment,
  deleteTriageAssessment
};
