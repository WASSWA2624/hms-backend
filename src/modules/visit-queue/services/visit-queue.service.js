/**
 * Visit queue service
 *
 * @module modules/visit-queue/services
 * @description Business logic layer for visit queue operations.
 * Per module-creation.mdc: Only import/use its own repository, call audit logging for mutations.
 * Per prisma.mdc: Use $transaction for multi-step mutations.
 */

const visitQueueRepository = require('@repositories/visit-queue/visit-queue.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const { isUuidLike } = require('@lib/identifiers/sanitize-friendly-ids');
const {
  resolveModelIdByIdentifier,
  resolveModelRecordByIdentifier,
} = require('@lib/identifiers/resolve-entity-id');

const USER_IDENTIFIER_MATCHERS = [({ rawValue }) => ({ email: rawValue }), ({ rawValue }) => ({ phone: rawValue })];

const buildEmptyListResult = (page, limit) => ({
  entries: [],
  pagination: {
    page,
    limit,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: page > 1,
  },
});

const resolveFilterIdentifier = async ({
  value,
  model,
  where = {},
  additionalFriendlyMatchers = [],
}) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return undefined;

  const matchers = (additionalFriendlyMatchers || []).map((matcher) => (rawValue, upperValue) =>
    matcher({ rawValue, upperValue })
  );

  const resolvedId = await resolveModelIdByIdentifier({
    model,
    identifier: normalized,
    where,
    additionalFriendlyMatchers: matchers,
  });

  if (resolvedId) return resolvedId;
  if (isUuidLike(normalized)) return normalized;
  return null;
};

const resolvePayloadIdentifier = async ({
  value,
  field,
  model,
  where = {},
  nullable = false,
  additionalFriendlyMatchers = [],
}) => {
  if (value === undefined) return undefined;
  if (value === null) {
    if (nullable) return null;
    throw new HttpError('errors.validation.field.required', 400, [{ field }]);
  }

  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    throw new HttpError('errors.validation.invalid', 400, [{ field }]);
  }

  const matchers = (additionalFriendlyMatchers || []).map((matcher) => (rawValue, upperValue) =>
    matcher({ rawValue, upperValue })
  );

  const resolvedId = await resolveModelIdByIdentifier({
    model,
    identifier: normalized,
    where,
    additionalFriendlyMatchers: matchers,
  });

  if (resolvedId) return resolvedId;
  if (isUuidLike(normalized)) return normalized;

  throw new HttpError('errors.validation.invalid', 400, [{ field }]);
};

const resolveVisitQueuePayloadIdentifiers = async (data = {}, existing = null) => {
  const payload = { ...data };

  const tenantId =
    payload.tenant_id !== undefined
      ? await resolvePayloadIdentifier({
          value: payload.tenant_id,
          field: 'tenant_id',
          model: 'tenant',
        })
      : existing?.tenant_id;

  if (payload.tenant_id !== undefined) {
    payload.tenant_id = tenantId;
  }

  if (payload.facility_id !== undefined) {
    payload.facility_id = await resolvePayloadIdentifier({
      value: payload.facility_id,
      field: 'facility_id',
      model: 'facility',
      where: tenantId ? { tenant_id: tenantId } : {},
      nullable: true,
    });
  }

  if (payload.patient_id !== undefined) {
    payload.patient_id = await resolvePayloadIdentifier({
      value: payload.patient_id,
      field: 'patient_id',
      model: 'patient',
      where: tenantId ? { tenant_id: tenantId } : {},
    });
  }

  if (payload.appointment_id !== undefined) {
    payload.appointment_id = await resolvePayloadIdentifier({
      value: payload.appointment_id,
      field: 'appointment_id',
      model: 'appointment',
      where: tenantId ? { tenant_id: tenantId } : {},
      nullable: true,
    });
  }

  if (payload.provider_user_id !== undefined) {
    payload.provider_user_id = await resolvePayloadIdentifier({
      value: payload.provider_user_id,
      field: 'provider_user_id',
      model: 'user',
      where: tenantId ? { tenant_id: tenantId } : {},
      nullable: true,
      additionalFriendlyMatchers: USER_IDENTIFIER_MATCHERS,
    });
  }

  if (payload.queued_at !== undefined) {
    payload.queued_at = payload.queued_at instanceof Date ? payload.queued_at : new Date(payload.queued_at);
  }

  return payload;
};

const resolveVisitQueueRecordByIdentifier = async (identifier) => {
  const resolved = await resolveModelRecordByIdentifier({
    model: 'visit_queue',
    identifier,
    select: { id: true },
  });
  if (!resolved?.id) return null;
  return visitQueueRepository.findById(resolved.id);
};

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

  const resolvedTenantId = await resolveFilterIdentifier({
    value: filters.tenant_id,
    model: 'tenant',
  });
  if (filters.tenant_id !== undefined && resolvedTenantId === null) {
    return buildEmptyListResult(page, limit);
  }
  if (resolvedTenantId) {
    repoFilters.tenant_id = resolvedTenantId;
  }

  const resolvedFacilityId = await resolveFilterIdentifier({
    value: filters.facility_id,
    model: 'facility',
    where: resolvedTenantId ? { tenant_id: resolvedTenantId } : {},
  });
  if (filters.facility_id !== undefined && resolvedFacilityId === null) {
    return buildEmptyListResult(page, limit);
  }
  if (resolvedFacilityId !== undefined) {
    repoFilters.facility_id = resolvedFacilityId;
  }

  const resolvedPatientId = await resolveFilterIdentifier({
    value: filters.patient_id,
    model: 'patient',
    where: resolvedTenantId ? { tenant_id: resolvedTenantId } : {},
  });
  if (filters.patient_id !== undefined && resolvedPatientId === null) {
    return buildEmptyListResult(page, limit);
  }
  if (resolvedPatientId) {
    repoFilters.patient_id = resolvedPatientId;
  }

  const resolvedAppointmentId = await resolveFilterIdentifier({
    value: filters.appointment_id,
    model: 'appointment',
    where: resolvedTenantId ? { tenant_id: resolvedTenantId } : {},
  });
  if (filters.appointment_id !== undefined && resolvedAppointmentId === null) {
    return buildEmptyListResult(page, limit);
  }
  if (resolvedAppointmentId !== undefined) {
    repoFilters.appointment_id = resolvedAppointmentId;
  }

  const resolvedProviderUserId = await resolveFilterIdentifier({
    value: filters.provider_user_id,
    model: 'user',
    where: resolvedTenantId ? { tenant_id: resolvedTenantId } : {},
    additionalFriendlyMatchers: USER_IDENTIFIER_MATCHERS,
  });
  if (filters.provider_user_id !== undefined && resolvedProviderUserId === null) {
    return buildEmptyListResult(page, limit);
  }
  if (resolvedProviderUserId !== undefined) {
    repoFilters.provider_user_id = resolvedProviderUserId;
  }

  if (filters.status) {
    repoFilters.status = filters.status;
  }

  if (filters.search) {
    const searchTerm = String(filters.search).trim();
    const upperSearchTerm = searchTerm.toUpperCase();

    repoFilters.OR = [
      { human_friendly_id: { contains: upperSearchTerm } },
      {
        patient: {
          OR: [
            { human_friendly_id: { contains: upperSearchTerm } },
            { first_name: { contains: searchTerm } },
            { last_name: { contains: searchTerm } },
          ],
        },
      },
      {
        provider: {
          OR: [
            { human_friendly_id: { contains: upperSearchTerm } },
            { email: { contains: searchTerm } },
            { phone: { contains: searchTerm } },
            {
              profile: {
                is: {
                  OR: [
                    { first_name: { contains: searchTerm } },
                    { middle_name: { contains: searchTerm } },
                    { last_name: { contains: searchTerm } },
                  ],
                },
              },
            },
          ],
        },
      },
      {
        appointment: {
          is: {
            OR: [
              { human_friendly_id: { contains: upperSearchTerm } },
              { reason: { contains: searchTerm } },
            ],
          },
        },
      },
    ];
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
  const entry = await resolveVisitQueueRecordByIdentifier(id);
  
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
  const payload = await resolveVisitQueuePayloadIdentifiers(data);

  // Set queued_at to current time if not provided
  if (!payload.queued_at) {
    payload.queued_at = new Date();
  }

  const entry = await visitQueueRepository.create(payload);

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
  const beforeEntry = await resolveVisitQueueRecordByIdentifier(id);
  
  if (!beforeEntry) {
    throw new HttpError('errors.visit_queue.not_found', 404);
  }

  const payload = await resolveVisitQueuePayloadIdentifiers(data, beforeEntry);
  const updatedEntry = await visitQueueRepository.update(beforeEntry.id, payload);

  // Create audit log
  await createAuditLog({
    action: 'VISIT_QUEUE_UPDATED',
    entity: 'visit_queue',
    entity_id: beforeEntry.id,
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
  const entry = await resolveVisitQueueRecordByIdentifier(id);
  
  if (!entry) {
    throw new HttpError('errors.visit_queue.not_found', 404);
  }

  // Soft delete entry
  await visitQueueRepository.softDelete(entry.id);

  // Create audit log
  await createAuditLog({
    action: 'VISIT_QUEUE_DELETED',
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
};

/**
 * Prioritize visit queue entry (workflow action)
 *
 * @param {string} id - Visit queue entry ID
 * @param {Object} data - Prioritization data
 * @param {string} [data.reason] - Prioritization reason
 * @param {string} [data.status] - Status override
 * @param {Object} context - Request context for audit
 * @returns {Promise<Object>} Updated visit queue entry
 */
const prioritizeVisitQueue = async (id, data = {}, context = {}) => {
  // Check if entry exists and get before state
  const beforeEntry = await resolveVisitQueueRecordByIdentifier(id);

  if (!beforeEntry) {
    throw new HttpError('errors.visit_queue.not_found', 404);
  }

  // Prevent invalid transitions for terminal statuses.
  if (beforeEntry.status === 'COMPLETED' || beforeEntry.status === 'CANCELLED' || beforeEntry.status === 'NO_SHOW') {
    throw new HttpError('errors.visit_queue.cannot_prioritize_terminal_status', 400);
  }

  const updateData = {
    // Keep queue recency at the front when prioritized.
    queued_at: new Date(),
    status: data.status || 'CONFIRMED'
  };

  const updatedEntry = await visitQueueRepository.update(beforeEntry.id, updateData);

  await createAuditLog({
    action: 'VISIT_QUEUE_PRIORITIZED',
    entity: 'visit_queue',
    entity_id: beforeEntry.id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      reason: data.reason || null,
      before: {
        status: beforeEntry.status,
        queued_at: beforeEntry.queued_at
      },
      after: {
        status: updatedEntry.status,
        queued_at: updatedEntry.queued_at
      }
    }
  });

  return updatedEntry;
};

module.exports = {
  listVisitQueues,
  getVisitQueueById,
  createVisitQueue,
  updateVisitQueue,
  deleteVisitQueue,
  prioritizeVisitQueue
};
