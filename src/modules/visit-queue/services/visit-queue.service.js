/**
 * Visit queue service
 *
 * @module modules/visit-queue/services
 * @description Business logic layer for visit queue operations.
 * Per module-creation.mdc: Only import/use its own repository, call audit logging for mutations.
 * Per prisma.mdc: Use $transaction for multi-step mutations.
 */

const visitQueueRepository = require('@modules/visit-queue/repositories/visit-queue.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List visit queue entries with pagination
 *
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (asc/desc)
 * @returns {Promise<Object>} Visit queue entries and pagination metadata
 */
const listVisitQueues = async (filters = {}, page = 1, limit = 20, sortBy = 'queued_at', order = 'desc') => {
  // Build repository filters
  const repoFilters = {};

  if (filters.tenant_id) {
    repoFilters.tenant_id = filters.tenant_id;
  }

  if (filters.facility_id) {
    repoFilters.facility_id = filters.facility_id;
  }

  if (filters.patient_id) {
    repoFilters.patient_id = filters.patient_id;
  }

  if (filters.appointment_id) {
    repoFilters.appointment_id = filters.appointment_id;
  }

  if (filters.provider_user_id) {
    repoFilters.provider_user_id = filters.provider_user_id;
  }

  if (filters.status) {
    repoFilters.status = filters.status;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Build sort order
  const orderBy = {};
  orderBy[sortBy] = order;

  // Fetch entries and count
  const [entries, total] = await Promise.all([
    visitQueueRepository.findMany(repoFilters, skip, limit, orderBy),
    visitQueueRepository.count(repoFilters)
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    entries,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage
    }
  };
};

/**
 * Get visit queue entry by ID
 *
 * @param {string} id - Visit queue entry ID
 * @returns {Promise<Object>} Visit queue entry
 * @throws {HttpError} 404 if not found
 */
const getVisitQueueById = async (id) => {
  const entry = await visitQueueRepository.findById(id);
  
  if (!entry) {
    throw new HttpError('errors.visit_queue.not_found', 404);
  }

  return entry;
};

/**
 * Create visit queue entry
 *
 * @param {Object} data - Visit queue entry data
 * @param {Object} context - Request context for audit
 * @returns {Promise<Object>} Created visit queue entry
 */
const createVisitQueue = async (data, context = {}) => {
  // Set queued_at to current time if not provided
  if (!data.queued_at) {
    data.queued_at = new Date();
  }

  const entry = await visitQueueRepository.create(data);

  // Create audit log
  await createAuditLog({
    action: 'VISIT_QUEUE_CREATED',
    entity: 'visit_queue',
    entity_id: entry.id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      tenant_id: entry.tenant_id,
      facility_id: entry.facility_id,
      patient_id: entry.patient_id,
      appointment_id: entry.appointment_id,
      provider_user_id: entry.provider_user_id,
      status: entry.status,
      queued_at: entry.queued_at
    }
  });

  return entry;
};

/**
 * Update visit queue entry
 *
 * @param {string} id - Visit queue entry ID
 * @param {Object} data - Update data
 * @param {Object} context - Request context for audit
 * @returns {Promise<Object>} Updated visit queue entry
 */
const updateVisitQueue = async (id, data, context = {}) => {
  // Check if entry exists and get before state
  const beforeEntry = await visitQueueRepository.findById(id);
  
  if (!beforeEntry) {
    throw new HttpError('errors.visit_queue.not_found', 404);
  }

  const updatedEntry = await visitQueueRepository.update(id, data);

  // Create audit log
  await createAuditLog({
    action: 'VISIT_QUEUE_UPDATED',
    entity: 'visit_queue',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      before: {
        facility_id: beforeEntry.facility_id,
        appointment_id: beforeEntry.appointment_id,
        provider_user_id: beforeEntry.provider_user_id,
        status: beforeEntry.status,
        queued_at: beforeEntry.queued_at
      },
      after: {
        facility_id: updatedEntry.facility_id,
        appointment_id: updatedEntry.appointment_id,
        provider_user_id: updatedEntry.provider_user_id,
        status: updatedEntry.status,
        queued_at: updatedEntry.queued_at
      }
    }
  });

  return updatedEntry;
};

/**
 * Delete visit queue entry (soft delete)
 *
 * @param {string} id - Visit queue entry ID
 * @param {Object} context - Request context for audit
 * @returns {Promise<void>}
 */
const deleteVisitQueue = async (id, context = {}) => {
  // Check if entry exists
  const entry = await visitQueueRepository.findById(id);
  
  if (!entry) {
    throw new HttpError('errors.visit_queue.not_found', 404);
  }

  // Soft delete entry
  await visitQueueRepository.softDelete(id);

  // Create audit log
  await createAuditLog({
    action: 'VISIT_QUEUE_DELETED',
    entity: 'visit_queue',
    entity_id: id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      tenant_id: entry.tenant_id,
      facility_id: entry.facility_id,
      patient_id: entry.patient_id,
      appointment_id: entry.appointment_id,
      provider_user_id: entry.provider_user_id,
      status: entry.status,
      queued_at: entry.queued_at
    }
  });
};

module.exports = {
  listVisitQueues,
  getVisitQueueById,
  createVisitQueue,
  updateVisitQueue,
  deleteVisitQueue
};
