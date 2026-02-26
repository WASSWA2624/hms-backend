/**
 * Critical Alert service
 *
 * @module modules/critical-alert/services
 * @description Business logic layer for critical alert operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const criticalAlertRepository = require('@repositories/critical-alert/critical-alert.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const { resolveModelIdByIdentifier } = require('@lib/identifiers/resolve-entity-id');

const CRITICAL_ALERT_INCLUDE = {
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

const mapCriticalAlertRecord = (record) => {
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

const resolveCriticalAlertId = async (identifier) =>
  resolveModelIdByIdentifier({
    model: 'critical_alert',
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
    
    if (filters.icu_stay_id) {
      const resolvedIcuStayId = await resolveIcuStayId(filters.icu_stay_id);
      if (!resolvedIcuStayId) {
        return {
          critical_alerts: [],
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
    if (filters.severity) whereClause.severity = filters.severity;
    
    // Search filter (searches in message text)
    if (filters.search) {
      whereClause.message = { contains: filters.search };
    }

    const [criticalAlerts, total] = await Promise.all([
      criticalAlertRepository.findMany(whereClause, skip, limit, orderBy, CRITICAL_ALERT_INCLUDE),
      criticalAlertRepository.count(whereClause)
    ]);

    return {
      critical_alerts: criticalAlerts.map(mapCriticalAlertRecord),
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
    const resolvedCriticalAlertId = await resolveCriticalAlertId(id);
    if (!resolvedCriticalAlertId) {
      throw new HttpError('errors.critical_alert.not_found', 404);
    }

    const criticalAlert = await criticalAlertRepository.findById(
      resolvedCriticalAlertId,
      CRITICAL_ALERT_INCLUDE
    );

    if (!criticalAlert) {
      throw new HttpError('errors.critical_alert.not_found', 404);
    }

    return mapCriticalAlertRecord(criticalAlert);
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
    const resolvedIcuStayId = await resolveIcuStayId(data?.icu_stay_id);
    if (!resolvedIcuStayId) {
      throw new HttpError('errors.icu_stay.not_found', 404, [{ field: 'icu_stay_id' }]);
    }

    const payload = {
      ...data,
      icu_stay_id: resolvedIcuStayId,
    };

    const createdCriticalAlert = await criticalAlertRepository.create(payload);
    const criticalAlert =
      (await criticalAlertRepository.findById(createdCriticalAlert.id, CRITICAL_ALERT_INCLUDE)) ||
      createdCriticalAlert;

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'critical_alert',
      entity_id: criticalAlert.id,
      diff: { after: criticalAlert },
      ip_address: ipAddress
    }).catch(() => {});

    return mapCriticalAlertRecord(criticalAlert);
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
    const resolvedCriticalAlertId = await resolveCriticalAlertId(id);
    if (!resolvedCriticalAlertId) {
      throw new HttpError('errors.critical_alert.not_found', 404);
    }

    // Get current state for audit
    const before = await criticalAlertRepository.findById(
      resolvedCriticalAlertId,
      CRITICAL_ALERT_INCLUDE
    );

    if (!before) {
      throw new HttpError('errors.critical_alert.not_found', 404);
    }

    const updatedCriticalAlert = await criticalAlertRepository.update(resolvedCriticalAlertId, data);
    const criticalAlert =
      (await criticalAlertRepository.findById(updatedCriticalAlert.id, CRITICAL_ALERT_INCLUDE)) ||
      updatedCriticalAlert;

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'critical_alert',
      entity_id: criticalAlert.id,
      diff: { before, after: criticalAlert },
      ip_address: ipAddress
    }).catch(() => {});

    return mapCriticalAlertRecord(criticalAlert);
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
    const resolvedCriticalAlertId = await resolveCriticalAlertId(id);
    if (!resolvedCriticalAlertId) {
      throw new HttpError('errors.critical_alert.not_found', 404);
    }

    // Get current state for audit
    const before = await criticalAlertRepository.findById(
      resolvedCriticalAlertId,
      CRITICAL_ALERT_INCLUDE
    );

    if (!before) {
      throw new HttpError('errors.critical_alert.not_found', 404);
    }

    await criticalAlertRepository.softDelete(resolvedCriticalAlertId);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'critical_alert',
      entity_id: resolvedCriticalAlertId,
      diff: { before },
      ip_address: ipAddress
    }).catch(() => {});
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
