/**
 * Theatre case service
 *
 * @module modules/theatre-case/services
 * @description Business logic layer for theatre case operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const theatreCaseRepository = require('@repositories/theatre-case/theatre-case.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List theatre cases with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Theatre cases and pagination data
 */
const listTheatreCases = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.encounter_id) whereClause.encounter_id = filters.encounter_id;
    if (filters.status) whereClause.status = filters.status;
    
    // Date range filters
    if (filters.scheduled_from || filters.scheduled_to) {
      whereClause.scheduled_at = {};
      if (filters.scheduled_from) whereClause.scheduled_at.gte = new Date(filters.scheduled_from);
      if (filters.scheduled_to) whereClause.scheduled_at.lte = new Date(filters.scheduled_to);
    }

    const [theatreCases, total] = await Promise.all([
      theatreCaseRepository.findMany(whereClause, skip, limit, orderBy),
      theatreCaseRepository.count(whereClause)
    ]);

    return {
      theatre_cases: theatreCases,
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
 * Get theatre case by ID
 *
 * @param {string} id - Theatre case ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Theatre case data
 */
const getTheatreCaseById = async (id, userId, ipAddress) => {
  try {
    const theatreCase = await theatreCaseRepository.findById(id);

    if (!theatreCase) {
      throw new HttpError('errors.theatre_case.not_found', 404);
    }

    return theatreCase;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new theatre case
 *
 * @param {Object} data - Theatre case data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created theatre case
 */
const createTheatreCase = async (data, userId, ipAddress) => {
  try {
    const theatreCase = await theatreCaseRepository.create(data);

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      resource: 'theatre_case',
      resource_id: theatreCase.id,
      user_id: userId,
      ip_address: ipAddress,
      details: { theatre_case: theatreCase }
    });

    return theatreCase;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update theatre case
 *
 * @param {string} id - Theatre case ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated theatre case
 */
const updateTheatreCase = async (id, data, userId, ipAddress) => {
  try {
    // Verify theatre case exists
    const existingTheatreCase = await theatreCaseRepository.findById(id);
    if (!existingTheatreCase) {
      throw new HttpError('errors.theatre_case.not_found', 404);
    }

    const updatedTheatreCase = await theatreCaseRepository.update(id, data);

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      resource: 'theatre_case',
      resource_id: id,
      user_id: userId,
      ip_address: ipAddress,
      details: {
        old: existingTheatreCase,
        new: updatedTheatreCase
      }
    });

    return updatedTheatreCase;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete theatre case (soft delete)
 *
 * @param {string} id - Theatre case ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteTheatreCase = async (id, userId, ipAddress) => {
  try {
    // Verify theatre case exists
    const existingTheatreCase = await theatreCaseRepository.findById(id);
    if (!existingTheatreCase) {
      throw new HttpError('errors.theatre_case.not_found', 404);
    }

    await theatreCaseRepository.softDelete(id);

    // Audit log
    await createAuditLog({
      action: 'DELETE',
      resource: 'theatre_case',
      resource_id: id,
      user_id: userId,
      ip_address: ipAddress,
      details: { theatre_case: existingTheatreCase }
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listTheatreCases,
  getTheatreCaseById,
  createTheatreCase,
  updateTheatreCase,
  deleteTheatreCase
};
