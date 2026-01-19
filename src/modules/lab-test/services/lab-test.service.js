/**
 * Lab test service
 *
 * @module modules/lab-test/services
 * @description Business logic layer for lab test operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const labTestRepository = require('../repositories/lab-test.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List lab tests with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Lab tests and pagination data
 */
const listLabTests = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.code) whereClause.code = { contains: filters.code };
    if (filters.name) whereClause.name = { contains: filters.name };
    
    // Search filter (searches in name, code)
    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search } },
        { code: { contains: filters.search } }
      ];
    }

    const [labTests, total] = await Promise.all([
      labTestRepository.findMany(whereClause, skip, limit, orderBy),
      labTestRepository.count(whereClause)
    ]);

    return {
      labTests,
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
 * Get lab test by ID
 *
 * @param {string} id - Lab test ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Lab test data
 */
const getLabTestById = async (id, userId, ipAddress) => {
  try {
    const labTest = await labTestRepository.findById(id);

    if (!labTest) {
      throw new HttpError('errors.lab_test.not_found', 404);
    }

    return labTest;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new lab test
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Lab test data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created lab test
 */
const createLabTest = async (data, userId, ipAddress) => {
  try {
    const labTest = await labTestRepository.create(data);

    // Create audit log (non-blocking)
    await createAuditLog({
      user_id: userId,
      action: 'create',
      entity: 'lab_test',
      entity_id: labTest.id,
      diff: { after: labTest },
      ip: ipAddress
    });

    return labTest;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update lab test
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Lab test ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated lab test
 */
const updateLabTest = async (id, data, userId, ipAddress) => {
  try {
    // Get current data for audit log
    const before = await labTestRepository.findById(id);
    
    if (!before) {
      throw new HttpError('errors.lab_test.not_found', 404);
    }

    const labTest = await labTestRepository.update(id, data);

    // Create audit log (non-blocking)
    await createAuditLog({
      user_id: userId,
      action: 'update',
      entity: 'lab_test',
      entity_id: labTest.id,
      diff: { before, after: labTest },
      ip: ipAddress
    });

    return labTest;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete lab test (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Lab test ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Deleted lab test
 */
const deleteLabTest = async (id, userId, ipAddress) => {
  try {
    // Get current data for audit log
    const before = await labTestRepository.findById(id);
    
    if (!before) {
      throw new HttpError('errors.lab_test.not_found', 404);
    }

    const labTest = await labTestRepository.softDelete(id);

    // Create audit log (non-blocking)
    await createAuditLog({
      user_id: userId,
      action: 'delete',
      entity: 'lab_test',
      entity_id: labTest.id,
      diff: { before },
      ip: ipAddress
    });

    return labTest;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listLabTests,
  getLabTestById,
  createLabTest,
  updateLabTest,
  deleteLabTest
};
