/**
 * Audit log service
 *
 * @module modules/audit-log/services
 * @description Business logic layer for audit log operations.
 * Per module-creation.mdc: Only import/use its own repo (no direct DB).
 * Note: This is a READ-ONLY module - no mutation methods
 */

const auditLogRepository = require('@modules/audit-log/repositories/audit-log.repository');
const { HttpError } = require('@lib/errors');

/**
 * Get audit log by ID
 *
 * @param {string} id - Audit log ID
 * @returns {Promise<Object>} Audit log object
 * @throws {HttpError} If audit log not found
 */
const getAuditLogById = async (id) => {
  const auditLog = await auditLogRepository.findById(id, {
    tenant: true,
    user: {
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true
      }
    }
  });

  if (!auditLog) {
    throw new HttpError('errors.audit_log.not_found', 404);
  }

  return auditLog;
};

/**
 * Get paginated list of audit logs
 *
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated audit logs with metadata
 */
const getAuditLogs = async (filters = {}, page = 1, limit = 20, sortBy = 'created_at', order = 'desc') => {
  // Build filter object
  const where = {};

  if (filters.tenant_id) where.tenant_id = filters.tenant_id;
  if (filters.user_id) where.user_id = filters.user_id;
  if (filters.action) where.action = filters.action;
  if (filters.entity) where.entity = filters.entity;
  if (filters.entity_id) where.entity_id = filters.entity_id;
  if (filters.ip_address) where.ip_address = filters.ip_address;

  // Date range filters
  if (filters.date_from || filters.date_to) {
    where.created_at = {};
    if (filters.date_from) where.created_at.gte = new Date(filters.date_from);
    if (filters.date_to) where.created_at.lte = new Date(filters.date_to);
  }

  // Calculate pagination
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: order };

  // Fetch data
  const [auditLogs, total] = await Promise.all([
    auditLogRepository.findMany(where, skip, limit, orderBy, {
      tenant: true,
      user: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true
        }
      }
    }),
    auditLogRepository.count(where)
  ]);

  return {
    data: auditLogs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

/**
 * Get audit logs by user ID
 *
 * @param {string} userId - User ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated user audit logs
 */
const getAuditLogsByUserId = async (userId, page = 1, limit = 20, sortBy = 'created_at', order = 'desc') => {
  return getAuditLogs({ user_id: userId }, page, limit, sortBy, order);
};

/**
 * Get audit logs by entity
 *
 * @param {string} entity - Entity name
 * @param {string} entityId - Entity ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated entity audit logs
 */
const getAuditLogsByEntity = async (entity, entityId, page = 1, limit = 20, sortBy = 'created_at', order = 'desc') => {
  return getAuditLogs({ entity, entity_id: entityId }, page, limit, sortBy, order);
};

module.exports = {
  getAuditLogById,
  getAuditLogs,
  getAuditLogsByUserId,
  getAuditLogsByEntity
};
