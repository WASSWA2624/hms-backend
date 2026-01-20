/**
 * Dashboard widget service
 *
 * @module modules/dashboard-widget/services
 * @description Business logic layer for dashboard widget operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const dashboardWidgetRepository = require('../repositories/dashboard-widget.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List dashboard widgets with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Dashboard widgets and pagination data
 */
const listDashboardWidgets = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.name) whereClause.name = { contains: filters.name };
    
    // Search filter (searches in name)
    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search } }
      ];
    }

    const [dashboardWidgets, total] = await Promise.all([
      dashboardWidgetRepository.findMany(whereClause, skip, limit, orderBy, {}),
      dashboardWidgetRepository.count(whereClause)
    ]);

    return {
      dashboardWidgets,
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
 * Get dashboard widget by ID
 *
 * @param {string} id - Dashboard widget ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Dashboard widget data
 */
const getDashboardWidgetById = async (id, userId, ipAddress) => {
  try {
    const dashboardWidget = await dashboardWidgetRepository.findById(id);

    if (!dashboardWidget) {
      throw new HttpError('errors.dashboard_widget.not_found', 404);
    }

    return dashboardWidget;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new dashboard widget
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Dashboard widget data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created dashboard widget
 */
const createDashboardWidget = async (data, userId, ipAddress) => {
  try {
    const dashboardWidget = await dashboardWidgetRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'dashboard_widget',
      entity_id: dashboardWidget.id,
      diff: { after: dashboardWidget },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return dashboardWidget;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update dashboard widget
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Dashboard widget ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated dashboard widget
 */
const updateDashboardWidget = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await dashboardWidgetRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.dashboard_widget.not_found', 404);
    }

    const dashboardWidget = await dashboardWidgetRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'dashboard_widget',
      entity_id: dashboardWidget.id,
      diff: { before, after: dashboardWidget },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return dashboardWidget;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete dashboard widget (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Dashboard widget ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteDashboardWidget = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await dashboardWidgetRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.dashboard_widget.not_found', 404);
    }

    await dashboardWidgetRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'dashboard_widget',
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
  listDashboardWidgets,
  getDashboardWidgetById,
  createDashboardWidget,
  updateDashboardWidget,
  deleteDashboardWidget
};
