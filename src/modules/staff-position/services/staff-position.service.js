/**
 * Staff position service
 *
 * @module modules/staff-position/services
 * @description Business logic layer for staff position operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const staffPositionRepository = require('@repositories/staff-position/staff-position.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List staff positions with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Staff positions and pagination data
 */
const listStaffPositions = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    const whereClause = {};

    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.facility_id) whereClause.facility_id = filters.facility_id;
    if (filters.department_id) whereClause.department_id = filters.department_id;
    if (filters.is_active !== undefined) whereClause.is_active = filters.is_active;
    if (filters.name) whereClause.name = { contains: filters.name };

    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } }
      ];
    }

    const [staffPositions, total] = await Promise.all([
      staffPositionRepository.findMany(whereClause, skip, limit, orderBy),
      staffPositionRepository.count(whereClause)
    ]);

    return {
      staffPositions,
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
 * Get staff position by ID
 *
 * @param {string} id - Staff position ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Staff position data
 */
const getStaffPositionById = async (id, userId, ipAddress) => {
  try {
    const staffPosition = await staffPositionRepository.findById(id);

    if (!staffPosition) {
      throw new HttpError('errors.staff_position.not_found', 404);
    }

    return staffPosition;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new staff position
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Staff position data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created staff position
 */
const createStaffPosition = async (data, userId, ipAddress) => {
  try {
    const staffPosition = await staffPositionRepository.create(data);

    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'staff_position',
      entity_id: staffPosition.id,
      diff: { after: staffPosition },
      ip_address: ipAddress
    }).catch(() => {});

    return staffPosition;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update staff position
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Staff position ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated staff position
 */
const updateStaffPosition = async (id, data, userId, ipAddress) => {
  try {
    const before = await staffPositionRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.staff_position.not_found', 404);
    }

    const staffPosition = await staffPositionRepository.update(id, data);

    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'staff_position',
      entity_id: staffPosition.id,
      diff: { before, after: staffPosition },
      ip_address: ipAddress
    }).catch(() => {});

    return staffPosition;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete staff position (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Staff position ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteStaffPosition = async (id, userId, ipAddress) => {
  try {
    const before = await staffPositionRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.staff_position.not_found', 404);
    }

    await staffPositionRepository.softDelete(id);

    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'staff_position',
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
  listStaffPositions,
  getStaffPositionById,
  createStaffPosition,
  updateStaffPosition,
  deleteStaffPosition
};
