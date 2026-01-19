/**
 * Staff profile service
 *
 * @module modules/staff-profile/services
 * @description Business logic layer for staff profile operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const staffProfileRepository = require('../repositories/staff-profile.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List staff profiles with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Staff profiles and pagination data
 */
const listStaffProfiles = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.user_id) whereClause.user_id = filters.user_id;
    if (filters.department_id) whereClause.department_id = filters.department_id;
    if (filters.staff_number) whereClause.staff_number = { contains: filters.staff_number };
    if (filters.position) whereClause.position = { contains: filters.position };
    
    // Search filter (searches in staff_number, position)
    if (filters.search) {
      whereClause.OR = [
        { staff_number: { contains: filters.search } },
        { position: { contains: filters.search } }
      ];
    }

    const [staffProfiles, total] = await Promise.all([
      staffProfileRepository.findMany(whereClause, skip, limit, orderBy),
      staffProfileRepository.count(whereClause)
    ]);

    return {
      staffProfiles,
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
 * Get staff profile by ID
 *
 * @param {string} id - Staff profile ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Staff profile data
 */
const getStaffProfileById = async (id, userId, ipAddress) => {
  try {
    const staffProfile = await staffProfileRepository.findById(id);

    if (!staffProfile) {
      throw new HttpError('errors.staff_profile.not_found', 404);
    }

    return staffProfile;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new staff profile
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Staff profile data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created staff profile
 */
const createStaffProfile = async (data, userId, ipAddress) => {
  try {
    const staffProfile = await staffProfileRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'staff_profile',
      entity_id: staffProfile.id,
      diff: { after: staffProfile },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return staffProfile;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update staff profile
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Staff profile ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated staff profile
 */
const updateStaffProfile = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await staffProfileRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.staff_profile.not_found', 404);
    }

    const staffProfile = await staffProfileRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'staff_profile',
      entity_id: staffProfile.id,
      diff: { before, after: staffProfile },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return staffProfile;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete staff profile (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Staff profile ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteStaffProfile = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await staffProfileRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.staff_profile.not_found', 404);
    }

    await staffProfileRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'staff_profile',
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
  listStaffProfiles,
  getStaffProfileById,
  createStaffProfile,
  updateStaffProfile,
  deleteStaffProfile
};
