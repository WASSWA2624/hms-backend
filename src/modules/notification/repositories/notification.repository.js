/**
 * Notification repository
 *
 * @module modules/notification/repositories
 * @description Data access layer for notification operations.
 * Per module-creation.mdc: Only standard CRUD operations allowed in repositories.
 * Per prisma.mdc: All queries use soft delete filtering (deleted_at: null).
 */

const prisma = require('@prisma/client');
const { HttpError } = require('@lib/errors');

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeIdentifier = (value) => (typeof value === 'string' ? value.trim() : '');
const isUuid = (value) => UUID_REGEX.test(normalizeIdentifier(value));

/**
 * Find notification by ID
 *
 * @param {string} id - Notification ID
 * @param {Object} include - Relations to include
 * @returns {Promise<Object|null>} Notification object or null
 */
const findById = async (id, include = {}) => {
  try {
    return await prisma.notification.findFirst({
      where: {
        id,
        deleted_at: null
      },
      include
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Find notification by UUID or friendly identifier.
 *
 * @param {string} identifier - Notification identifier (UUID or human-friendly ID)
 * @param {Object} include - Relations to include
 * @returns {Promise<Object|null>} Notification object or null
 */
const findByIdentifier = async (identifier, include = {}) => {
  try {
    const normalized = normalizeIdentifier(identifier);
    if (!normalized) return null;

    if (isUuid(normalized)) {
      return findById(normalized, include);
    }

    return await prisma.notification.findFirst({
      where: {
        human_friendly_id: normalized.toUpperCase(),
        deleted_at: null,
      },
      include,
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Find tenant by UUID, friendly identifier, or slug.
 *
 * @param {string} identifier - Tenant identifier
 * @returns {Promise<Object|null>} Tenant or null
 */
const findTenantByIdentifier = async (identifier) => {
  try {
    const normalized = normalizeIdentifier(identifier);
    if (!normalized) return null;

    const where = isUuid(normalized)
      ? { id: normalized, deleted_at: null }
      : {
          deleted_at: null,
          OR: [
            { human_friendly_id: normalized.toUpperCase() },
            { slug: normalized.toLowerCase() },
          ],
        };

    return await prisma.tenant.findFirst({
      where,
      select: {
        id: true,
      },
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Find user by UUID or friendly identifier.
 *
 * @param {string} identifier - User identifier
 * @param {string|null} tenantId - Optional tenant scope
 * @returns {Promise<Object|null>} User or null
 */
const findUserByIdentifier = async (identifier, tenantId = null) => {
  try {
    const normalized = normalizeIdentifier(identifier);
    if (!normalized) return null;

    const baseWhere = {
      deleted_at: null,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    };

    const where = isUuid(normalized)
      ? { ...baseWhere, id: normalized }
      : {
          ...baseWhere,
          OR: [
            { human_friendly_id: normalized.toUpperCase() },
            { email: normalized.toLowerCase() },
            { phone: normalized },
          ],
        };

    return await prisma.user.findFirst({
      where,
      select: {
        id: true,
        tenant_id: true,
      },
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Find many notifications with pagination
 *
 * @param {Object} filters - Filter criteria
 * @param {number} skip - Number of records to skip
 * @param {number} take - Number of records to take
 * @param {Object} orderBy - Sort order
 * @param {Object} include - Relations to include
 * @returns {Promise<Array>} Array of notifications
 */
const findMany = async (filters = {}, skip = 0, take = 20, orderBy = { created_at: 'desc' }, include = {}) => {
  try {
    // Build where clause
    const where = {
      deleted_at: null,
      ...filters
    };

    return await prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy,
      include
    });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Count notifications with filters
 *
 * @param {Object} filters - Filter criteria
 * @returns {Promise<number>} Count of notifications
 */
const count = async (filters = {}) => {
  try {
    const where = {
      deleted_at: null,
      ...filters
    };

    return await prisma.notification.count({ where });
  } catch (error) {
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new notification
 *
 * @param {Object} data - Notification data
 * @returns {Promise<Object>} Created notification
 */
const create = async (data) => {
  try {
    return await prisma.notification.create({
      data
    });
  } catch (error) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      const target = error.meta?.target?.[0] || 'field';
      throw new HttpError('errors.database.unique_field', 409, [{ field: target }]);
    }
    if (error.code === 'P2003') {
      // Foreign key constraint violation
      const target = error.meta?.field_name || 'field';
      throw new HttpError('errors.database.foreign_key_field', 400, [{ field: target }]);
    }
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update notification
 *
 * @param {string} id - Notification ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated notification
 */
const update = async (id, data) => {
  try {
    return await prisma.notification.update({
      where: { id },
      data
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new HttpError('errors.notification.not_found', 404);
    }
    if (error.code === 'P2002') {
      // Unique constraint violation
      const target = error.meta?.target?.[0] || 'field';
      throw new HttpError('errors.database.unique_field', 409, [{ field: target }]);
    }
    if (error.code === 'P2003') {
      // Foreign key constraint violation
      const target = error.meta?.field_name || 'field';
      throw new HttpError('errors.database.foreign_key_field', 400, [{ field: target }]);
    }
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Soft delete notification
 * Per prisma.mdc: Only soft deletes allowed
 *
 * @param {string} id - Notification ID
 * @returns {Promise<Object>} Deleted notification
 */
const softDelete = async (id) => {
  try {
    return await prisma.notification.update({
      where: { id },
      data: {
        deleted_at: new Date()
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new HttpError('errors.notification.not_found', 404);
    }
    throw new HttpError('errors.database.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  findById,
  findByIdentifier,
  findTenantByIdentifier,
  findUserByIdentifier,
  findMany,
  count,
  create,
  update,
  softDelete
};
