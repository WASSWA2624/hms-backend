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

const MAX_SEARCH_TOKENS = 5;
const CONTACT_TYPE_VALUES = new Set([
  'PHONE',
  'EMAIL',
  'WHATSAPP',
  'TELEGRAM',
  'TIKTOK',
  'INSTAGRAM',
  'FACEBOOK',
  'LINKEDIN',
  'X',
  'YOUTUBE',
  'PINTEREST',
  'REDDIT',
  'DISCORD',
  'FAX',
  'OTHER'
]);
const CONSENT_TYPE_VALUES = new Set([
  'TREATMENT',
  'DATA_SHARING',
  'RESEARCH',
  'BILLING',
  'OTHER'
]);
const CONSENT_STATUS_VALUES = new Set([
  'GRANTED',
  'REVOKED',
  'PENDING'
]);

const PATIENT_RELATION_CONTEXT_INCLUDE = {
  tenant: {
    select: {
      human_friendly_id: true,
      name: true
    }
  },
  facility: {
    select: {
      human_friendly_id: true,
      name: true
    }
  }
};

const normalizeSearchTokens = (search) =>
  String(search || '')
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, MAX_SEARCH_TOKENS);

const resolveEnumSearchClauses = (token, allowedValues, fieldName) => {
  const enumToken = String(token || '').toUpperCase();
  if (!allowedValues.has(enumToken)) {
    return [];
  }
  return [{ [fieldName]: enumToken }];
};

const buildSearchTokenClause = (token) => {
  const contactTypeClauses = resolveEnumSearchClauses(token, CONTACT_TYPE_VALUES, 'contact_type');
  const consentTypeClauses = resolveEnumSearchClauses(token, CONSENT_TYPE_VALUES, 'consent_type');
  const consentStatusClauses = resolveEnumSearchClauses(token, CONSENT_STATUS_VALUES, 'status');

  return {
    OR: [
      { human_friendly_id: { contains: token } },
      { first_name: { contains: token } },
      { last_name: { contains: token } },
      {
        identifiers: {
          some: {
            deleted_at: null,
            OR: [
              { human_friendly_id: { contains: token } },
              { identifier_type: { contains: token } },
              { identifier_value: { contains: token } }
            ]
          }
        }
      },
      {
        contacts: {
          some: {
            deleted_at: null,
            OR: [
              { human_friendly_id: { contains: token } },
              { value: { contains: token } },
              ...contactTypeClauses
            ]
          }
        }
      },
      {
        guardians: {
          some: {
            deleted_at: null,
            OR: [
              { human_friendly_id: { contains: token } },
              { name: { contains: token } },
              { relationship: { contains: token } },
              { phone: { contains: token } },
              { email: { contains: token } }
            ]
          }
        }
      },
      {
        allergies: {
          some: {
            deleted_at: null,
            OR: [
              { human_friendly_id: { contains: token } },
              { allergen: { contains: token } },
              { reaction: { contains: token } },
              { notes: { contains: token } }
            ]
          }
        }
      },
      {
        medical_history: {
          some: {
            deleted_at: null,
            OR: [
              { human_friendly_id: { contains: token } },
              { condition: { contains: token } },
              { notes: { contains: token } }
            ]
          }
        }
      },
      {
        documents: {
          some: {
            deleted_at: null,
            OR: [
              { human_friendly_id: { contains: token } },
              { document_type: { contains: token } },
              { file_name: { contains: token } },
              { storage_key: { contains: token } },
              { content_type: { contains: token } }
            ]
          }
        }
      },
      {
        consents: {
          some: {
            deleted_at: null,
            OR: [
              { human_friendly_id: { contains: token } },
              ...consentTypeClauses,
              ...consentStatusClauses
            ]
          }
        }
      }
    ]
  };
};

const buildPatientWhereClause = (filters = {}) => {
  const whereClause = {};
  const searchTokens = normalizeSearchTokens(filters.search);

  if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
  if (filters.facility_id) whereClause.facility_id = filters.facility_id;
  if (filters.gender) whereClause.gender = filters.gender;
  if (filters.is_active !== undefined) whereClause.is_active = filters.is_active;
  if (filters.first_name) whereClause.first_name = { contains: filters.first_name };
  if (filters.last_name) whereClause.last_name = { contains: filters.last_name };

  if (searchTokens.length > 0) {
    whereClause.AND = searchTokens.map(buildSearchTokenClause);
  }

  return whereClause;
};

const decoratePatientContext = (patient) => {
  if (!patient || typeof patient !== 'object') return patient;

  const tenantContext = patient.tenant || null;
  const facilityContext = patient.facility || null;
  const {
    tenant,
    facility,
    ...rest
  } = patient;

  return {
    ...rest,
    tenant_context: tenantContext
      ? {
          id: tenantContext.human_friendly_id || null,
          label: tenantContext.name || null
        }
      : null,
    facility_context: facilityContext
      ? {
          id: facilityContext.human_friendly_id || null,
          label: facilityContext.name || null
        }
      : null,
    tenant_human_friendly_id: tenantContext?.human_friendly_id || null,
    tenant_label: tenantContext?.name || null,
    facility_human_friendly_id: facilityContext?.human_friendly_id || null,
    facility_label: facilityContext?.name || null
  };
};

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
    const whereClause = buildPatientWhereClause(filters);

    const [patients, total] = await Promise.all([
      patientRepository.findMany(
        whereClause,
        skip,
        limit,
        orderBy,
        PATIENT_RELATION_CONTEXT_INCLUDE
      ),
      patientRepository.count(whereClause)
    ]);
    const normalizedPatients = patients.map(decoratePatientContext);

    return {
      patients: normalizedPatients,
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
    const patient = await patientRepository.findById(id, PATIENT_RELATION_CONTEXT_INCLUDE);

    if (!patient) {
      throw new HttpError('errors.patient.not_found', 404);
    }

    return decoratePatientContext(patient);
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
