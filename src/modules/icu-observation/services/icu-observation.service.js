/**
 * ICU Observation service
 *
 * @module modules/icu-observation/services
 * @description Business logic layer for ICU observation operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const icuObservationRepository = require('@repositories/icu-observation/icu-observation.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const { resolveModelIdByIdentifier } = require('@lib/identifiers/resolve-entity-id');

const ICU_OBSERVATION_INCLUDE = {
  icu_stay: {
    select: {
      id: true,
      human_friendly_id: true,
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
    },
  },
};

const mapIcuObservationRecord = (record) => {
  if (!record) return record;
  return {
    ...record,
    display_id: record.human_friendly_id || null,
    icu_stay_display_id: record.icu_stay?.human_friendly_id || null,
    admission_display_id: record.icu_stay?.admission?.human_friendly_id || null,
    patient_display_id: record.icu_stay?.admission?.patient?.human_friendly_id || null,
    patient_display_name: [record.icu_stay?.admission?.patient?.first_name, record.icu_stay?.admission?.patient?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim() || null,
  };
};

const resolveIcuObservationId = async (identifier) =>
  resolveModelIdByIdentifier({
    model: 'icu_observation',
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
 * List ICU observations with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} ICU observations and pagination data
 */
const listIcuObservations = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.icu_stay_id) {
      const resolvedIcuStayId = await resolveIcuStayId(filters.icu_stay_id);
      if (!resolvedIcuStayId) {
        return {
          icu_observations: [],
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
      whereClause.icu_stay_id = resolvedIcuStayId;
    }
    
    // Date range filters for observed_at
    if (filters.observed_at_from || filters.observed_at_to) {
      whereClause.observed_at = {};
      if (filters.observed_at_from) whereClause.observed_at.gte = new Date(filters.observed_at_from);
      if (filters.observed_at_to) whereClause.observed_at.lte = new Date(filters.observed_at_to);
    }
    
    // Search filter (searches in observation text)
    if (filters.search) {
      whereClause.observation = { contains: filters.search };
    }

    const [icuObservations, total] = await Promise.all([
      icuObservationRepository.findMany(whereClause, skip, limit, orderBy, ICU_OBSERVATION_INCLUDE),
      icuObservationRepository.count(whereClause)
    ]);

    return {
      icu_observations: icuObservations.map(mapIcuObservationRecord),
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
 * Get ICU observation by ID
 *
 * @param {string} id - ICU Observation ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} ICU observation data
 */
const getIcuObservationById = async (id, userId, ipAddress) => {
  try {
    const resolvedIcuObservationId = await resolveIcuObservationId(id);
    if (!resolvedIcuObservationId) {
      throw new HttpError('errors.icu_observation.not_found', 404);
    }

    const icuObservation = await icuObservationRepository.findById(
      resolvedIcuObservationId,
      ICU_OBSERVATION_INCLUDE
    );

    if (!icuObservation) {
      throw new HttpError('errors.icu_observation.not_found', 404);
    }

    return mapIcuObservationRecord(icuObservation);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new ICU observation
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - ICU observation data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created ICU observation
 */
const createIcuObservation = async (data, userId, ipAddress) => {
  try {
    const resolvedIcuStayId = await resolveIcuStayId(data?.icu_stay_id);
    if (!resolvedIcuStayId) {
      throw new HttpError('errors.icu_stay.not_found', 404, [{ field: 'icu_stay_id' }]);
    }

    const payload = {
      ...data,
      icu_stay_id: resolvedIcuStayId,
    };

    const createdIcuObservation = await icuObservationRepository.create(payload);
    const icuObservation =
      (await icuObservationRepository.findById(createdIcuObservation.id, ICU_OBSERVATION_INCLUDE)) ||
      createdIcuObservation;

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'icu_observation',
      entity_id: icuObservation.id,
      diff: { after: icuObservation },
      ip_address: ipAddress
    }).catch(() => {});

    return mapIcuObservationRecord(icuObservation);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update ICU observation
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - ICU Observation ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated ICU observation
 */
const updateIcuObservation = async (id, data, userId, ipAddress) => {
  try {
    const resolvedIcuObservationId = await resolveIcuObservationId(id);
    if (!resolvedIcuObservationId) {
      throw new HttpError('errors.icu_observation.not_found', 404);
    }

    // Get current state for audit
    const before = await icuObservationRepository.findById(
      resolvedIcuObservationId,
      ICU_OBSERVATION_INCLUDE
    );

    if (!before) {
      throw new HttpError('errors.icu_observation.not_found', 404);
    }

    const updatedIcuObservation = await icuObservationRepository.update(resolvedIcuObservationId, data);
    const icuObservation =
      (await icuObservationRepository.findById(updatedIcuObservation.id, ICU_OBSERVATION_INCLUDE)) ||
      updatedIcuObservation;

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'icu_observation',
      entity_id: icuObservation.id,
      diff: { before, after: icuObservation },
      ip_address: ipAddress
    }).catch(() => {});

    return mapIcuObservationRecord(icuObservation);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete ICU observation (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - ICU Observation ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteIcuObservation = async (id, userId, ipAddress) => {
  try {
    const resolvedIcuObservationId = await resolveIcuObservationId(id);
    if (!resolvedIcuObservationId) {
      throw new HttpError('errors.icu_observation.not_found', 404);
    }

    // Get current state for audit
    const before = await icuObservationRepository.findById(
      resolvedIcuObservationId,
      ICU_OBSERVATION_INCLUDE
    );

    if (!before) {
      throw new HttpError('errors.icu_observation.not_found', 404);
    }

    await icuObservationRepository.softDelete(resolvedIcuObservationId);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'icu_observation',
      entity_id: resolvedIcuObservationId,
      diff: { before },
      ip_address: ipAddress
    }).catch(() => {});
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listIcuObservations,
  getIcuObservationById,
  createIcuObservation,
  updateIcuObservation,
  deleteIcuObservation
};
