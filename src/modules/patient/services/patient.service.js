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
const APPOINTMENT_STATUS_VALUES = new Set([
  'SCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW'
]);
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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
  },
  contacts: {
    where: {
      deleted_at: null
    },
    orderBy: [
      { is_primary: 'desc' },
      { updated_at: 'desc' }
    ],
    take: 3,
    select: {
      id: true,
      human_friendly_id: true,
      contact_type: true,
      value: true,
      is_primary: true,
      created_at: true,
      updated_at: true
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

const parseDateFilter = (value, endOfDay = false) => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;

  if (DATE_ONLY_REGEX.test(normalized)) {
    const date = new Date(
      `${normalized}${endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildTemporalFilter = ({ exactValue, fromValue, toValue }) => {
  if (exactValue) {
    const exactStart = parseDateFilter(exactValue, false);
    if (!exactStart) return null;
    if (DATE_ONLY_REGEX.test(String(exactValue).trim())) {
      const exactEnd = parseDateFilter(exactValue, true);
      if (!exactEnd) return null;
      return { gte: exactStart, lte: exactEnd };
    }
    return { equals: exactStart };
  }

  const fromDate = parseDateFilter(fromValue, false);
  const toDate = parseDateFilter(toValue, true);
  const rangeFilter = {};
  if (fromDate) rangeFilter.gte = fromDate;
  if (toDate) rangeFilter.lte = toDate;

  return Object.keys(rangeFilter).length > 0 ? rangeFilter : null;
};

const buildSearchTokenClause = (token) => {
  const contactTypeClauses = resolveEnumSearchClauses(token, CONTACT_TYPE_VALUES, 'contact_type');
  const consentTypeClauses = resolveEnumSearchClauses(token, CONSENT_TYPE_VALUES, 'consent_type');
  const consentStatusClauses = resolveEnumSearchClauses(token, CONSENT_STATUS_VALUES, 'status');
  const appointmentStatusClauses = resolveEnumSearchClauses(
    token,
    APPOINTMENT_STATUS_VALUES,
    'status'
  );

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
      },
      {
        appointments: {
          some: {
            deleted_at: null,
            OR: [
              { human_friendly_id: { contains: token } },
              { reason: { contains: token } },
              ...appointmentStatusClauses
            ]
          }
        }
      }
    ]
  };
};

const buildAppointmentFilter = (filters = {}) => {
  const filter = {
    deleted_at: null
  };
  let hasAppliedFilter = false;

  if (filters.appointment_status) {
    filter.status = filters.appointment_status;
    hasAppliedFilter = true;
  }

  const scheduledStartFilter = buildTemporalFilter({
    fromValue: filters.appointment_from,
    toValue: filters.appointment_to
  });
  if (scheduledStartFilter) {
    filter.scheduled_start = scheduledStartFilter;
    hasAppliedFilter = true;
  }

  return hasAppliedFilter ? filter : null;
};

const buildPatientWhereClause = (filters = {}) => {
  const whereClause = {};
  const searchTokens = normalizeSearchTokens(filters.search);

  if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
  if (filters.facility_id) whereClause.facility_id = filters.facility_id;
  if (filters.patient_id) whereClause.human_friendly_id = { contains: filters.patient_id };
  if (filters.gender) whereClause.gender = filters.gender;
  if (filters.is_active !== undefined) whereClause.is_active = filters.is_active;
  if (filters.first_name) whereClause.first_name = { contains: filters.first_name };
  if (filters.last_name) whereClause.last_name = { contains: filters.last_name };

  const dateOfBirthFilter = buildTemporalFilter({
    exactValue: filters.date_of_birth,
    fromValue: filters.date_of_birth_from,
    toValue: filters.date_of_birth_to
  });
  if (dateOfBirthFilter) whereClause.date_of_birth = dateOfBirthFilter;

  const createdAtFilter = buildTemporalFilter({
    exactValue: filters.created_at,
    fromValue: filters.created_from,
    toValue: filters.created_to
  });
  if (createdAtFilter) whereClause.created_at = createdAtFilter;

  if (filters.contact) {
    whereClause.contacts = {
      some: {
        deleted_at: null,
        OR: [
          { human_friendly_id: { contains: filters.contact } },
          { value: { contains: filters.contact } }
        ]
      }
    };
  }

  const appointmentFilter = buildAppointmentFilter(filters);
  if (appointmentFilter) {
    whereClause.appointments = { some: appointmentFilter };
  }

  if (searchTokens.length > 0) {
    whereClause.AND = searchTokens.map(buildSearchTokenClause);
  }

  return whereClause;
};

const decoratePatientContext = (patient) => {
  if (!patient || typeof patient !== 'object') return patient;

  const tenantContext = patient.tenant || null;
  const facilityContext = patient.facility || null;
  const contacts = Array.isArray(patient.contacts) ? patient.contacts : [];
  const primaryContact = contacts.find((entry) => entry?.is_primary) || contacts[0] || null;
  const {
    tenant,
    facility,
    ...rest
  } = patient;

  return {
    ...rest,
    contact: primaryContact?.value || null,
    contact_value: primaryContact?.value || null,
    contact_label: primaryContact?.value || null,
    primary_contact: primaryContact?.value || null,
    primary_contact_details: primaryContact || null,
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

const normalizeScopeValue = (value) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const buildPatientScope = (scope = {}) => {
  const tenantId = normalizeScopeValue(scope.tenant_id);
  const facilityId = normalizeScopeValue(scope.facility_id);

  return {
    ...(tenantId ? { tenant_id: tenantId } : {}),
    ...(facilityId ? { facility_id: facilityId } : {})
  };
};

const ensurePatientExists = async (id, scope = {}) => {
  const patient = await patientRepository.findById(id, {}, buildPatientScope(scope));
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
const getPatientById = async (id, userId, ipAddress, scope = {}) => {
  try {
    const patient = await patientRepository.findById(
      id,
      PATIENT_RELATION_CONTEXT_INCLUDE,
      buildPatientScope(scope)
    );

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
const updatePatient = async (id, data, userId, ipAddress, scope = {}) => {
  try {
    const patientScope = buildPatientScope(scope);

    // Get current state for audit
    const before = await patientRepository.findById(id, {}, patientScope);

    if (!before) {
      throw new HttpError('errors.patient.not_found', 404);
    }

    const patient = await patientRepository.update(before.id, data, patientScope);

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
const deletePatient = async (id, userId, ipAddress, scope = {}) => {
  try {
    const patientScope = buildPatientScope(scope);

    // Get current state for audit
    const before = await patientRepository.findById(id, {}, patientScope);

    if (!before) {
      throw new HttpError('errors.patient.not_found', 404);
    }

    await patientRepository.softDelete(before.id, patientScope);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'patient',
      entity_id: before.id,
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
const getPatientIdentifiers = async (
  patientId,
  page = 1,
  limit = 20,
  sortBy = 'created_at',
  order = 'desc',
  userId,
  ipAddress,
  scope = {}
) => {
  try {
    const patient = await ensurePatientExists(patientId, scope);
    const patientIdentifierService = require('@services/patient-identifier/patient-identifier.service');
    const result = await patientIdentifierService.listPatientIdentifiers(
      { patient_id: patient.id },
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
const getPatientContacts = async (
  patientId,
  page = 1,
  limit = 20,
  sortBy = 'created_at',
  order = 'desc',
  userId,
  ipAddress,
  scope = {}
) => {
  try {
    const patient = await ensurePatientExists(patientId, scope);
    const patientContactService = require('@services/patient-contact/patient-contact.service');
    const result = await patientContactService.listPatientContacts(
      { patient_id: patient.id },
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
const getPatientGuardians = async (
  patientId,
  page = 1,
  limit = 20,
  sortBy = 'created_at',
  order = 'desc',
  userId,
  ipAddress,
  scope = {}
) => {
  try {
    const patient = await ensurePatientExists(patientId, scope);
    const patientGuardianService = require('@services/patient-guardian/patient-guardian.service');
    const result = await patientGuardianService.listPatientGuardians(
      { patient_id: patient.id },
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
const getPatientAllergies = async (
  patientId,
  page = 1,
  limit = 20,
  sortBy = 'created_at',
  order = 'desc',
  scope = {}
) => {
  try {
    const patient = await ensurePatientExists(patientId, scope);
    const patientAllergyService = require('@services/patient-allergy/patient-allergy.service');
    const result = await patientAllergyService.listPatientAllergies(
      { patient_id: patient.id },
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
const getPatientMedicalHistories = async (
  patientId,
  page = 1,
  limit = 20,
  sortBy = 'created_at',
  order = 'desc',
  scope = {}
) => {
  try {
    const patient = await ensurePatientExists(patientId, scope);
    const patientMedicalHistoryService = require('@services/patient-medical-history/patient-medical-history.service');
    const result = await patientMedicalHistoryService.listPatientMedicalHistories(
      { patient_id: patient.id },
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
const getPatientDocuments = async (
  patientId,
  page = 1,
  limit = 20,
  sortBy = 'created_at',
  order = 'desc',
  scope = {}
) => {
  try {
    const patient = await ensurePatientExists(patientId, scope);
    const patientDocumentService = require('@services/patient-document/patient-document.service');
    const result = await patientDocumentService.listPatientDocuments(
      { patient_id: patient.id },
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
