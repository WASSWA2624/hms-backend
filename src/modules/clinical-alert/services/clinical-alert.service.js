/**
 * Clinical Alert service
 *
 * @module modules/clinical-alert/services
 * @description Business logic layer for clinical alert operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const clinicalAlertRepository = require('../repositories/clinical-alert.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List clinical alerts with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Clinical alerts and pagination data
 */
const listClinicalAlerts = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.encounter_id) whereClause.encounter_id = filters.encounter_id;
    if (filters.severity) whereClause.severity = filters.severity;

    const [clinicalAlerts, total] = await Promise.all([
      clinicalAlertRepository.findMany(whereClause, skip, limit, orderBy),
      clinicalAlertRepository.count(whereClause)
    ]);

    return {
      clinicalAlerts,
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
 * Get clinical alert by ID
 *
 * @param {string} id - Clinical alert ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Clinical alert data
 */
const getClinicalAlertById = async (id, userId, ipAddress) => {
  try {
    const clinicalAlert = await clinicalAlertRepository.findById(id);

    if (!clinicalAlert) {
      throw new HttpError('errors.clinical_alert.not_found', 404);
    }

    return clinicalAlert;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new clinical alert
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Clinical alert data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created clinical alert
 */
const createClinicalAlert = async (data, userId, ipAddress) => {
  try {
    const clinicalAlert = await clinicalAlertRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'clinical_alert',
      entity_id: clinicalAlert.id,
      diff: { after: clinicalAlert },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return clinicalAlert;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update clinical alert
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Clinical alert ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated clinical alert
 */
const updateClinicalAlert = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await clinicalAlertRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.clinical_alert.not_found', 404);
    }

    const clinicalAlert = await clinicalAlertRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'clinical_alert',
      entity_id: clinicalAlert.id,
      diff: { before, after: clinicalAlert },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return clinicalAlert;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete clinical alert (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Clinical alert ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteClinicalAlert = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await clinicalAlertRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.clinical_alert.not_found', 404);
    }

    await clinicalAlertRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'clinical_alert',
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
  listClinicalAlerts,
  getClinicalAlertById,
  createClinicalAlert,
  updateClinicalAlert,
  deleteClinicalAlert
};
