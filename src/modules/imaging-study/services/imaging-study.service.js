/**
 * Imaging study service
 *
 * @module modules/imaging-study/services
 * @description Business logic layer for imaging study operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const imagingStudyRepository = require('@repositories/imaging-study/imaging-study.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List imaging studies with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Imaging studies and pagination data
 */
const listImagingStudies = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.radiology_order_id) whereClause.radiology_order_id = filters.radiology_order_id;
    if (filters.modality) whereClause.modality = filters.modality;
    if (filters.performed_at) whereClause.performed_at = filters.performed_at;

    const [imagingStudies, total] = await Promise.all([
      imagingStudyRepository.findMany(whereClause, skip, limit, orderBy),
      imagingStudyRepository.count(whereClause)
    ]);

    return {
      imagingStudies,
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
 * Get imaging study by ID
 *
 * @param {string} id - Imaging study ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Imaging study data
 */
const getImagingStudyById = async (id, userId, ipAddress) => {
  try {
    const imagingStudy = await imagingStudyRepository.findById(id);

    if (!imagingStudy) {
      throw new HttpError('errors.imaging_study.not_found', 404);
    }

    return imagingStudy;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new imaging study
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Imaging study data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created imaging study
 */
const createImagingStudy = async (data, userId, ipAddress) => {
  try {
    const imagingStudy = await imagingStudyRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'imaging_study',
      entity_id: imagingStudy.id,
      diff: { after: imagingStudy },
      ip_address: ipAddress
    }).catch(() => {});

    return imagingStudy;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update imaging study
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Imaging study ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated imaging study
 */
const updateImagingStudy = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await imagingStudyRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.imaging_study.not_found', 404);
    }

    const imagingStudy = await imagingStudyRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'imaging_study',
      entity_id: imagingStudy.id,
      diff: { before, after: imagingStudy },
      ip_address: ipAddress
    }).catch(() => {});

    return imagingStudy;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete imaging study (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Imaging study ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteImagingStudy = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await imagingStudyRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.imaging_study.not_found', 404);
    }

    await imagingStudyRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'imaging_study',
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
  listImagingStudies,
  getImagingStudyById,
  createImagingStudy,
  updateImagingStudy,
  deleteImagingStudy
};
