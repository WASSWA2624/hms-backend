/**
 * KPI snapshot service
 *
 * @module modules/kpi-snapshot/services
 * @description Business logic layer for KPI snapshot operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const kpiSnapshotRepository = require('../repositories/kpi-snapshot.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List KPI snapshots with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} KPI snapshots and pagination data
 */
const listKpiSnapshots = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.name) whereClause.name = { contains: filters.name };
    
    // Date range filters
    if (filters.recorded_at_from || filters.recorded_at_to) {
      whereClause.recorded_at = {};
      if (filters.recorded_at_from) whereClause.recorded_at.gte = new Date(filters.recorded_at_from);
      if (filters.recorded_at_to) whereClause.recorded_at.lte = new Date(filters.recorded_at_to);
    }
    
    // Search filter (searches in name)
    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search } }
      ];
    }

    const [kpiSnapshots, total] = await Promise.all([
      kpiSnapshotRepository.findMany(whereClause, skip, limit, orderBy),
      kpiSnapshotRepository.count(whereClause)
    ]);

    return {
      kpiSnapshots,
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
 * Get KPI snapshot by ID
 *
 * @param {string} id - KPI snapshot ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} KPI snapshot data
 */
const getKpiSnapshotById = async (id, userId, ipAddress) => {
  try {
    const kpiSnapshot = await kpiSnapshotRepository.findById(id);

    if (!kpiSnapshot) {
      throw new HttpError('errors.kpi_snapshot.not_found', 404);
    }

    return kpiSnapshot;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new KPI snapshot
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - KPI snapshot data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created KPI snapshot
 */
const createKpiSnapshot = async (data, userId, ipAddress) => {
  try {
    const kpiSnapshot = await kpiSnapshotRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'kpi_snapshot',
      entity_id: kpiSnapshot.id,
      diff: { after: kpiSnapshot },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return kpiSnapshot;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update KPI snapshot
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - KPI snapshot ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated KPI snapshot
 */
const updateKpiSnapshot = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await kpiSnapshotRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.kpi_snapshot.not_found', 404);
    }

    const kpiSnapshot = await kpiSnapshotRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'kpi_snapshot',
      entity_id: kpiSnapshot.id,
      diff: { before, after: kpiSnapshot },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return kpiSnapshot;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete KPI snapshot (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - KPI snapshot ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteKpiSnapshot = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await kpiSnapshotRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.kpi_snapshot.not_found', 404);
    }

    await kpiSnapshotRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'kpi_snapshot',
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
  listKpiSnapshots,
  getKpiSnapshotById,
  createKpiSnapshot,
  updateKpiSnapshot,
  deleteKpiSnapshot
};
