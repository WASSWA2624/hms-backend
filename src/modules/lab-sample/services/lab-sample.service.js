/**
 * Lab sample service
 *
 * @module modules/lab-sample/services
 * @description Business logic layer for lab sample operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const labSampleRepository = require('../repositories/lab-sample.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List lab samples with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Lab samples and pagination data
 */
const listLabSamples = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.lab_order_id) whereClause.lab_order_id = filters.lab_order_id;
    if (filters.status) whereClause.status = filters.status;

    const [labSamples, total] = await Promise.all([
      labSampleRepository.findMany(whereClause, skip, limit, orderBy),
      labSampleRepository.count(whereClause)
    ]);

    return {
      labSamples,
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
 * Get lab sample by ID
 *
 * @param {string} id - Lab sample ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Lab sample data
 */
const getLabSampleById = async (id, userId, ipAddress) => {
  try {
    const labSample = await labSampleRepository.findById(id);

    if (!labSample) {
      throw new HttpError('errors.lab_sample.not_found', 404);
    }

    return labSample;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new lab sample
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Lab sample data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created lab sample
 */
const createLabSample = async (data, userId, ipAddress) => {
  try {
    const labSample = await labSampleRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'lab_sample',
      entity_id: labSample.id,
      diff: { after: labSample },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return labSample;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update lab sample
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Lab sample ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated lab sample
 */
const updateLabSample = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await labSampleRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.lab_sample.not_found', 404);
    }

    const labSample = await labSampleRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'lab_sample',
      entity_id: labSample.id,
      diff: { before, after: labSample },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return labSample;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete lab sample (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Lab sample ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteLabSample = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await labSampleRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.lab_sample.not_found', 404);
    }

    await labSampleRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'lab_sample',
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
  listLabSamples,
  getLabSampleById,
  createLabSample,
  updateLabSample,
  deleteLabSample
};
