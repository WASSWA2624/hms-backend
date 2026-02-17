/**
 * Payroll run service
 *
 * @module modules/payroll-run/services
 * @description Business logic layer for payroll run operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const payrollRunRepository = require('@repositories/payroll-run/payroll-run.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List payroll runs with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Payroll runs and pagination data
 */
const listPayrollRuns = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.status) whereClause.status = filters.status;
    
    // Date range filters
    if (filters.period_start_from || filters.period_start_to) {
      whereClause.period_start = {};
      if (filters.period_start_from) whereClause.period_start.gte = filters.period_start_from;
      if (filters.period_start_to) whereClause.period_start.lte = filters.period_start_to;
    }
    
    if (filters.period_end_from || filters.period_end_to) {
      whereClause.period_end = {};
      if (filters.period_end_from) whereClause.period_end.gte = filters.period_end_from;
      if (filters.period_end_to) whereClause.period_end.lte = filters.period_end_to;
    }

    const [payrollRuns, total] = await Promise.all([
      payrollRunRepository.findMany(whereClause, skip, limit, orderBy),
      payrollRunRepository.count(whereClause)
    ]);

    return {
      payrollRuns,
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
 * Get payroll run by ID
 *
 * @param {string} id - Payroll run ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Payroll run data
 */
const getPayrollRunById = async (id, userId, ipAddress) => {
  try {
    const payrollRun = await payrollRunRepository.findById(id);

    if (!payrollRun) {
      throw new HttpError('errors.payroll_run.not_found', 404);
    }

    return payrollRun;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new payroll run
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Payroll run data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created payroll run
 */
const createPayrollRun = async (data, userId, ipAddress) => {
  try {
    const payrollRun = await payrollRunRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'payroll_run',
      entity_id: payrollRun.id,
      diff: { after: payrollRun },
      ip_address: ipAddress
    }).catch(() => {});

    return payrollRun;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update payroll run
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Payroll run ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated payroll run
 */
const updatePayrollRun = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await payrollRunRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.payroll_run.not_found', 404);
    }

    const payrollRun = await payrollRunRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'payroll_run',
      entity_id: payrollRun.id,
      diff: { before, after: payrollRun },
      ip_address: ipAddress
    }).catch(() => {});

    return payrollRun;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete payroll run (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Payroll run ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deletePayrollRun = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await payrollRunRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.payroll_run.not_found', 404);
    }

    await payrollRunRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'payroll_run',
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
  listPayrollRuns,
  getPayrollRunById,
  createPayrollRun,
  updatePayrollRun,
  deletePayrollRun
};
