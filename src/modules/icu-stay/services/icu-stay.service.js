/**
 * ICU Stay service
 *
 * @module modules/icu-stay/services
 * @description Business logic layer for ICU stay operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const icuStayRepository = require('@repositories/icu-stay/icu-stay.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const { resolveModelIdByIdentifier } = require('@lib/identifiers/resolve-entity-id');

const ICU_STAY_INCLUDE = {
  admission: {
    select: {
      id: true,
      human_friendly_id: true,
      patient: {
        select: {
          id: true,
          human_friendly_id: true,
          first_name: true,
          last_name: true,
        },
      },
    },
  },
};

const mapIcuStayRecord = (record) => {
  if (!record) return record;
  return {
    ...record,
    display_id: record.human_friendly_id || null,
    admission_display_id: record.admission?.human_friendly_id || null,
    patient_display_id: record.admission?.patient?.human_friendly_id || null,
    patient_display_name: [record.admission?.patient?.first_name, record.admission?.patient?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim() || null,
  };
};

const resolveAdmissionId = async (identifier) =>
  resolveModelIdByIdentifier({
    model: 'admission',
    identifier,
    select: { id: true },
  });

const resolveIcuStayId = async (identifier) =>
  resolveModelIdByIdentifier({
    model: 'icu_stay',
    identifier,
    select: { id: true },
  });

/**
 * List ICU stays with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} ICU stays and pagination data
 */
const listIcuStays = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.admission_id) {
      const resolvedAdmissionId = await resolveAdmissionId(filters.admission_id);
      if (!resolvedAdmissionId) {
        return {
          icu_stays: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: page > 1
          }
        };
      }
      whereClause.admission_id = resolvedAdmissionId;
    }
    
    // Date range filters for started_at
    if (filters.started_at_from || filters.started_at_to) {
      whereClause.started_at = {};
      if (filters.started_at_from) whereClause.started_at.gte = new Date(filters.started_at_from);
      if (filters.started_at_to) whereClause.started_at.lte = new Date(filters.started_at_to);
    }
    
    // Date range filters for ended_at
    if (filters.ended_at_from || filters.ended_at_to) {
      whereClause.ended_at = {};
      if (filters.ended_at_from) whereClause.ended_at.gte = new Date(filters.ended_at_from);
      if (filters.ended_at_to) whereClause.ended_at.lte = new Date(filters.ended_at_to);
    }
    
    // Filter for active ICU stays (ended_at is null)
    if (filters.is_active !== undefined) {
      whereClause.ended_at = filters.is_active ? null : { not: null };
    }

    const [icuStays, total] = await Promise.all([
      icuStayRepository.findMany(whereClause, skip, limit, orderBy, ICU_STAY_INCLUDE),
      icuStayRepository.count(whereClause)
    ]);

    return {
      icu_stays: icuStays.map(mapIcuStayRecord),
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
 * Get ICU stay by ID
 *
 * @param {string} id - ICU Stay ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} ICU stay data
 */
const getIcuStayById = async (id, userId, ipAddress) => {
  try {
    const resolvedIcuStayId = await resolveIcuStayId(id);
    if (!resolvedIcuStayId) {
      throw new HttpError('errors.icu_stay.not_found', 404);
    }

    const icuStay = await icuStayRepository.findById(resolvedIcuStayId, ICU_STAY_INCLUDE);

    if (!icuStay) {
      throw new HttpError('errors.icu_stay.not_found', 404);
    }

    return mapIcuStayRecord(icuStay);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new ICU stay
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - ICU stay data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created ICU stay
 */
const createIcuStay = async (data, userId, ipAddress) => {
  try {
    const resolvedAdmissionId = await resolveAdmissionId(data?.admission_id);
    if (!resolvedAdmissionId) {
      throw new HttpError('errors.admission.not_found', 404, [{ field: 'admission_id' }]);
    }

    const payload = {
      ...data,
      admission_id: resolvedAdmissionId,
    };

    const createdIcuStay = await icuStayRepository.create(payload);
    const icuStay =
      (await icuStayRepository.findById(createdIcuStay.id, ICU_STAY_INCLUDE)) || createdIcuStay;

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'icu_stay',
      entity_id: icuStay.id,
      diff: { after: icuStay },
      ip_address: ipAddress
    }).catch(() => {});

    return mapIcuStayRecord(icuStay);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update ICU stay
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - ICU Stay ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated ICU stay
 */
const updateIcuStay = async (id, data, userId, ipAddress) => {
  try {
    const resolvedIcuStayId = await resolveIcuStayId(id);
    if (!resolvedIcuStayId) {
      throw new HttpError('errors.icu_stay.not_found', 404);
    }

    // Get current state for audit
    const before = await icuStayRepository.findById(resolvedIcuStayId, ICU_STAY_INCLUDE);

    if (!before) {
      throw new HttpError('errors.icu_stay.not_found', 404);
    }

    const updatedIcuStay = await icuStayRepository.update(resolvedIcuStayId, data);
    const icuStay =
      (await icuStayRepository.findById(updatedIcuStay.id, ICU_STAY_INCLUDE)) || updatedIcuStay;

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'icu_stay',
      entity_id: icuStay.id,
      diff: { before, after: icuStay },
      ip_address: ipAddress
    }).catch(() => {});

    return mapIcuStayRecord(icuStay);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete ICU stay (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - ICU Stay ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteIcuStay = async (id, userId, ipAddress) => {
  try {
    const resolvedIcuStayId = await resolveIcuStayId(id);
    if (!resolvedIcuStayId) {
      throw new HttpError('errors.icu_stay.not_found', 404);
    }

    // Get current state for audit
    const before = await icuStayRepository.findById(resolvedIcuStayId, ICU_STAY_INCLUDE);

    if (!before) {
      throw new HttpError('errors.icu_stay.not_found', 404);
    }

    await icuStayRepository.softDelete(resolvedIcuStayId);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'icu_stay',
      entity_id: resolvedIcuStayId,
      diff: { before },
      ip_address: ipAddress
    }).catch(() => {});
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listIcuStays,
  getIcuStayById,
  createIcuStay,
  updateIcuStay,
  deleteIcuStay
};
