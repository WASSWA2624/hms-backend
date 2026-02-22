/**
 * Pharmacy order service
 *
 * @module modules/pharmacy-order/services
 * @description Business logic layer for pharmacy order operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const pharmacyOrderRepository = require('@repositories/pharmacy-order/pharmacy-order.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List pharmacy orders with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Pharmacy orders and pagination data
 */
const listPharmacyOrders = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { ordered_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.patient_id) whereClause.patient_id = filters.patient_id;
    if (filters.encounter_id) whereClause.encounter_id = filters.encounter_id;
    if (filters.status) whereClause.status = filters.status;
    
    // Date range filters
    if (filters.ordered_at_from || filters.ordered_at_to) {
      whereClause.ordered_at = {};
      if (filters.ordered_at_from) whereClause.ordered_at.gte = new Date(filters.ordered_at_from);
      if (filters.ordered_at_to) whereClause.ordered_at.lte = new Date(filters.ordered_at_to);
    }

    const [pharmacyOrders, total] = await Promise.all([
      pharmacyOrderRepository.findMany(whereClause, skip, limit, orderBy),
      pharmacyOrderRepository.count(whereClause)
    ]);

    return {
      pharmacyOrders,
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
 * Get pharmacy order by ID
 *
 * @param {string} id - Pharmacy order ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Pharmacy order data
 */
const getPharmacyOrderById = async (id, userId, ipAddress) => {
  try {
    const pharmacyOrder = await pharmacyOrderRepository.findById(id);

    if (!pharmacyOrder) {
      throw new HttpError('errors.pharmacy_order.not_found', 404);
    }

    return pharmacyOrder;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new pharmacy order
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Pharmacy order data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created pharmacy order
 */
const createPharmacyOrder = async (data, userId, ipAddress) => {
  try {
    const pharmacyOrder = await pharmacyOrderRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'pharmacy_order',
      entity_id: pharmacyOrder.id,
      diff: { after: pharmacyOrder },
      ip_address: ipAddress
    }).catch(() => {});

    return pharmacyOrder;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update pharmacy order
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Pharmacy order ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated pharmacy order
 */
const updatePharmacyOrder = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await pharmacyOrderRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.pharmacy_order.not_found', 404);
    }

    const pharmacyOrder = await pharmacyOrderRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'pharmacy_order',
      entity_id: pharmacyOrder.id,
      diff: { before, after: pharmacyOrder },
      ip_address: ipAddress
    }).catch(() => {});

    return pharmacyOrder;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete pharmacy order (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Pharmacy order ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deletePharmacyOrder = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await pharmacyOrderRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.pharmacy_order.not_found', 404);
    }

    await pharmacyOrderRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'pharmacy_order',
      entity_id: id,
      diff: { before },
      ip_address: ipAddress
    }).catch(() => {});
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Dispense pharmacy order
 *
 * @param {string} id - Pharmacy order ID
 * @param {Object} data - Dispense payload
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated pharmacy order
 */
const dispensePharmacyOrder = async (id, data = {}, userId, ipAddress) => {
  try {
    const before = await pharmacyOrderRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.pharmacy_order.not_found', 404);
    }

    if (before.status === 'CANCELLED') {
      throw new HttpError('errors.pharmacy_order.cannot_dispense_cancelled', 400);
    }

    if (before.status === 'DISPENSED') {
      throw new HttpError('errors.pharmacy_order.already_dispensed', 400);
    }

    const pharmacyOrder = await pharmacyOrderRepository.update(id, {
      status: data.status || 'DISPENSED'
    });

    createAuditLog({
      user_id: userId,
      action: 'DISPENSE',
      entity: 'pharmacy_order',
      entity_id: pharmacyOrder.id,
      diff: {
        before,
        after: pharmacyOrder,
        metadata: {
          notes: data.notes || null
        }
      },
      ip_address: ipAddress
    }).catch(() => {});

    return pharmacyOrder;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listPharmacyOrders,
  getPharmacyOrderById,
  createPharmacyOrder,
  updatePharmacyOrder,
  deletePharmacyOrder,
  dispensePharmacyOrder
};
