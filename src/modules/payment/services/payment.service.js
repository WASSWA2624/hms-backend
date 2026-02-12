/**
 * Payment service
 *
 * @module modules/payment/services
 * @description Business logic layer for payment operations.
 */

const paymentRepository = require('../repositories/payment.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List payments
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @returns {Promise<Object>}
 */
const listPayments = async (filters, page, limit, sortBy, order) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    const whereClause = {};
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.facility_id) whereClause.facility_id = filters.facility_id;
    if (filters.patient_id) whereClause.patient_id = filters.patient_id;
    if (filters.invoice_id) whereClause.invoice_id = filters.invoice_id;
    if (filters.status) whereClause.status = filters.status;
    if (filters.method) whereClause.method = filters.method;

    if (filters.paid_at_from || filters.paid_at_to) {
      whereClause.paid_at = {};
      if (filters.paid_at_from) whereClause.paid_at.gte = new Date(filters.paid_at_from);
      if (filters.paid_at_to) whereClause.paid_at.lte = new Date(filters.paid_at_to);
    }

    if (filters.search) {
      whereClause.OR = [
        { transaction_ref: { contains: filters.search } },
        { id: { contains: filters.search } }
      ];
    }

    const [payments, total] = await Promise.all([
      paymentRepository.findMany(whereClause, skip, limit, orderBy),
      paymentRepository.count(whereClause)
    ]);

    return {
      payments,
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
 * Get payment by ID
 *
 * @param {string} id - Payment ID
 * @returns {Promise<Object>}
 */
const getPaymentById = async (id) => {
  try {
    const payment = await paymentRepository.findById(id, {
      tenant: true,
      facility: true,
      patient: true,
      invoice: true,
      refunds: true
    });

    if (!payment) {
      throw new HttpError('errors.payment.not_found', 404);
    }

    return payment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create payment
 *
 * @param {Object} data - Payment data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - Client IP address
 * @returns {Promise<Object>}
 */
const createPayment = async (data, userId, ipAddress) => {
  try {
    const payment = await paymentRepository.create(data);

    createAuditLog({
      tenant_id: payment.tenant_id || data.tenant_id,
      user_id: userId,
      action: 'CREATE',
      entity: 'payment',
      entity_id: payment.id,
      diff: { after: payment },
      ip_address: ipAddress
    }).catch((err) => {
      console.error('Failed to create audit log:', err);
    });

    return payment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update payment
 *
 * @param {string} id - Payment ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - Client IP address
 * @returns {Promise<Object>}
 */
const updatePayment = async (id, data, userId, ipAddress) => {
  try {
    const before = await paymentRepository.findById(id);
    if (!before) {
      throw new HttpError('errors.payment.not_found', 404);
    }

    const payment = await paymentRepository.update(id, data);
    const tenantId = payment.tenant_id || before.tenant_id;

    createAuditLog({
      tenant_id: tenantId,
      user_id: userId,
      action: 'UPDATE',
      entity: 'payment',
      entity_id: payment.id,
      diff: { before, after: payment },
      ip_address: ipAddress
    }).catch((err) => {
      console.error('Failed to create audit log:', err);
    });

    return payment;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete payment (soft delete)
 *
 * @param {string} id - Payment ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - Client IP address
 * @returns {Promise<void>}
 */
const deletePayment = async (id, userId, ipAddress) => {
  try {
    const before = await paymentRepository.findById(id);
    if (!before) {
      throw new HttpError('errors.payment.not_found', 404);
    }

    await paymentRepository.softDelete(id);

    createAuditLog({
      tenant_id: before.tenant_id,
      user_id: userId,
      action: 'DELETE',
      entity: 'payment',
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
  listPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment
};

