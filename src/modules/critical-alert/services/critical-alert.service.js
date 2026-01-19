/**
 * Critical Alert service
 *
 * @module modules/critical-alert/services
 * @description Business logic layer for critical alert operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const criticalAlertRepository = require('../repositories/critical-alert.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List critical alerts with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Critical alerts and pagination data
 */
const listCriticalAlerts = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.icu_stay_id) whereClause.icu_stay_id = filters.icu_stay_id;
    if (filters.severity) whereClause.severity = filters.severity;
    
    // Search filter (searches in message text)
    if (filters.search) {
      whereClause.message = { contains: filters.search };
    }

    const [criticalAlerts, total] = await Promise.all([
      criticalAlertRepository.findMany(whereClause, skip, limit, orderBy),
      criticalAlertRepository.count(whereClause)
    ]);

    return {
      critical_alerts: criticalAlerts,
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
 * Get critical alert by ID
 *
 * @param {string} id - Critical Alert ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Critical alert data
 */
const getCriticalAlertById = async (id, userId, ipAddress) => {
  try {
    const criticalAlert = await criticalAlertRepository.findById(id);

    if (!criticalAlert) {
      throw new HttpError('errors.critical_alert.not_found', 404);
    }

    return criticalAlert;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new critical alert
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Critical alert data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created critical alert
 */
const createCriticalAlert = async (data, userId, ipAddress) => {
  try {
    const criticalAlert = await criticalAlertRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'critical_alert',
      entity_id: criticalAlert.id,
      diff: { after: criticalAlert },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return criticalAlert;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update critical alert
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Critical Alert ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated critical alert
 */
const updateCriticalAlert = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await criticalAlertRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.critical_alert.not_found', 404);
    }

    const criticalAlert = await criticalAlertRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'critical_alert',
      entity_id: criticalAlert.id,
      diff: { before, after: criticalAlert },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return criticalAlert;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete critical alert (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Critical Alert ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteCriticalAlert = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await criticalAlertRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.critical_alert.not_found', 404);
    }

    await criticalAlertRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'critical_alert',
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
  listCriticalAlerts,
  getCriticalAlertById,
  createCriticalAlert,
  updateCriticalAlert,
  deleteCriticalAlert
};
