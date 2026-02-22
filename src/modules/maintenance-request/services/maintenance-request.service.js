/**
 * Maintenance request service
 *
 * @module modules/maintenance-request/services
 * @description Business logic layer for maintenance request operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const maintenanceRequestRepository = require('@repositories/maintenance-request/maintenance-request.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List maintenance requests with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Maintenance requests and pagination data
 */
const listMaintenanceRequests = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.facility_id) whereClause.facility_id = filters.facility_id;
    if (filters.asset_id) whereClause.asset_id = filters.asset_id;
    if (filters.status) whereClause.status = filters.status;
    
    // Search filter (searches in description)
    if (filters.search) {
      whereClause.OR = [
        { description: { contains: filters.search } }
      ];
    }

    const [maintenanceRequests, total] = await Promise.all([
      maintenanceRequestRepository.findMany(whereClause, skip, limit, orderBy),
      maintenanceRequestRepository.count(whereClause)
    ]);

    return {
      maintenanceRequests,
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
 * Get maintenance request by ID
 *
 * @param {string} id - Maintenance request ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Maintenance request data
 */
const getMaintenanceRequestById = async (id, userId, ipAddress) => {
  try {
    const maintenanceRequest = await maintenanceRequestRepository.findById(id);

    if (!maintenanceRequest) {
      throw new HttpError('errors.maintenance_request.not_found', 404);
    }

    return maintenanceRequest;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new maintenance request
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Maintenance request data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created maintenance request
 */
const createMaintenanceRequest = async (data, userId, ipAddress) => {
  try {
    // Convert datetime strings to Date objects
    const processedData = { ...data };
    if (processedData.reported_at) {
      processedData.reported_at = new Date(processedData.reported_at);
    }
    if (processedData.resolved_at) {
      processedData.resolved_at = new Date(processedData.resolved_at);
    }

    const maintenanceRequest = await maintenanceRequestRepository.create(processedData);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'maintenance_request',
      entity_id: maintenanceRequest.id,
      diff: { after: maintenanceRequest },
      ip_address: ipAddress
    }).catch(() => {});

    return maintenanceRequest;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update maintenance request
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Maintenance request ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated maintenance request
 */
const updateMaintenanceRequest = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await maintenanceRequestRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.maintenance_request.not_found', 404);
    }

    // Convert datetime strings to Date objects
    const processedData = { ...data };
    if (processedData.resolved_at) {
      processedData.resolved_at = new Date(processedData.resolved_at);
    }

    const maintenanceRequest = await maintenanceRequestRepository.update(id, processedData);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'maintenance_request',
      entity_id: maintenanceRequest.id,
      diff: { before, after: maintenanceRequest },
      ip_address: ipAddress
    }).catch(() => {});

    return maintenanceRequest;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete maintenance request (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Maintenance request ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteMaintenanceRequest = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await maintenanceRequestRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.maintenance_request.not_found', 404);
    }

    await maintenanceRequestRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'maintenance_request',
      entity_id: id,
      diff: { before },
      ip_address: ipAddress
    }).catch(() => {});
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Triage maintenance request
 *
 * @param {string} id - Maintenance request ID
 * @param {Object} data - Triage payload
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated maintenance request
 */
const triageMaintenanceRequest = async (id, data = {}, userId, ipAddress) => {
  try {
    const before = await maintenanceRequestRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.maintenance_request.not_found', 404);
    }

    if (before.status === 'COMPLETED' || before.status === 'CANCELLED') {
      throw new HttpError('errors.maintenance_request.cannot_triage_terminal_status', 400);
    }

    const updateData = {
      status: data.status || 'IN_PROGRESS'
    };

    const summaryParts = [];
    if (data.assigned_engineer) {
      summaryParts.push(`assigned_engineer=${data.assigned_engineer}`);
    }
    if (data.sla_hours) {
      summaryParts.push(`sla_hours=${data.sla_hours}`);
    }
    if (data.triage_summary) {
      summaryParts.push(`triage_summary=${data.triage_summary}`);
    }

    if (summaryParts.length > 0) {
      const existingDescription = before.description ? `${before.description}\n\n` : '';
      updateData.description = `${existingDescription}[TRIAGE] ${summaryParts.join('; ')}`.trim();
    }

    const maintenanceRequest = await maintenanceRequestRepository.update(id, updateData);

    createAuditLog({
      user_id: userId,
      action: 'TRIAGE',
      entity: 'maintenance_request',
      entity_id: maintenanceRequest.id,
      diff: {
        before,
        after: maintenanceRequest,
        metadata: {
          assigned_engineer: data.assigned_engineer || null,
          sla_hours: data.sla_hours || null,
          triage_summary: data.triage_summary || null
        }
      },
      ip_address: ipAddress
    }).catch(() => {});

    return maintenanceRequest;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listMaintenanceRequests,
  getMaintenanceRequestById,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
  triageMaintenanceRequest
};
