/**
 * Invoice item service
 *
 * @module modules/invoice-item/services
 * @description Business logic layer for invoice item operations.
 */

const invoiceItemRepository = require('../repositories/invoice-item.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const INVOICE_TENANT_INCLUDE = {
  invoice: {
    select: {
      tenant_id: true
    }
  }
};

const resolveTenantId = (invoiceItem) => invoiceItem?.invoice?.tenant_id || null;

/**
 * List invoice items
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @returns {Promise<Object>}
 */
const listInvoiceItems = async (filters, page, limit, sortBy, order) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    const whereClause = {};
    if (filters.invoice_id) whereClause.invoice_id = filters.invoice_id;
    if (filters.search) {
      whereClause.description = { contains: filters.search };
    }

    const [invoiceItems, total] = await Promise.all([
      invoiceItemRepository.findMany(whereClause, skip, limit, orderBy),
      invoiceItemRepository.count(whereClause)
    ]);

    return {
      invoiceItems,
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
 * Get invoice item by ID
 *
 * @param {string} id - Invoice item ID
 * @returns {Promise<Object>}
 */
const getInvoiceItemById = async (id) => {
  try {
    const invoiceItem = await invoiceItemRepository.findById(id, {
      invoice: true
    });

    if (!invoiceItem) {
      throw new HttpError('errors.invoice_item.not_found', 404);
    }

    return invoiceItem;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create invoice item
 *
 * @param {Object} data - Invoice item data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - Client IP address
 * @returns {Promise<Object>}
 */
const createInvoiceItem = async (data, userId, ipAddress) => {
  try {
    const invoiceItem = await invoiceItemRepository.create(data);
    const createdWithInvoice = await invoiceItemRepository.findById(invoiceItem.id, INVOICE_TENANT_INCLUDE);
    const tenantId = resolveTenantId(createdWithInvoice);

    createAuditLog({
      tenant_id: tenantId,
      user_id: userId,
      action: 'CREATE',
      entity: 'invoice_item',
      entity_id: invoiceItem.id,
      diff: { after: invoiceItem },
      ip_address: ipAddress
    }).catch(() => {});

    return invoiceItem;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update invoice item
 *
 * @param {string} id - Invoice item ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - Client IP address
 * @returns {Promise<Object>}
 */
const updateInvoiceItem = async (id, data, userId, ipAddress) => {
  try {
    const before = await invoiceItemRepository.findById(id, INVOICE_TENANT_INCLUDE);
    if (!before) {
      throw new HttpError('errors.invoice_item.not_found', 404);
    }

    const invoiceItem = await invoiceItemRepository.update(id, data);
    const afterWithInvoice = await invoiceItemRepository.findById(id, INVOICE_TENANT_INCLUDE);
    const tenantId = resolveTenantId(afterWithInvoice) || resolveTenantId(before);

    createAuditLog({
      tenant_id: tenantId,
      user_id: userId,
      action: 'UPDATE',
      entity: 'invoice_item',
      entity_id: invoiceItem.id,
      diff: { before, after: invoiceItem },
      ip_address: ipAddress
    }).catch(() => {});

    return invoiceItem;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete invoice item (soft delete)
 *
 * @param {string} id - Invoice item ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - Client IP address
 * @returns {Promise<void>}
 */
const deleteInvoiceItem = async (id, userId, ipAddress) => {
  try {
    const before = await invoiceItemRepository.findById(id, INVOICE_TENANT_INCLUDE);
    if (!before) {
      throw new HttpError('errors.invoice_item.not_found', 404);
    }

    await invoiceItemRepository.softDelete(id);

    createAuditLog({
      tenant_id: resolveTenantId(before),
      user_id: userId,
      action: 'DELETE',
      entity: 'invoice_item',
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
  listInvoiceItems,
  getInvoiceItemById,
  createInvoiceItem,
  updateInvoiceItem,
  deleteInvoiceItem
};

