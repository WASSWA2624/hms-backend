/**
 * Patient service
 *
 * @module modules/patient/services
 * @description Business logic layer for patient operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const patientRepository = require('@repositories/patient/patient.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const ensurePatientExists = async (id) => {
  const patient = await patientRepository.findById(id);
  if (!patient) {
    throw new HttpError('errors.patient.not_found', 404);
  }
  return patient;
};

/**
 * List patients with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Patients and pagination data
 */
const listPatients = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.facility_id) whereClause.facility_id = filters.facility_id;
    if (filters.gender) whereClause.gender = filters.gender;
    if (filters.is_active !== undefined) whereClause.is_active = filters.is_active;
    if (filters.first_name) whereClause.first_name = { contains: filters.first_name };
    if (filters.last_name) whereClause.last_name = { contains: filters.last_name };
    
    // Search filter (searches in first_name, last_name)
    if (filters.search) {
      whereClause.OR = [
        { first_name: { contains: filters.search } },
        { last_name: { contains: filters.search } }
      ];
    }

    const [patients, total] = await Promise.all([
      patientRepository.findMany(whereClause, skip, limit, orderBy),
      patientRepository.count(whereClause)
    ]);

    return {
      patients,
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
 * Get patient by ID
 *
 * @param {string} id - Patient ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Patient data
 */
const getPatientById = async (id, userId, ipAddress) => {
  try {
    const patient = await patientRepository.findById(id);

    if (!patient) {
      throw new HttpError('errors.patient.not_found', 404);
    }

    return patient;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new patient
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Patient data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created patient
 */
const createPatient = async (data, userId, ipAddress) => {
  try {
    const patient = await patientRepository.create(data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'patient',
      entity_id: patient.id,
      diff: { after: patient },
      ip_address: ipAddress
    }).catch(() => {});

    return patient;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update patient
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Patient ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated patient
 */
const updatePatient = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await patientRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.patient.not_found', 404);
    }

    const patient = await patientRepository.update(id, data);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'patient',
      entity_id: patient.id,
      diff: { before, after: patient },
      ip_address: ipAddress
    }).catch(() => {});

    return patient;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete patient (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Patient ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deletePatient = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await patientRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.patient.not_found', 404);
    }

    await patientRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'patient',
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
 * Get patient identifiers (nested resource)
 *
 * @param {string} patientId - Patient ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Patient identifiers with pagination
 */
const getPatientIdentifiers = async (patientId, page = 1, limit = 20, sortBy = 'created_at', order = 'desc', userId, ipAddress) => {
  try {
    await ensurePatientExists(patientId);
    const patientIdentifierService = require('@services/patient-identifier/patient-identifier.service');
    const result = await patientIdentifierService.listPatientIdentifiers(
      { patient_id: patientId },
      page,
      limit,
      sortBy,
      order,
      userId,
      ipAddress
    );

    return {
      patientIdentifiers: result.patientIdentifiers || [],
      pagination: result.pagination
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Get patient contacts (nested resource)
 */
const getPatientContacts = async (patientId, page = 1, limit = 20, sortBy = 'created_at', order = 'desc', userId, ipAddress) => {
  try {
    await ensurePatientExists(patientId);
    const patientContactService = require('@services/patient-contact/patient-contact.service');
    const result = await patientContactService.listPatientContacts(
      { patient_id: patientId },
      page,
      limit,
      sortBy,
      order,
      userId,
      ipAddress
    );

    return {
      patientContacts: result.patientContacts || [],
      pagination: result.pagination
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Get patient guardians (nested resource)
 */
const getPatientGuardians = async (patientId, page = 1, limit = 20, sortBy = 'created_at', order = 'desc', userId, ipAddress) => {
  try {
    await ensurePatientExists(patientId);
    const patientGuardianService = require('@services/patient-guardian/patient-guardian.service');
    const result = await patientGuardianService.listPatientGuardians(
      { patient_id: patientId },
      page,
      limit,
      sortBy,
      order,
      userId,
      ipAddress
    );

    return {
      patientGuardians: result.patientGuardians || [],
      pagination: result.pagination
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Get patient allergies (nested resource)
 */
const getPatientAllergies = async (patientId, page = 1, limit = 20, sortBy = 'created_at', order = 'desc') => {
  try {
    await ensurePatientExists(patientId);
    const patientAllergyService = require('@services/patient-allergy/patient-allergy.service');
    const result = await patientAllergyService.listPatientAllergies(
      { patient_id: patientId },
      page,
      limit,
      sortBy,
      order
    );

    return {
      patientAllergies: result.items || [],
      pagination: result.pagination
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Get patient medical histories (nested resource)
 */
const getPatientMedicalHistories = async (patientId, page = 1, limit = 20, sortBy = 'created_at', order = 'desc') => {
  try {
    await ensurePatientExists(patientId);
    const patientMedicalHistoryService = require('@services/patient-medical-history/patient-medical-history.service');
    const result = await patientMedicalHistoryService.listPatientMedicalHistories(
      { patient_id: patientId },
      page,
      limit,
      sortBy,
      order
    );

    return {
      patientMedicalHistories: result.items || [],
      pagination: result.pagination
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Get patient documents (nested resource)
 */
const getPatientDocuments = async (patientId, page = 1, limit = 20, sortBy = 'created_at', order = 'desc') => {
  try {
    await ensurePatientExists(patientId);
    const patientDocumentService = require('@services/patient-document/patient-document.service');
    const result = await patientDocumentService.listPatientDocuments(
      { patient_id: patientId },
      page,
      limit,
      sortBy,
      order
    );

    return {
      patientDocuments: result.items || [],
      pagination: result.pagination
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientIdentifiers,
  getPatientContacts,
  getPatientGuardians,
  getPatientAllergies,
  getPatientMedicalHistories,
  getPatientDocuments
};
