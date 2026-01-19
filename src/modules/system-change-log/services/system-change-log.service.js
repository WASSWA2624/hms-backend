/**
 * System change log service
 *
 * @module modules/system-change-log/services
 * @description Business logic layer for system change log operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const systemChangeLogRepository = require('../repositories/system-change-log.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List system change logs with pagination and filtering
 */
const listSystemChangeLogs = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.user_id) whereClause.user_id = filters.user_id;
    if (filters.change_type) whereClause.change_type = filters.change_type;
    
    // Date range filters
    if (filters.from_date || filters.to_date) {
      whereClause.created_at = {};
      if (filters.from_date) whereClause.created_at.gte = new Date(filters.from_date);
      if (filters.to_date) whereClause.created_at.lte = new Date(filters.to_date);
    }

    const [systemChangeLogs, total] = await Promise.all([
      systemChangeLogRepository.findMany(whereClause, skip, limit, orderBy),
      systemChangeLogRepository.count(whereClause)
    ]);

    return {
      systemChangeLogs,
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
 * Get system change log by ID
 */
const getSystemChangeLogById = async (id, userId, ipAddress) => {
  try {
    const systemChangeLog = await systemChangeLogRepository.findById(id);

    if (!systemChangeLog) {
      throw new HttpError('errors.system_change_log.not_found', 404);
    }

    return systemChangeLog;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new system change log
 * Per prisma.mdc: Mutations must create audit logs
 */
const createSystemChangeLog = async (data, tenantId, userId, ipAddress) => {
  try {
    const systemChangeLog = await systemChangeLogRepository.create({
      ...data,
      tenant_id: tenantId,
      user_id: userId
    });

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'system_change_log',
      entity_id: systemChangeLog.id,
      diff: { after: systemChangeLog },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return systemChangeLog;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update system change log
 * Per prisma.mdc: Mutations must create audit logs
 */
const updateSystemChangeLog = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await systemChangeLogRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.system_change_log.not_found', 404);
    }

    const systemChangeLog = await systemChangeLogRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'system_change_log',
      entity_id: systemChangeLog.id,
      diff: { before, after: systemChangeLog },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return systemChangeLog;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Approve system change log
 * Special action endpoint: POST /system-change-logs/:id/approve
 * Per prisma.mdc: Mutations must create audit logs
 * 
 * Note: Approval tracking is handled via details field as Prisma schema
 * doesn't have dedicated approval fields. We append approval metadata to details.
 */
const approveSystemChangeLog = async (id, approvalNotes, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await systemChangeLogRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.system_change_log.not_found', 404);
    }

    // Build approval metadata
    const approvalMetadata = {
      approved_by: userId,
      approved_at: new Date().toISOString(),
      approval_notes: approvalNotes || 'Approved'
    };

    // Append approval metadata to details
    const updatedDetails = before.details 
      ? `${before.details}\n\n[APPROVED] ${JSON.stringify(approvalMetadata)}`
      : `[APPROVED] ${JSON.stringify(approvalMetadata)}`;

    const systemChangeLog = await systemChangeLogRepository.update(id, {
      details: updatedDetails
    });

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'APPROVE',
      entity: 'system_change_log',
      entity_id: systemChangeLog.id,
      diff: { before, after: systemChangeLog },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return systemChangeLog;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Implement system change log
 * Special action endpoint: POST /system-change-logs/:id/implement
 * Per prisma.mdc: Mutations must create audit logs
 * 
 * Note: Implementation tracking is handled via details field as Prisma schema
 * doesn't have dedicated implementation fields. We append implementation metadata to details.
 */
const implementSystemChangeLog = async (id, implementationNotes, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await systemChangeLogRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.system_change_log.not_found', 404);
    }

    // Build implementation metadata
    const implementationMetadata = {
      implemented_by: userId,
      implemented_at: new Date().toISOString(),
      implementation_notes: implementationNotes || 'Implemented'
    };

    // Append implementation metadata to details
    const updatedDetails = before.details 
      ? `${before.details}\n\n[IMPLEMENTED] ${JSON.stringify(implementationMetadata)}`
      : `[IMPLEMENTED] ${JSON.stringify(implementationMetadata)}`;

    const systemChangeLog = await systemChangeLogRepository.update(id, {
      details: updatedDetails
    });

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'IMPLEMENT',
      entity: 'system_change_log',
      entity_id: systemChangeLog.id,
      diff: { before, after: systemChangeLog },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return systemChangeLog;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete system change log (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 */
const deleteSystemChangeLog = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await systemChangeLogRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.system_change_log.not_found', 404);
    }

    await systemChangeLogRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'system_change_log',
      entity_id: id,
      diff: { before },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listSystemChangeLogs,
  getSystemChangeLogById,
  createSystemChangeLog,
  updateSystemChangeLog,
  approveSystemChangeLog,
  implementSystemChangeLog,
  deleteSystemChangeLog
};
