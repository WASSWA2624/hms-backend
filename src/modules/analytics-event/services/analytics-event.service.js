/**
 * Analytics event service
 *
 * @module modules/analytics-event/services
 * @description Business logic layer for analytics event operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const analyticsEventRepository = require('@repositories/analytics-event/analytics-event.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List analytics events with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Analytics events and pagination data
 */
const listAnalyticsEvents = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.user_id) whereClause.user_id = filters.user_id;
    if (filters.event_name) whereClause.event_name = { contains: filters.event_name };
    
    // Date range filters
    if (filters.occurred_at_from || filters.occurred_at_to) {
      whereClause.occurred_at = {};
      if (filters.occurred_at_from) whereClause.occurred_at.gte = new Date(filters.occurred_at_from);
      if (filters.occurred_at_to) whereClause.occurred_at.lte = new Date(filters.occurred_at_to);
    }
    
    // Search filter (searches in event_name)
    if (filters.search) {
      whereClause.OR = [
        { event_name: { contains: filters.search } }
      ];
    }

    const [analyticsEvents, total] = await Promise.all([
      analyticsEventRepository.findMany(whereClause, skip, limit, orderBy),
      analyticsEventRepository.count(whereClause)
    ]);

    return {
      analyticsEvents,
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
 * Get analytics event by ID
 *
 * @param {string} id - Analytics event ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Analytics event data
 */
const getAnalyticsEventById = async (id, userId, ipAddress) => {
  try {
    const analyticsEvent = await analyticsEventRepository.findById(id);

    if (!analyticsEvent) {
      throw new HttpError('errors.analytics_event.not_found', 404);
    }

    return analyticsEvent;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new analytics event
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Analytics event data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created analytics event
 */
const createAnalyticsEvent = async (data, userId, ipAddress) => {
  try {
    const analyticsEvent = await analyticsEventRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'analytics_event',
      entity_id: analyticsEvent.id,
      diff: { after: analyticsEvent },
      ip_address: ipAddress
    }).catch(() => {});

    return analyticsEvent;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update analytics event
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Analytics event ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated analytics event
 */
const updateAnalyticsEvent = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await analyticsEventRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.analytics_event.not_found', 404);
    }

    const analyticsEvent = await analyticsEventRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'analytics_event',
      entity_id: analyticsEvent.id,
      diff: { before, after: analyticsEvent },
      ip_address: ipAddress
    }).catch(() => {});

    return analyticsEvent;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete analytics event (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Analytics event ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteAnalyticsEvent = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await analyticsEventRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.analytics_event.not_found', 404);
    }

    await analyticsEventRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'analytics_event',
      entity_id: id,
      diff: { before },
      ip_address: ipAddress
    }).catch(() => {});
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listAnalyticsEvents,
  getAnalyticsEventById,
  createAnalyticsEvent,
  updateAnalyticsEvent,
  deleteAnalyticsEvent
};
