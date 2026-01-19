/**
 * User service
 *
 * @module modules/user/services
 * @description Business logic layer for user operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const userRepository = require('../repositories/user.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List users with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Users and pagination data
 */
const listUsers = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.facility_id) whereClause.facility_id = filters.facility_id;
    if (filters.status) whereClause.status = filters.status;
    if (filters.email) whereClause.email = { contains: filters.email };
    
    // Search filter (searches in email, phone)
    if (filters.search) {
      whereClause.OR = [
        { email: { contains: filters.search } },
        { phone: { contains: filters.search } }
      ];
    }

    const [users, total] = await Promise.all([
      userRepository.findMany(whereClause, skip, limit, orderBy),
      userRepository.count(whereClause)
    ]);

    return {
      users,
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
 * Get user by ID
 *
 * @param {string} id - User ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} User data
 */
const getUserById = async (id, userId, ipAddress) => {
  try {
    const user = await userRepository.findById(id);

    if (!user) {
      throw new HttpError('errors.user.not_found', 404);
    }

    return user;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new user
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - User data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created user
 */
const createUser = async (data, userId, ipAddress) => {
  try {
    const user = await userRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'user',
      entity_id: user.id,
      diff: { after: user },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return user;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update user
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - User ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated user
 */
const updateUser = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await userRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.user.not_found', 404);
    }

    const user = await userRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'user',
      entity_id: user.id,
      diff: { before, after: user },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return user;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete user (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - User ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteUser = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await userRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.user.not_found', 404);
    }

    await userRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'user',
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
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
