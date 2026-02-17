/**
 * Payroll item service
 *
 * @module modules/payroll-item/services
 * @description Business logic layer for payroll item operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const payrollItemRepository = require('@repositories/payroll-item/payroll-item.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List payroll items with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Payroll items and pagination data
 */
const listPayrollItems = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.payroll_run_id) whereClause.payroll_run_id = filters.payroll_run_id;
    if (filters.staff_profile_id) whereClause.staff_profile_id = filters.staff_profile_id;
    if (filters.currency) whereClause.currency = filters.currency;
    
    // Amount range filters
    if (filters.amount_min !== undefined || filters.amount_max !== undefined) {
      whereClause.amount = {};
      if (filters.amount_min !== undefined) whereClause.amount.gte = filters.amount_min;
      if (filters.amount_max !== undefined) whereClause.amount.lte = filters.amount_max;
    }

    const [payrollItems, total] = await Promise.all([
      payrollItemRepository.findMany(whereClause, skip, limit, orderBy),
      payrollItemRepository.count(whereClause)
    ]);

    return {
      payrollItems,
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
 * Get payroll item by ID
 *
 * @param {string} id - Payroll item ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Payroll item data
 */
const getPayrollItemById = async (id, userId, ipAddress) => {
  try {
    const payrollItem = await payrollItemRepository.findById(id);

    if (!payrollItem) {
      throw new HttpError('errors.payroll_item.not_found', 404);
    }

    return payrollItem;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new payroll item
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Payroll item data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created payroll item
 */
const createPayrollItem = async (data, userId, ipAddress) => {
  try {
    const payrollItem = await payrollItemRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'payroll_item',
      entity_id: payrollItem.id,
      diff: { after: payrollItem },
      ip_address: ipAddress
    }).catch(() => {});

    return payrollItem;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update payroll item
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Payroll item ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated payroll item
 */
const updatePayrollItem = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await payrollItemRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.payroll_item.not_found', 404);
    }

    const payrollItem = await payrollItemRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'payroll_item',
      entity_id: payrollItem.id,
      diff: { before, after: payrollItem },
      ip_address: ipAddress
    }).catch(() => {});

    return payrollItem;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete payroll item (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Payroll item ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deletePayrollItem = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await payrollItemRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.payroll_item.not_found', 404);
    }

    await payrollItemRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'payroll_item',
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
  listPayrollItems,
  getPayrollItemById,
  createPayrollItem,
  updatePayrollItem,
  deletePayrollItem
};
