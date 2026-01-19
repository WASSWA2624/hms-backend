/**
 * Drug service
 *
 * @module modules/drug/services
 * @description Business logic layer for drug operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const drugRepository = require('../repositories/drug.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List drugs with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Drugs and pagination data
 */
const listDrugs = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.name) whereClause.name = { contains: filters.name };
    if (filters.code) whereClause.code = { contains: filters.code };
    if (filters.form) whereClause.form = { contains: filters.form };
    if (filters.strength) whereClause.strength = { contains: filters.strength };
    
    // Search filter (searches in name, code)
    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search } },
        { code: { contains: filters.search } }
      ];
    }

    const [drugs, total] = await Promise.all([
      drugRepository.findMany(whereClause, skip, limit, orderBy),
      drugRepository.count(whereClause)
    ]);

    return {
      drugs,
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
 * Get drug by ID
 *
 * @param {string} id - Drug ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Drug data
 */
const getDrugById = async (id, userId, ipAddress) => {
  try {
    const drug = await drugRepository.findById(id);

    if (!drug) {
      throw new HttpError('errors.drug.not_found', 404);
    }

    return drug;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new drug
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Drug data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created drug
 */
const createDrug = async (data, userId, ipAddress) => {
  try {
    const drug = await drugRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'drug',
      entity_id: drug.id,
      diff: { after: drug },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return drug;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update drug
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Drug ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated drug
 */
const updateDrug = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await drugRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.drug.not_found', 404);
    }

    const drug = await drugRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'drug',
      entity_id: drug.id,
      diff: { before, after: drug },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return drug;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete drug (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Drug ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteDrug = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await drugRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.drug.not_found', 404);
    }

    await drugRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'drug',
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
  listDrugs,
  getDrugById,
  createDrug,
  updateDrug,
  deleteDrug
};
