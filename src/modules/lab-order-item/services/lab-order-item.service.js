/**
 * Lab order item service
 *
 * @module modules/lab-order-item/services
 * @description Business logic layer for lab order item operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const labOrderItemRepository = require('@repositories/lab-order-item/lab-order-item.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List lab order items with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Lab order items and pagination data
 */
const listLabOrderItems = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    const whereClause = {};
    
    if (filters.lab_order_id) whereClause.lab_order_id = filters.lab_order_id;
    if (filters.lab_test_id) whereClause.lab_test_id = filters.lab_test_id;
    if (filters.status) whereClause.status = filters.status;

    const [labOrderItems, total] = await Promise.all([
      labOrderItemRepository.findMany(whereClause, skip, limit, orderBy),
      labOrderItemRepository.count(whereClause)
    ]);

    return {
      labOrderItems,
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
 * Get lab order item by ID
 *
 * @param {string} id - Lab order item ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Lab order item data
 */
const getLabOrderItemById = async (id, userId, ipAddress) => {
  try {
    const labOrderItem = await labOrderItemRepository.findById(id);

    if (!labOrderItem) {
      throw new HttpError('errors.lab_order_item.not_found', 404);
    }

    return labOrderItem;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new lab order item
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Lab order item data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created lab order item
 */
const createLabOrderItem = async (data, userId, ipAddress) => {
  try {
    const labOrderItem = await labOrderItemRepository.create(data);

    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'lab_order_item',
      entity_id: labOrderItem.id,
      diff: { after: labOrderItem },
      ip_address: ipAddress
    }).catch(() => {});

    return labOrderItem;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update lab order item
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Lab order item ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated lab order item
 */
const updateLabOrderItem = async (id, data, userId, ipAddress) => {
  try {
    const before = await labOrderItemRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.lab_order_item.not_found', 404);
    }

    const labOrderItem = await labOrderItemRepository.update(id, data);

    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'lab_order_item',
      entity_id: labOrderItem.id,
      diff: { before, after: labOrderItem },
      ip_address: ipAddress
    }).catch(() => {});

    return labOrderItem;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Soft delete lab order item
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Lab order item ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Deleted lab order item
 */
const deleteLabOrderItem = async (id, userId, ipAddress) => {
  try {
    const before = await labOrderItemRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.lab_order_item.not_found', 404);
    }

    const labOrderItem = await labOrderItemRepository.softDelete(id);

    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'lab_order_item',
      entity_id: labOrderItem.id,
      diff: { before, after: labOrderItem },
      ip_address: ipAddress
    }).catch(() => {});

    return labOrderItem;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listLabOrderItems,
  getLabOrderItemById,
  createLabOrderItem,
  updateLabOrderItem,
  deleteLabOrderItem
};
