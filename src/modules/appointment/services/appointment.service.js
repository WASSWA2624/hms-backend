/**
 * Appointment service
 *
 * @module modules/appointment/services
 * @description Business logic layer for appointment operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const appointmentRepository = require('@repositories/appointment/appointment.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const opdFlowService = require('@services/opd-flow/opd-flow.service');
const { isUuidLike } = require('@lib/identifiers/sanitize-friendly-ids');
const { resolveModelIdByIdentifier } = require('@lib/identifiers/resolve-entity-id');

const USER_IDENTIFIER_MATCHERS = [({ rawValue }) => ({ email: rawValue }), ({ rawValue }) => ({ phone: rawValue })];

const buildEmptyListResult = (page, limit) => ({
  appointments: [],
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

const resolveAppointmentPayloadIdentifiers = async (data = {}, existing = null) => {
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

  return payload;
};

const normalizeStatus = (value) => String(value || '').trim().toUpperCase();

const shouldAutoStartOpdFlow = (before, appointment, updateData = {}) => {
  const nextStatus = normalizeStatus(appointment?.status || updateData?.status);
  if (nextStatus !== 'IN_PROGRESS') return false;

  const previousStatus = normalizeStatus(before?.status);
  return previousStatus !== 'IN_PROGRESS';
};

const maybeAutoStartOpdFlow = async ({ before, appointment, updateData, userId, ipAddress }) => {
  if (!appointment?.id) return;
  if (!shouldAutoStartOpdFlow(before, appointment, updateData)) return;

  try {
    await opdFlowService.startOpdFlow(
      {
        appointment_id: appointment.id,
        arrival_mode: 'ONLINE_APPOINTMENT',
        tenant_id: appointment.tenant_id || undefined,
        facility_id: appointment.facility_id || undefined,
        notes: 'Auto-started from appointment status transition to IN_PROGRESS.',
      },
      {
        user_id: userId,
        tenant_id: appointment.tenant_id || undefined,
        facility_id: appointment.facility_id || undefined,
        ip_address: ipAddress,
      }
    );
  } catch (_error) {
    // Keep appointment lifecycle updates non-blocking even if OPD orchestration fails.
  }
};

/**
 * List appointments with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Appointments and pagination data
 */
const listAppointments = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};

    const tenantId = await resolveFilterIdentifier({
      value: filters.tenant_id,
      model: 'tenant',
    });
    if (filters.tenant_id !== undefined && tenantId === null) {
      return buildEmptyListResult(page, limit);
    }
    if (tenantId) whereClause.tenant_id = tenantId;

    const facilityId = await resolveFilterIdentifier({
      value: filters.facility_id,
      model: 'facility',
      where: tenantId ? { tenant_id: tenantId } : {},
    });
    if (filters.facility_id !== undefined && facilityId === null) {
      return buildEmptyListResult(page, limit);
    }
    if (facilityId !== undefined) whereClause.facility_id = facilityId;

    const patientId = await resolveFilterIdentifier({
      value: filters.patient_id,
      model: 'patient',
      where: tenantId ? { tenant_id: tenantId } : {},
    });
    if (filters.patient_id !== undefined && patientId === null) {
      return buildEmptyListResult(page, limit);
    }
    if (patientId) whereClause.patient_id = patientId;

    const providerUserId = await resolveFilterIdentifier({
      value: filters.provider_user_id,
      model: 'user',
      where: tenantId ? { tenant_id: tenantId } : {},
      additionalFriendlyMatchers: USER_IDENTIFIER_MATCHERS,
    });
    if (filters.provider_user_id !== undefined && providerUserId === null) {
      return buildEmptyListResult(page, limit);
    }
    if (providerUserId !== undefined) whereClause.provider_user_id = providerUserId;

    if (filters.status) whereClause.status = filters.status;

    if (filters.search) {
      const searchTerm = String(filters.search).trim();
      const upperSearchTerm = searchTerm.toUpperCase();
      whereClause.OR = [
        { reason: { contains: searchTerm } },
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
      ];
    }

    const [appointments, total] = await Promise.all([
      appointmentRepository.findMany(whereClause, skip, limit, orderBy),
      appointmentRepository.count(whereClause)
    ]);

    return {
      appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1
      }
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Get appointment by ID
 *
 * @param {string} id - Appointment ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Appointment data
 */
const getAppointmentById = async (id, userId, ipAddress) => {
  try {
    const appointment = await appointmentRepository.findById(id);

    if (!appointment) {
      throw new HttpError('errors.appointment.not_found', 404);
    }

    return appointment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new appointment
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Appointment data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created appointment
 */
const createAppointment = async (data, userId, ipAddress) => {
  try {
    const payload = await resolveAppointmentPayloadIdentifiers(data);
    const appointment = await appointmentRepository.create(payload);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'appointment',
      entity_id: appointment.id,
      diff: { after: appointment },
      ip_address: ipAddress
    }).catch(() => {});

    return appointment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update appointment
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Appointment ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated appointment
 */
const updateAppointment = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await appointmentRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.appointment.not_found', 404);
    }

    const payload = await resolveAppointmentPayloadIdentifiers(data, before);
    const appointment = await appointmentRepository.update(before.id, payload);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'appointment',
      entity_id: appointment.id,
      diff: { before, after: appointment },
      ip_address: ipAddress
    }).catch(() => {});

    await maybeAutoStartOpdFlow({
      before,
      appointment,
      updateData: payload,
      userId,
      ipAddress,
    });

    return appointment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete appointment (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Appointment ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteAppointment = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await appointmentRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.appointment.not_found', 404);
    }

    await appointmentRepository.softDelete(before.id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'appointment',
      entity_id: before.id,
      diff: { before },
      ip_address: ipAddress
    }).catch(() => {});
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Cancel appointment (action endpoint)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Appointment ID
 * @param {string} reason - Cancellation reason (optional)
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Cancelled appointment
 */
const cancelAppointment = async (id, reason, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await appointmentRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.appointment.not_found', 404);
    }

    // Check if already cancelled
    if (before.status === 'CANCELLED') {
      throw new HttpError('errors.appointment.already_cancelled', 400);
    }

    // Update to cancelled status
    const updateData = {
      status: 'CANCELLED'
    };

    // Optionally append cancellation reason to existing reason
    if (reason) {
      updateData.reason = before.reason 
        ? `${before.reason}\nCancellation reason: ${reason}`
        : `Cancellation reason: ${reason}`;
    }

    const appointment = await appointmentRepository.update(before.id, updateData);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CANCEL',
      entity: 'appointment',
      entity_id: appointment.id,
      diff: { before, after: appointment },
      ip_address: ipAddress
    }).catch(() => {});

    return appointment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  cancelAppointment
};
