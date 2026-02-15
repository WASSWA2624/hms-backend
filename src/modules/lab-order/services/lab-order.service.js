/**
 * Lab order service
 *
 * @module modules/lab-order/services
 * @description Business logic layer for lab order operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const labOrderRepository = require('../repositories/lab-order.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List lab orders with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Lab orders and pagination data
 */
const listLabOrders = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.encounter_id) whereClause.encounter_id = filters.encounter_id;
    if (filters.patient_id) whereClause.patient_id = filters.patient_id;
    if (filters.status) whereClause.status = filters.status;
    
    // Date range filters
    if (filters.ordered_at_from || filters.ordered_at_to) {
      whereClause.ordered_at = {};
      if (filters.ordered_at_from) whereClause.ordered_at.gte = new Date(filters.ordered_at_from);
      if (filters.ordered_at_to) whereClause.ordered_at.lte = new Date(filters.ordered_at_to);
    }
    
    // Search filter (would need to be implemented based on business requirements)
    if (filters.search) {
      // This would typically search across related entities like patient name, etc.
      // Implement as needed
    }

    const [labOrders, total] = await Promise.all([
      labOrderRepository.findMany(whereClause, skip, limit, orderBy),
      labOrderRepository.count(whereClause)
    ]);

    return {
      labOrders,
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
 * Get lab order by ID
 *
 * @param {string} id - Lab order ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Lab order data
 */
const getLabOrderById = async (id, userId, ipAddress) => {
  try {
    const labOrder = await labOrderRepository.findById(id);

    if (!labOrder) {
      throw new HttpError('errors.lab_order.not_found', 404);
    }

    return labOrder;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new lab order
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Lab order data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created lab order
 */
const createLabOrder = async (data, userId, ipAddress) => {
  try {
    const labOrder = await labOrderRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'lab_order',
      entity_id: labOrder.id,
      diff: { after: labOrder },
      ip_address: ipAddress
    }).catch(() => {});

    return labOrder;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update lab order
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Lab order ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated lab order
 */
const updateLabOrder = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await labOrderRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.lab_order.not_found', 404);
    }

    const labOrder = await labOrderRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'lab_order',
      entity_id: labOrder.id,
      diff: { before, after: labOrder },
      ip_address: ipAddress
    }).catch(() => {});

    return labOrder;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Soft delete lab order
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Lab order ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Deleted lab order
 */
const deleteLabOrder = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await labOrderRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.lab_order.not_found', 404);
    }

    const labOrder = await labOrderRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'lab_order',
      entity_id: labOrder.id,
      diff: { before, after: labOrder },
      ip_address: ipAddress
    }).catch(() => {});

    return labOrder;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listLabOrders,
  getLabOrderById,
  createLabOrder,
  updateLabOrder,
  deleteLabOrder
};
