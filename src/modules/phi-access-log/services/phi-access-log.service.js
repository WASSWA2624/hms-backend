/**
 * PHI access log service
 *
 * @module modules/phi-access-log/services
 * @description Business logic layer for PHI access log operations.
 * Per module-creation.mdc: Only import/use its own repo (no direct DB).
 * Per module-creation.mdc: All mutations call createAuditLog.
 * Per module-creation.mdc: Use Prisma $transaction() for multi-step mutations.
 */

const phiAccessLogRepository = require('@modules/phi-access-log/repositories/phi-access-log.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const prisma = require('@prisma/client');

/**
 * Get PHI access log by ID
 *
 * @param {string} id - PHI access log ID
 * @returns {Promise<Object>} PHI access log object
 * @throws {HttpError} If PHI access log not found
 */
const getPhiAccessLogById = async (id) => {
  const phiAccessLog = await phiAccessLogRepository.findById(id, {
    tenant: true,
    user: {
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true
      }
    },
    patient: {
      select: {
        id: true,
        first_name: true,
        last_name: true
      }
    }
  });

  if (!phiAccessLog) {
    throw new HttpError('errors.phi_access_log.not_found', 404);
  }

  return phiAccessLog;
};

/**
 * Get paginated list of PHI access logs
 *
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated PHI access logs with metadata
 */
const getPhiAccessLogs = async (filters = {}, page = 1, limit = 20, sortBy = 'accessed_at', order = 'desc') => {
  // Build filter object
  const where = {};

  if (filters.tenant_id) where.tenant_id = filters.tenant_id;
  if (filters.user_id) where.user_id = filters.user_id;
  if (filters.patient_id) where.patient_id = filters.patient_id;
  if (filters.access_scope) where.access_scope = filters.access_scope;

  // Date range filters
  if (filters.date_from || filters.date_to) {
    where.accessed_at = {};
    if (filters.date_from) where.accessed_at.gte = new Date(filters.date_from);
    if (filters.date_to) where.accessed_at.lte = new Date(filters.date_to);
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: order };

  // Fetch data
  const [phiAccessLogs, total] = await Promise.all([
    phiAccessLogRepository.findMany(where, skip, limit, orderBy, {
      tenant: true,
      user: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true
        }
      },
      patient: {
        select: {
          id: true,
          first_name: true,
          last_name: true
        }
      }
    }),
    phiAccessLogRepository.count(where)
  ]);

  return {
    data: phiAccessLogs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

/**
 * Get PHI access logs by user ID
 *
 * @param {string} userId - User ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated user PHI access logs
 */
const getPhiAccessLogsByUserId = async (userId, page = 1, limit = 20, sortBy = 'accessed_at', order = 'desc') => {
  return getPhiAccessLogs({ user_id: userId }, page, limit, sortBy, order);
};

/**
 * Create new PHI access log
 * Per module-creation.mdc: All mutations must create audit logs
 *
 * @param {Object} data - PHI access log data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created PHI access log
 */
const createPhiAccessLog = async (data, userId, ipAddress) => {
  return await prisma.$transaction(async (tx) => {
    // Create PHI access log
    const phiAccessLog = await phiAccessLogRepository.create(data);

    // Create audit log
    await createAuditLog({
      tenant_id: data.tenant_id,
      user_id: userId,
      action: 'CREATE',
      entity: 'phi_access_log',
      entity_id: phiAccessLog.id,
      ip_address: ipAddress
    });

    return phiAccessLog;
  });
};

/**
 * Update PHI access log
 * Per module-creation.mdc: All mutations must create audit logs
 *
 * @param {string} id - PHI access log ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated PHI access log
 */
const updatePhiAccessLog = async (id, data, userId, ipAddress) => {
  // Check if PHI access log exists
  const existingLog = await phiAccessLogRepository.findById(id);
  if (!existingLog) {
    throw new HttpError('errors.phi_access_log.not_found', 404);
  }

  return await prisma.$transaction(async (tx) => {
    // Update PHI access log
    const phiAccessLog = await phiAccessLogRepository.update(id, data);

    // Create audit log
    await createAuditLog({
      tenant_id: existingLog.tenant_id,
      user_id: userId,
      action: 'UPDATE',
      entity: 'phi_access_log',
      entity_id: id,
      ip_address: ipAddress
    });

    return phiAccessLog;
  });
};

/**
 * Delete PHI access log (soft delete)
 * Per module-creation.mdc: All mutations must create audit logs
 * Per prisma.mdc: Only soft deletes allowed
 *
 * @param {string} id - PHI access log ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Deleted PHI access log
 */
const deletePhiAccessLog = async (id, userId, ipAddress) => {
  // Check if PHI access log exists
  const existingLog = await phiAccessLogRepository.findById(id);
  if (!existingLog) {
    throw new HttpError('errors.phi_access_log.not_found', 404);
  }

  return await prisma.$transaction(async (tx) => {
    // Soft delete PHI access log
    const phiAccessLog = await phiAccessLogRepository.softDelete(id);

    // Create audit log
    await createAuditLog({
      tenant_id: existingLog.tenant_id,
      user_id: userId,
      action: 'DELETE',
      entity: 'phi_access_log',
      entity_id: id,
      ip_address: ipAddress
    });

    return phiAccessLog;
  });
};

module.exports = {
  getPhiAccessLogById,
  getPhiAccessLogs,
  getPhiAccessLogsByUserId,
  createPhiAccessLog,
  updatePhiAccessLog,
  deletePhiAccessLog
};
