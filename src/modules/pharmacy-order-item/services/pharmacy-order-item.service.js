/**
 * Pharmacy order item service
 *
 * @module modules/pharmacy-order-item/services
 * @description Business logic layer for pharmacy order item operations.
 */

const pharmacyOrderItemRepository = require('../repositories/pharmacy-order-item.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const ORDER_TENANT_INCLUDE = {
  pharmacy_order: {
    select: {
      patient: {
        select: {
          tenant_id: true
        }
      }
    }
  }
};

const resolveTenantId = (pharmacyOrderItem) => pharmacyOrderItem?.pharmacy_order?.patient?.tenant_id || null;

/**
 * List pharmacy order items
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @returns {Promise<Object>}
 */
const listPharmacyOrderItems = async (filters, page, limit, sortBy, order) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    const whereClause = {};
    if (filters.pharmacy_order_id) whereClause.pharmacy_order_id = filters.pharmacy_order_id;
    if (filters.drug_id) whereClause.drug_id = filters.drug_id;
    if (filters.status) whereClause.status = filters.status;
    if (filters.route) whereClause.route = filters.route;
    if (filters.frequency) whereClause.frequency = filters.frequency;

    if (filters.search) {
      whereClause.OR = [
        { dosage: { contains: filters.search } },
        { id: { contains: filters.search } }
      ];
    }

    const [pharmacyOrderItems, total] = await Promise.all([
      pharmacyOrderItemRepository.findMany(whereClause, skip, limit, orderBy),
      pharmacyOrderItemRepository.count(whereClause)
    ]);

    return {
      pharmacyOrderItems,
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
 * Get pharmacy order item by ID
 *
 * @param {string} id - Pharmacy order item ID
 * @returns {Promise<Object>}
 */
const getPharmacyOrderItemById = async (id) => {
  try {
    const pharmacyOrderItem = await pharmacyOrderItemRepository.findById(id, {
      pharmacy_order: true,
      drug: true,
      dispense_logs: true
    });

    if (!pharmacyOrderItem) {
      throw new HttpError('errors.pharmacy_order_item.not_found', 404);
    }

    return pharmacyOrderItem;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create pharmacy order item
 *
 * @param {Object} data - Pharmacy order item data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - Client IP address
 * @returns {Promise<Object>}
 */
const createPharmacyOrderItem = async (data, userId, ipAddress) => {
  try {
    const pharmacyOrderItem = await pharmacyOrderItemRepository.create(data);
    const createdWithOrder = await pharmacyOrderItemRepository.findById(pharmacyOrderItem.id, ORDER_TENANT_INCLUDE);

    createAuditLog({
      tenant_id: resolveTenantId(createdWithOrder),
      user_id: userId,
      action: 'CREATE',
      entity: 'pharmacy_order_item',
      entity_id: pharmacyOrderItem.id,
      diff: { after: pharmacyOrderItem },
      ip_address: ipAddress
    }).catch((err) => {
      console.error('Failed to create audit log:', err);
    });

    return pharmacyOrderItem;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update pharmacy order item
 *
 * @param {string} id - Pharmacy order item ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - Client IP address
 * @returns {Promise<Object>}
 */
const updatePharmacyOrderItem = async (id, data, userId, ipAddress) => {
  try {
    const before = await pharmacyOrderItemRepository.findById(id, ORDER_TENANT_INCLUDE);
    if (!before) {
      throw new HttpError('errors.pharmacy_order_item.not_found', 404);
    }

    const pharmacyOrderItem = await pharmacyOrderItemRepository.update(id, data);
    const afterWithOrder = await pharmacyOrderItemRepository.findById(id, ORDER_TENANT_INCLUDE);

    createAuditLog({
      tenant_id: resolveTenantId(afterWithOrder) || resolveTenantId(before),
      user_id: userId,
      action: 'UPDATE',
      entity: 'pharmacy_order_item',
      entity_id: pharmacyOrderItem.id,
      diff: { before, after: pharmacyOrderItem },
      ip_address: ipAddress
    }).catch((err) => {
      console.error('Failed to create audit log:', err);
    });

    return pharmacyOrderItem;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete pharmacy order item (soft delete)
 *
 * @param {string} id - Pharmacy order item ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - Client IP address
 * @returns {Promise<void>}
 */
const deletePharmacyOrderItem = async (id, userId, ipAddress) => {
  try {
    const before = await pharmacyOrderItemRepository.findById(id, ORDER_TENANT_INCLUDE);
    if (!before) {
      throw new HttpError('errors.pharmacy_order_item.not_found', 404);
    }

    await pharmacyOrderItemRepository.softDelete(id);

    createAuditLog({
      tenant_id: resolveTenantId(before),
      user_id: userId,
      action: 'DELETE',
      entity: 'pharmacy_order_item',
      entity_id: id,
      diff: { before },
      ip_address: ipAddress
    }).catch((err) => {
      console.error('Failed to create audit log:', err);
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listPharmacyOrderItems,
  getPharmacyOrderItemById,
  createPharmacyOrderItem,
  updatePharmacyOrderItem,
  deletePharmacyOrderItem
};

