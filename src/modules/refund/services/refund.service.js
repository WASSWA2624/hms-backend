/**
 * Refund service
 *
 * @module modules/refund/services
 * @description Business logic layer for refund operations.
 */

const refundRepository = require('../repositories/refund.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const PAYMENT_TENANT_INCLUDE = {
  payment: {
    select: {
      tenant_id: true
    }
  }
};

const resolveTenantId = (refund) => refund?.payment?.tenant_id || null;

/**
 * List refunds
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @returns {Promise<Object>}
 */
const listRefunds = async (filters, page, limit, sortBy, order) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { refunded_at: 'desc' };

    const whereClause = {};
    if (filters.payment_id) whereClause.payment_id = filters.payment_id;

    if (filters.refunded_at_from || filters.refunded_at_to) {
      whereClause.refunded_at = {};
      if (filters.refunded_at_from) whereClause.refunded_at.gte = new Date(filters.refunded_at_from);
      if (filters.refunded_at_to) whereClause.refunded_at.lte = new Date(filters.refunded_at_to);
    }

    if (filters.search) {
      whereClause.OR = [
        { reason: { contains: filters.search } },
        { id: { contains: filters.search } }
      ];
    }

    const [refunds, total] = await Promise.all([
      refundRepository.findMany(whereClause, skip, limit, orderBy),
      refundRepository.count(whereClause)
    ]);

    return {
      refunds,
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
 * Get refund by ID
 *
 * @param {string} id - Refund ID
 * @returns {Promise<Object>}
 */
const getRefundById = async (id) => {
  try {
    const refund = await refundRepository.findById(id, {
      payment: true
    });

    if (!refund) {
      throw new HttpError('errors.refund.not_found', 404);
    }

    return refund;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create refund
 *
 * @param {Object} data - Refund data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - Client IP address
 * @returns {Promise<Object>}
 */
const createRefund = async (data, userId, ipAddress) => {
  try {
    const refund = await refundRepository.create(data);
    const createdWithPayment = await refundRepository.findById(refund.id, PAYMENT_TENANT_INCLUDE);
    const tenantId = resolveTenantId(createdWithPayment);

    createAuditLog({
      tenant_id: tenantId,
      user_id: userId,
      action: 'CREATE',
      entity: 'refund',
      entity_id: refund.id,
      diff: { after: refund },
      ip_address: ipAddress
    }).catch(() => {});

    return refund;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update refund
 *
 * @param {string} id - Refund ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - Client IP address
 * @returns {Promise<Object>}
 */
const updateRefund = async (id, data, userId, ipAddress) => {
  try {
    const before = await refundRepository.findById(id, PAYMENT_TENANT_INCLUDE);
    if (!before) {
      throw new HttpError('errors.refund.not_found', 404);
    }

    const refund = await refundRepository.update(id, data);
    const afterWithPayment = await refundRepository.findById(id, PAYMENT_TENANT_INCLUDE);
    const tenantId = resolveTenantId(afterWithPayment) || resolveTenantId(before);

    createAuditLog({
      tenant_id: tenantId,
      user_id: userId,
      action: 'UPDATE',
      entity: 'refund',
      entity_id: refund.id,
      diff: { before, after: refund },
      ip_address: ipAddress
    }).catch(() => {});

    return refund;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete refund (soft delete)
 *
 * @param {string} id - Refund ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - Client IP address
 * @returns {Promise<void>}
 */
const deleteRefund = async (id, userId, ipAddress) => {
  try {
    const before = await refundRepository.findById(id, PAYMENT_TENANT_INCLUDE);
    if (!before) {
      throw new HttpError('errors.refund.not_found', 404);
    }

    await refundRepository.softDelete(id);

    createAuditLog({
      tenant_id: resolveTenantId(before),
      user_id: userId,
      action: 'DELETE',
      entity: 'refund',
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
  listRefunds,
  getRefundById,
  createRefund,
  updateRefund,
  deleteRefund
};

