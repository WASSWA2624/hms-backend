/**
 * Inventory item service
 *
 * @module modules/inventory-item/services
 * @description Business logic layer for inventory item operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const inventoryItemRepository = require('../repositories/inventory-item.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List inventory items with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Inventory items and pagination data
 */
const listInventoryItems = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.name) whereClause.name = { contains: filters.name };
    if (filters.category) whereClause.category = filters.category;
    if (filters.sku) whereClause.sku = { contains: filters.sku };
    if (filters.unit) whereClause.unit = { contains: filters.unit };
    
    // Search filter (searches in name, sku)
    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search } },
        { sku: { contains: filters.search } }
      ];
    }

    const [inventoryItems, total] = await Promise.all([
      inventoryItemRepository.findMany(whereClause, skip, limit, orderBy),
      inventoryItemRepository.count(whereClause)
    ]);

    return {
      inventoryItems,
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
 * Get inventory item by ID
 *
 * @param {string} id - Inventory item ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Inventory item data
 */
const getInventoryItemById = async (id, userId, ipAddress) => {
  try {
    const inventoryItem = await inventoryItemRepository.findById(id);

    if (!inventoryItem) {
      throw new HttpError('errors.inventory_item.not_found', 404);
    }

    return inventoryItem;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new inventory item
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Inventory item data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created inventory item
 */
const createInventoryItem = async (data, userId, ipAddress) => {
  try {
    const inventoryItem = await inventoryItemRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'inventory_item',
      entity_id: inventoryItem.id,
      diff: { after: inventoryItem },
      ip_address: ipAddress
    }).catch(() => {});

    return inventoryItem;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update inventory item
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Inventory item ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated inventory item
 */
const updateInventoryItem = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await inventoryItemRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.inventory_item.not_found', 404);
    }

    const inventoryItem = await inventoryItemRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'inventory_item',
      entity_id: inventoryItem.id,
      diff: { before, after: inventoryItem },
      ip_address: ipAddress
    }).catch(() => {});

    return inventoryItem;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete inventory item (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Inventory item ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteInventoryItem = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await inventoryItemRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.inventory_item.not_found', 404);
    }

    await inventoryItemRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'inventory_item',
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
  listInventoryItems,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
};
