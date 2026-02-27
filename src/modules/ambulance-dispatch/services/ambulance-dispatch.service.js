/**
 * Ambulance Dispatch service
 *
 * @module modules/ambulance-dispatch/services
 * @description Business logic for ambulance dispatch operations.
 * Per module-creation.mdc: Services contain business logic and call repositories.
 * Per module-creation.mdc: All mutations must call createAuditLog.
 */

const ambulanceDispatchRepository = require('@repositories/ambulance-dispatch/ambulance-dispatch.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const { isUuidLike } = require('@lib/identifiers/sanitize-friendly-ids');
const { resolveModelIdByIdentifier } = require('@lib/identifiers/resolve-entity-id');

const sanitizeIdentifier = (value) => (typeof value === 'string' ? value.trim() : '');
const toPublicIdentifier = (value) => {
  const normalized = sanitizeIdentifier(value);
  if (!normalized || isUuidLike(normalized)) return null;
  return normalized;
};
const resolveDisplayIdentifier = (...values) => {
  for (const value of values) {
    const displayValue = toPublicIdentifier(value);
    if (displayValue) return displayValue;
  }
  return null;
};
const resolvePatientDisplayName = (patient) => {
  const firstName = sanitizeIdentifier(patient?.first_name);
  const lastName = sanitizeIdentifier(patient?.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || null;
};

const buildEmptyListResult = (page, limit) => ({
  dispatches: [],
  pagination: {
    page,
    limit,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: page > 1,
  },
});

const resolveIdentifierForFilter = async ({ value, model, where = {} }) => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const normalized = sanitizeIdentifier(value);
  if (!normalized) return undefined;

  const resolved = await resolveModelIdByIdentifier({
    model,
    identifier: normalized,
    where,
  });
  if (resolved) return resolved;
  if (isUuidLike(normalized)) return normalized;
  return null;
};

const resolveIdentifierForPayload = async ({
  value,
  field,
  model,
  where = {},
}) => {
  if (value === undefined) return undefined;
  if (value === null) {
    throw new HttpError('errors.validation.field.required', 400, [{ field }]);
  }

  const normalized = sanitizeIdentifier(value);
  if (!normalized) {
    throw new HttpError('errors.validation.invalid', 400, [{ field }]);
  }

  const resolved = await resolveModelIdByIdentifier({
    model,
    identifier: normalized,
    where,
  });
  if (resolved) return resolved;
  if (isUuidLike(normalized)) return normalized;

  throw new HttpError('errors.validation.invalid', 400, [{ field }]);
};

const mapAmbulanceDispatchForDisplay = (record) => {
  if (!record || typeof record !== 'object') return record;

  return {
    ...record,
    display_id: resolveDisplayIdentifier(record.display_id, record.human_friendly_id, record.id),
    ambulance_display_id: resolveDisplayIdentifier(
      record.ambulance_display_id,
      record.ambulance?.human_friendly_id,
      record.ambulance_id
    ),
    ambulance_display_label: sanitizeIdentifier(record.ambulance_display_label || record.ambulance?.identifier) || null,
    emergency_case_display_id: resolveDisplayIdentifier(
      record.emergency_case_display_id,
      record.emergency_case?.human_friendly_id,
      record.emergency_case_id
    ),
    patient_display_id: resolveDisplayIdentifier(
      record.patient_display_id,
      record.emergency_case?.patient?.human_friendly_id
    ),
    patient_display_name: record.patient_display_name || resolvePatientDisplayName(record.emergency_case?.patient),
  };
};

const resolveAmbulanceDispatchId = async (id) => {
  const normalized = sanitizeIdentifier(id);
  if (!normalized) return normalized;

  const resolvedId = await resolveModelIdByIdentifier({
    model: 'ambulance_dispatch',
    identifier: normalized,
  });

  return resolvedId || normalized;
};

const resolveListFilters = async (filters = {}, page, limit) => {
  const resolvedFilters = {};

  if (filters.ambulance_id !== undefined) {
    const ambulanceId = await resolveIdentifierForFilter({
      value: filters.ambulance_id,
      model: 'ambulance',
    });
    if (ambulanceId === null) return buildEmptyListResult(page, limit);
    if (ambulanceId !== undefined) resolvedFilters.ambulance_id = ambulanceId;
  }

  if (filters.emergency_case_id !== undefined) {
    const emergencyCaseId = await resolveIdentifierForFilter({
      value: filters.emergency_case_id,
      model: 'emergency_case',
    });
    if (emergencyCaseId === null) return buildEmptyListResult(page, limit);
    if (emergencyCaseId !== undefined) resolvedFilters.emergency_case_id = emergencyCaseId;
  }

  if (filters.status) resolvedFilters.status = filters.status;

  const search = sanitizeIdentifier(filters.search);
  if (search) resolvedFilters.search = search;

  return resolvedFilters;
};

const resolveCreatePayload = async (data = {}) => {
  const payload = { ...data };

  payload.ambulance_id = await resolveIdentifierForPayload({
    value: payload.ambulance_id,
    field: 'ambulance_id',
    model: 'ambulance',
  });
  payload.emergency_case_id = await resolveIdentifierForPayload({
    value: payload.emergency_case_id,
    field: 'emergency_case_id',
    model: 'emergency_case',
  });

  return payload;
};

const resolveUpdatePayload = async (data = {}) => {
  const payload = { ...data };

  if (payload.ambulance_id !== undefined) {
    payload.ambulance_id = await resolveIdentifierForPayload({
      value: payload.ambulance_id,
      field: 'ambulance_id',
      model: 'ambulance',
    });
  }

  if (payload.emergency_case_id !== undefined) {
    payload.emergency_case_id = await resolveIdentifierForPayload({
      value: payload.emergency_case_id,
      field: 'emergency_case_id',
      model: 'emergency_case',
    });
  }

  return payload;
};

/**
 * List ambulance dispatches with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {string} [filters.ambulance_id] - Filter by ambulance ID
 * @param {string} [filters.emergency_case_id] - Filter by emergency case ID
 * @param {string} [filters.status] - Filter by status
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} [sort_by] - Field to sort by
 * @param {string} [order] - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated ambulance dispatches
 */
const listAmbulanceDispatches = async (filters = {}, page = 1, limit = 20, sort_by = 'created_at', order = 'desc') => {
  const resolvedFilters = await resolveListFilters(filters, page, limit);
  if (resolvedFilters && resolvedFilters.dispatches && resolvedFilters.pagination) {
    return resolvedFilters;
  }

  const skip = (page - 1) * limit;
  const orderBy = { [sort_by]: order };

  const [dispatches, total] = await Promise.all([
    ambulanceDispatchRepository.findMany(resolvedFilters, skip, limit, orderBy),
    ambulanceDispatchRepository.count(resolvedFilters),
  ]);

  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    dispatches: dispatches.map(mapAmbulanceDispatchForDisplay),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
};

/**
 * Get ambulance dispatch by ID
 *
 * @param {string} id - Ambulance Dispatch ID
 * @returns {Promise<Object>} Ambulance Dispatch data
 */
const getAmbulanceDispatchById = async (id) => {
  const resolvedId = await resolveAmbulanceDispatchId(id);
  const dispatch = await ambulanceDispatchRepository.findById(resolvedId);

  if (!dispatch) {
    throw new HttpError('errors.ambulance_dispatch.not_found', 404);
  }

  return mapAmbulanceDispatchForDisplay(dispatch);
};

/**
 * Create new ambulance dispatch
 *
 * @param {Object} data - Ambulance Dispatch data
 * @param {string} data.ambulance_id - Ambulance ID
 * @param {string} data.emergency_case_id - Emergency Case ID
 * @param {string} [data.dispatched_at] - Dispatched at timestamp
 * @param {string} data.status - Dispatch status
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Created ambulance dispatch
 */
const createAmbulanceDispatch = async (data, context = {}) => {
  const payload = await resolveCreatePayload(data);
  const dispatch = await ambulanceDispatchRepository.create(payload);

  await createAuditLog({
    action: 'AMBULANCE_DISPATCH_CREATED',
    entity: 'ambulance_dispatch',
    entity_id: dispatch.id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      ambulance_id: dispatch.ambulance_id,
      emergency_case_id: dispatch.emergency_case_id,
      dispatched_at: dispatch.dispatched_at,
      status: dispatch.status,
    },
  });

  return mapAmbulanceDispatchForDisplay(dispatch);
};

/**
 * Update ambulance dispatch
 *
 * @param {string} id - Ambulance Dispatch ID
 * @param {Object} data - Update data
 * @param {string} [data.ambulance_id] - Ambulance ID
 * @param {string} [data.emergency_case_id] - Emergency Case ID
 * @param {string} [data.dispatched_at] - Dispatched at timestamp
 * @param {string} [data.status] - Dispatch status
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<Object>} Updated ambulance dispatch
 */
const updateAmbulanceDispatch = async (id, data, context = {}) => {
  const resolvedId = await resolveAmbulanceDispatchId(id);
  const beforeDispatch = await ambulanceDispatchRepository.findById(resolvedId);

  if (!beforeDispatch) {
    throw new HttpError('errors.ambulance_dispatch.not_found', 404);
  }

  const payload = await resolveUpdatePayload(data);
  const dispatch = await ambulanceDispatchRepository.update(beforeDispatch.id, payload);

  await createAuditLog({
    action: 'AMBULANCE_DISPATCH_UPDATED',
    entity: 'ambulance_dispatch',
    entity_id: beforeDispatch.id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      before: {
        ambulance_id: beforeDispatch.ambulance_id,
        emergency_case_id: beforeDispatch.emergency_case_id,
        dispatched_at: beforeDispatch.dispatched_at,
        status: beforeDispatch.status,
      },
      after: {
        ambulance_id: dispatch.ambulance_id,
        emergency_case_id: dispatch.emergency_case_id,
        dispatched_at: dispatch.dispatched_at,
        status: dispatch.status,
      },
    },
  });

  return mapAmbulanceDispatchForDisplay(dispatch);
};

/**
 * Delete ambulance dispatch (soft delete)
 *
 * @param {string} id - Ambulance Dispatch ID
 * @param {Object} context - Request context for audit
 * @param {string} [context.user_id] - User ID performing the action
 * @param {string} [context.tenant_id] - Tenant ID
 * @param {string} [context.facility_id] - Facility ID
 * @param {string} [context.ip_address] - IP address
 * @param {string} [context.user_agent] - User agent
 * @returns {Promise<void>}
 */
const deleteAmbulanceDispatch = async (id, context = {}) => {
  const resolvedId = await resolveAmbulanceDispatchId(id);
  const dispatch = await ambulanceDispatchRepository.findById(resolvedId);

  if (!dispatch) {
    throw new HttpError('errors.ambulance_dispatch.not_found', 404);
  }

  await ambulanceDispatchRepository.softDelete(dispatch.id);

  await createAuditLog({
    action: 'AMBULANCE_DISPATCH_DELETED',
    entity: 'ambulance_dispatch',
    entity_id: dispatch.id,
    user_id: context.user_id,
    tenant_id: context.tenant_id,
    facility_id: context.facility_id,
    ip_address: context.ip_address,
    user_agent: context.user_agent,
    details: {
      ambulance_id: dispatch.ambulance_id,
      emergency_case_id: dispatch.emergency_case_id,
      dispatched_at: dispatch.dispatched_at,
      status: dispatch.status,
    },
  });
};

module.exports = {
  listAmbulanceDispatches,
  getAmbulanceDispatchById,
  createAmbulanceDispatch,
  updateAmbulanceDispatch,
  deleteAmbulanceDispatch,
};
