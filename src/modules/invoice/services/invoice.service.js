/**
 * Invoice service
 *
 * @module modules/invoice/services
 * @description Business logic layer for invoice operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const invoiceRepository = require('../repositories/invoice.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List invoices with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Invoices and pagination data
 */
const listInvoices = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.facility_id) whereClause.facility_id = filters.facility_id;
    if (filters.patient_id) whereClause.patient_id = filters.patient_id;
    if (filters.status) whereClause.status = filters.status;
    if (filters.billing_status) whereClause.billing_status = filters.billing_status;
    
    // Search filter (searches in id or patient info)
    if (filters.search) {
      whereClause.OR = [
        { id: { contains: filters.search } }
      ];
    }

    const [invoices, total] = await Promise.all([
      invoiceRepository.findMany(whereClause, skip, limit, orderBy),
      invoiceRepository.count(whereClause)
    ]);

    return {
      invoices,
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
 * Get invoice by ID
 *
 * @param {string} id - Invoice ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Invoice data
 */
const getInvoiceById = async (id, userId, ipAddress) => {
  try {
    const invoice = await invoiceRepository.findById(id, {
      items: true,
      payments: true,
      tenant: true,
      facility: true,
      patient: true
    });

    if (!invoice) {
      throw new HttpError('errors.invoice.not_found', 404);
    }

    return invoice;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new invoice
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Invoice data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created invoice
 */
const createInvoice = async (data, userId, ipAddress) => {
  try {
    const invoice = await invoiceRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'invoice',
      entity_id: invoice.id,
      diff: { after: invoice },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return invoice;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update invoice
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Invoice ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated invoice
 */
const updateInvoice = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await invoiceRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.invoice.not_found', 404);
    }

    const invoice = await invoiceRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'invoice',
      entity_id: invoice.id,
      diff: { before, after: invoice },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return invoice;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete invoice (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Invoice ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteInvoice = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await invoiceRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.invoice.not_found', 404);
    }

    await invoiceRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'invoice',
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
  listInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice
};
