/**
 * Inventory stock service
 *
 * @module modules/inventory-stock/services
 * @description Business logic layer for inventory stock operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const inventoryStockRepository = require('../repositories/inventory-stock.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List inventory stocks with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Inventory stocks and pagination data
 */
const listInventoryStocks = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.inventory_item_id) whereClause.inventory_item_id = filters.inventory_item_id;
    if (filters.facility_id) whereClause.facility_id = filters.facility_id;
    
    // Quantity filters
    if (filters.min_quantity !== undefined || filters.max_quantity !== undefined) {
      whereClause.quantity = {};
      if (filters.min_quantity !== undefined) whereClause.quantity.gte = filters.min_quantity;
      if (filters.max_quantity !== undefined) whereClause.quantity.lte = filters.max_quantity;
    }
    
    // Below reorder level filter
    if (filters.below_reorder === true) {
      whereClause.quantity = { ...whereClause.quantity, lt: prisma.inventory_stock.fields.reorder_level };
    }

    const [inventoryStocks, total] = await Promise.all([
      inventoryStockRepository.findMany(whereClause, skip, limit, orderBy),
      inventoryStockRepository.count(whereClause)
    ]);

    return {
      inventoryStocks,
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
 * Get inventory stock by ID
 *
 * @param {string} id - Inventory stock ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Inventory stock data
 */
const getInventoryStockById = async (id, userId, ipAddress) => {
  try {
    const inventoryStock = await inventoryStockRepository.findById(id);

    if (!inventoryStock) {
      throw new HttpError('errors.inventory_stock.not_found', 404);
    }

    return inventoryStock;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new inventory stock
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Inventory stock data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created inventory stock
 */
const createInventoryStock = async (data, userId, ipAddress) => {
  try {
    const inventoryStock = await inventoryStockRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'inventory_stock',
      entity_id: inventoryStock.id,
      diff: { after: inventoryStock },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return inventoryStock;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update inventory stock
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Inventory stock ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated inventory stock
 */
const updateInventoryStock = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await inventoryStockRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.inventory_stock.not_found', 404);
    }

    const inventoryStock = await inventoryStockRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'inventory_stock',
      entity_id: inventoryStock.id,
      diff: { before, after: inventoryStock },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return inventoryStock;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete inventory stock (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Inventory stock ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteInventoryStock = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await inventoryStockRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.inventory_stock.not_found', 404);
    }

    await inventoryStockRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'inventory_stock',
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
  listInventoryStocks,
  getInventoryStockById,
  createInventoryStock,
  updateInventoryStock,
  deleteInventoryStock
};
