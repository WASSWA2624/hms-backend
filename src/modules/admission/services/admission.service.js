/**
 * Admission service
 *
 * @module modules/admission/services
 * @description Business logic layer for admission operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const admissionRepository = require('@repositories/admission/admission.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List admissions with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Admissions and pagination data
 */
const listAdmissions = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.facility_id) whereClause.facility_id = filters.facility_id;
    if (filters.patient_id) whereClause.patient_id = filters.patient_id;
    if (filters.encounter_id) whereClause.encounter_id = filters.encounter_id;
    if (filters.status) whereClause.status = filters.status;

    const [admissions, total] = await Promise.all([
      admissionRepository.findMany(whereClause, skip, limit, orderBy),
      admissionRepository.count(whereClause)
    ]);

    return {
      admissions,
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
 * Get admission by ID
 *
 * @param {string} id - Admission ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Admission data
 */
const getAdmissionById = async (id, userId, ipAddress) => {
  try {
    const admission = await admissionRepository.findById(id);

    if (!admission) {
      throw new HttpError('errors.admission.not_found', 404);
    }

    return admission;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new admission
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Admission data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created admission
 */
const createAdmission = async (data, userId, ipAddress) => {
  try {
    const admission = await admissionRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'admission',
      entity_id: admission.id,
      diff: { after: admission },
      ip_address: ipAddress
    }).catch(() => {});

    return admission;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update admission
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Admission ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated admission
 */
const updateAdmission = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await admissionRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.admission.not_found', 404);
    }

    const admission = await admissionRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'admission',
      entity_id: admission.id,
      diff: { before, after: admission },
      ip_address: ipAddress
    }).catch(() => {});

    return admission;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete admission (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Admission ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteAdmission = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await admissionRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.admission.not_found', 404);
    }

    await admissionRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'admission',
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
 * Discharge patient from admission
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Admission ID
 * @param {Object} data - Discharge data (optional discharged_at)
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated admission
 */
const dischargeAdmission = async (id, data, userId, ipAddress) => {
  try {
    // Get current admission
    const before = await admissionRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.admission.not_found', 404);
    }

    // Check if already discharged
    if (before.status === 'DISCHARGED') {
      throw new HttpError('errors.admission.already_discharged', 400);
    }

    // Update admission with discharge info
    const updateData = {
      status: 'DISCHARGED',
      discharged_at: data.discharged_at || new Date().toISOString()
    };

    const admission = await admissionRepository.update(id, updateData);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DISCHARGE',
      entity: 'admission',
      entity_id: admission.id,
      diff: { before, after: admission },
      ip_address: ipAddress
    }).catch(() => {});

    return admission;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Transfer admission (workflow action)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Admission ID
 * @param {Object} data - Transfer data
 * @param {string} [data.facility_id] - Destination facility ID
 * @param {string} [data.notes] - Transfer notes
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated admission
 */
const transferAdmission = async (id, data, userId, ipAddress) => {
  try {
    const before = await admissionRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.admission.not_found', 404);
    }

    if (before.status === 'DISCHARGED' || before.status === 'CANCELLED') {
      throw new HttpError('errors.admission.cannot_transfer_terminal_status', 400);
    }

    const updateData = {
      status: 'TRANSFERRED'
    };

    if (Object.prototype.hasOwnProperty.call(data, 'facility_id')) {
      updateData.facility_id = data.facility_id;
    }

    const admission = await admissionRepository.update(id, updateData);

    createAuditLog({
      user_id: userId,
      action: 'TRANSFER',
      entity: 'admission',
      entity_id: admission.id,
      diff: {
        before,
        after: admission,
        metadata: {
          notes: data.notes || null
        }
      },
      ip_address: ipAddress
    }).catch(() => {});

    return admission;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listAdmissions,
  getAdmissionById,
  createAdmission,
  updateAdmission,
  deleteAdmission,
  dischargeAdmission,
  transferAdmission
};
