/**
 * Subscription Invoice service
 *
 * @module modules/subscription-invoice/services
 * @description Business logic layer for subscription invoice operations.
 * Per module-creation.mdc: Only import and use its own repository.
 * Per module-creation.mdc: All mutations must call audit log creation.
 */

const subscriptionInvoiceRepository = require('../repositories/subscription-invoice.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * Get subscription invoice by ID
 *
 * @param {string} id - Subscription Invoice ID
 * @returns {Promise<Object>} Subscription Invoice object
 * @throws {HttpError} 404 if not found
 */
const getSubscriptionInvoiceById = async (id) => {
  const subscriptionInvoice = await subscriptionInvoiceRepository.findById(id, {
    subscription: true,
    invoice: true
  });

  if (!subscriptionInvoice) {
    throw new HttpError('errors.subscription_invoice.not_found', 404);
  }

  return subscriptionInvoice;
};

/**
 * List subscription invoices with pagination and filters
 *
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (asc/desc)
 * @returns {Promise<Object>} Paginated subscription invoices with metadata
 */
const listSubscriptionInvoices = async (filters = {}, page = 1, limit = 20, sortBy = 'created_at', order = 'desc') => {
  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: order };

  // Build filters
  const where = {};

  if (filters.subscription_id) {
    where.subscription_id = filters.subscription_id;
  }

  if (filters.invoice_id) {
    where.invoice_id = filters.invoice_id;
  }

  const include = {
    subscription: true,
    invoice: true
  };

  const [subscriptionInvoices, total] = await Promise.all([
    subscriptionInvoiceRepository.findMany(where, skip, limit, orderBy, include),
    subscriptionInvoiceRepository.count(where)
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    subscriptionInvoices,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  };
};

/**
 * Create new subscription invoice
 *
 * @param {Object} data - Subscription Invoice data
 * @param {Object} user - Current user for audit
 * @param {string} ip - Client IP for audit
 * @returns {Promise<Object>} Created subscription invoice
 */
const createSubscriptionInvoice = async (data, user, ip) => {
  const subscriptionInvoice = await subscriptionInvoiceRepository.create(data);

  // Create audit log
  await createAuditLog({
    user_id: user?.id || null,
    action: 'CREATE',
    entity: 'subscription_invoice',
    entity_id: subscriptionInvoice.id,
    diff: { after: subscriptionInvoice },
    ip
  }).catch(() => {});

  return subscriptionInvoice;
};

/**
 * Update subscription invoice
 *
 * @param {string} id - Subscription Invoice ID
 * @param {Object} data - Update data
 * @param {Object} user - Current user for audit
 * @param {string} ip - Client IP for audit
 * @returns {Promise<Object>} Updated subscription invoice
 */
const updateSubscriptionInvoice = async (id, data, user, ip) => {
  const before = await getSubscriptionInvoiceById(id);
  const subscriptionInvoice = await subscriptionInvoiceRepository.update(id, data);

  // Create audit log
  await createAuditLog({
    user_id: user?.id || null,
    action: 'UPDATE',
    entity: 'subscription_invoice',
    entity_id: subscriptionInvoice.id,
    diff: { before, after: subscriptionInvoice },
    ip
  }).catch(() => {});

  return subscriptionInvoice;
};

/**
 * Delete subscription invoice (soft delete)
 *
 * @param {string} id - Subscription Invoice ID
 * @param {Object} user - Current user for audit
 * @param {string} ip - Client IP for audit
 * @returns {Promise<Object>} Deleted subscription invoice
 */
const deleteSubscriptionInvoice = async (id, user, ip) => {
  const before = await getSubscriptionInvoiceById(id);
  const subscriptionInvoice = await subscriptionInvoiceRepository.softDelete(id);

  // Create audit log
  await createAuditLog({
    user_id: user?.id || null,
    action: 'DELETE',
    entity: 'subscription_invoice',
    entity_id: subscriptionInvoice.id,
    diff: { before, after: subscriptionInvoice },
    ip
  }).catch(() => {});

  return subscriptionInvoice;
};

module.exports = {
  getSubscriptionInvoiceById,
  listSubscriptionInvoices,
  createSubscriptionInvoice,
  updateSubscriptionInvoice,
  deleteSubscriptionInvoice
};
