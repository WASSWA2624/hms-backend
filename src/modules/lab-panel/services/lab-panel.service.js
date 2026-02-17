/**
 * Lab panel service
 *
 * @module modules/lab-panel/services
 * @description Business logic layer for lab panel operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const labPanelRepository = require('@repositories/lab-panel/lab-panel.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List lab panels with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Lab panels and pagination data
 */
const listLabPanels = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
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

    const [labPanels, total] = await Promise.all([
      labPanelRepository.findMany(whereClause, skip, limit, orderBy),
      labPanelRepository.count(whereClause)
    ]);

    return {
      labPanels,
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
 * Get lab panel by ID
 *
 * @param {string} id - Lab panel ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Lab panel data
 */
const getLabPanelById = async (id, userId, ipAddress) => {
  try {
    const labPanel = await labPanelRepository.findById(id);

    if (!labPanel) {
      throw new HttpError('errors.lab_panel.not_found', 404);
    }

    return labPanel;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new lab panel
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Lab panel data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created lab panel
 */
const createLabPanel = async (data, userId, ipAddress) => {
  try {
    const labPanel = await labPanelRepository.create(data);

    // Create audit log (non-blocking)
    await createAuditLog({
      user_id: userId,
      action: 'create',
      entity: 'lab_panel',
      entity_id: labPanel.id,
      diff: { after: labPanel },
      ip: ipAddress
    });

    return labPanel;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update lab panel
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Lab panel ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated lab panel
 */
const updateLabPanel = async (id, data, userId, ipAddress) => {
  try {
    // Get current data for audit log
    const before = await labPanelRepository.findById(id);
    
    if (!before) {
      throw new HttpError('errors.lab_panel.not_found', 404);
    }

    const labPanel = await labPanelRepository.update(id, data);

    // Create audit log (non-blocking)
    await createAuditLog({
      user_id: userId,
      action: 'update',
      entity: 'lab_panel',
      entity_id: labPanel.id,
      diff: { before, after: labPanel },
      ip: ipAddress
    });

    return labPanel;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete lab panel (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Lab panel ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Deleted lab panel
 */
const deleteLabPanel = async (id, userId, ipAddress) => {
  try {
    // Get current data for audit log
    const before = await labPanelRepository.findById(id);
    
    if (!before) {
      throw new HttpError('errors.lab_panel.not_found', 404);
    }

    const labPanel = await labPanelRepository.softDelete(id);

    // Create audit log (non-blocking)
    await createAuditLog({
      user_id: userId,
      action: 'delete',
      entity: 'lab_panel',
      entity_id: labPanel.id,
      diff: { before },
      ip: ipAddress
    });

    return labPanel;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listLabPanels,
  getLabPanelById,
  createLabPanel,
  updateLabPanel,
  deleteLabPanel
};
