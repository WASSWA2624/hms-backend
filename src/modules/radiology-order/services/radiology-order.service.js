/**
 * Radiology Order service
 *
 * @module modules/radiology-order/services
 * @description Business logic layer for radiology order operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const radiologyOrderRepository = require('@repositories/radiology-order/radiology-order.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const { resolveModelIdByIdentifier } = require('@lib/identifiers/resolve-entity-id');

const resolveForeignId = async (model, identifier, allowNull = false) => {
  if (identifier == null || identifier === '') return allowNull ? null : identifier;
  const resolved = await resolveModelIdByIdentifier({
    model,
    identifier,
    where: { deleted_at: null },
  });
  if (!resolved) {
    throw new HttpError('errors.resource.not_found', 404);
  }
  return resolved;
};

/**
 * List radiology orders with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Radiology orders and pagination data
 */
const listRadiologyOrders = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.encounter_id) {
      whereClause.encounter_id = await resolveForeignId('encounter', filters.encounter_id, true);
    }
    if (filters.patient_id) {
      whereClause.patient_id = await resolveForeignId('patient', filters.patient_id);
    }
    if (filters.radiology_test_id) {
      whereClause.radiology_test_id = await resolveForeignId(
        'radiology_test',
        filters.radiology_test_id,
        true
      );
    }
    if (filters.status) whereClause.status = filters.status;

    const [radiologyOrders, total] = await Promise.all([
      radiologyOrderRepository.findMany(whereClause, skip, limit, orderBy),
      radiologyOrderRepository.count(whereClause)
    ]);

    return {
      radiology_orders: radiologyOrders,
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
 * Get radiology order by ID
 *
 * @param {string} id - Radiology Order ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Radiology order data
 */
const getRadiologyOrderById = async (id, userId, ipAddress) => {
  try {
    const radiologyOrder = await radiologyOrderRepository.findById(id);

    if (!radiologyOrder) {
      throw new HttpError('errors.radiology_order.not_found', 404);
    }

    return radiologyOrder;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new radiology order
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Radiology Order data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created radiology order
 */
const createRadiologyOrder = async (data, userId, ipAddress) => {
  try {
    const normalizedData = {
      ...data,
      encounter_id: data.encounter_id
        ? await resolveForeignId('encounter', data.encounter_id, true)
        : null,
      patient_id: await resolveForeignId('patient', data.patient_id),
      radiology_test_id: data.radiology_test_id
        ? await resolveForeignId('radiology_test', data.radiology_test_id, true)
        : null,
    };

    const radiologyOrder = await radiologyOrderRepository.create(normalizedData);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'radiology_order',
      entity_id: radiologyOrder.id,
      diff: { after: radiologyOrder },
      ip_address: ipAddress
    }).catch(() => {});

    return radiologyOrder;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update radiology order
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Radiology Order ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated radiology order
 */
const updateRadiologyOrder = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await radiologyOrderRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.radiology_order.not_found', 404);
    }

    const normalizedData = {
      ...data,
    };
    if (Object.prototype.hasOwnProperty.call(data, 'encounter_id')) {
      normalizedData.encounter_id = data.encounter_id
        ? await resolveForeignId('encounter', data.encounter_id, true)
        : null;
    }
    if (Object.prototype.hasOwnProperty.call(data, 'patient_id')) {
      normalizedData.patient_id = await resolveForeignId('patient', data.patient_id);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'radiology_test_id')) {
      normalizedData.radiology_test_id = data.radiology_test_id
        ? await resolveForeignId('radiology_test', data.radiology_test_id, true)
        : null;
    }

    const radiologyOrder = await radiologyOrderRepository.update(id, normalizedData);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'radiology_order',
      entity_id: radiologyOrder.id,
      diff: { before, after: radiologyOrder },
      ip_address: ipAddress
    }).catch(() => {});

    return radiologyOrder;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete radiology order (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Radiology Order ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteRadiologyOrder = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await radiologyOrderRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.radiology_order.not_found', 404);
    }

    await radiologyOrderRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'radiology_order',
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
  listRadiologyOrders,
  getRadiologyOrderById,
  createRadiologyOrder,
  updateRadiologyOrder,
  deleteRadiologyOrder
};
