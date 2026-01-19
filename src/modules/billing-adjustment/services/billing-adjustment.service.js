/**
 * Billing Adjustment service
 *
 * @module modules/billing-adjustment/services
 * @description Business logic layer for billing adjustment operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const billingAdjustmentRepository = require('../repositories/billing-adjustment.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List billing adjustments with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Billing adjustments and pagination data
 */
const listBillingAdjustments = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.invoice_id) whereClause.invoice_id = filters.invoice_id;
    if (filters.status) whereClause.status = filters.status;
    
    // Search filter (searches in reason)
    if (filters.search) {
      whereClause.reason = { contains: filters.search };
    }

    const [billingAdjustments, total] = await Promise.all([
      billingAdjustmentRepository.findMany(whereClause, skip, limit, orderBy),
      billingAdjustmentRepository.count(whereClause)
    ]);

    return {
      billingAdjustments,
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
 * Get billing adjustment by ID
 *
 * @param {string} id - Billing Adjustment ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Billing adjustment data
 */
const getBillingAdjustmentById = async (id, userId, ipAddress) => {
  try {
    const billingAdjustment = await billingAdjustmentRepository.findById(id);

    if (!billingAdjustment) {
      throw new HttpError('errors.billing_adjustment.not_found', 404);
    }

    return billingAdjustment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new billing adjustment
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Billing Adjustment data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created billing adjustment
 */
const createBillingAdjustment = async (data, userId, ipAddress) => {
  try {
    const billingAdjustment = await billingAdjustmentRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'billing_adjustment',
      entity_id: billingAdjustment.id,
      diff: { after: billingAdjustment },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return billingAdjustment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update billing adjustment
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Billing Adjustment ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated billing adjustment
 */
const updateBillingAdjustment = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await billingAdjustmentRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.billing_adjustment.not_found', 404);
    }

    const billingAdjustment = await billingAdjustmentRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'billing_adjustment',
      entity_id: billingAdjustment.id,
      diff: { before, after: billingAdjustment },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return billingAdjustment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete billing adjustment (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Billing Adjustment ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteBillingAdjustment = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await billingAdjustmentRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.billing_adjustment.not_found', 404);
    }

    await billingAdjustmentRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'billing_adjustment',
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
  listBillingAdjustments,
  getBillingAdjustmentById,
  createBillingAdjustment,
  updateBillingAdjustment,
  deleteBillingAdjustment
};
