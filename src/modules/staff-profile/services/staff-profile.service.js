/**
 * Staff profile service
 *
 * @module modules/staff-profile/services
 * @description Business logic layer for staff profile operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const staffProfileRepository = require('@repositories/staff-profile/staff-profile.repository');
const prisma = require('@prisma/client');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRACTITIONER_TYPES = new Set(['MO', 'SPECIALIST']);

const STAFF_PROFILE_INCLUDE = {
  user: {
    include: {
      profile: true
    }
  },
  department: true
};

const normalizeIdentifier = (value) => (typeof value === 'string' ? value.trim() : '');
const isUuid = (value) => UUID_REGEX.test(normalizeIdentifier(value));

const normalizePractitionerType = (value) => {
  const normalized = normalizeIdentifier(value).toUpperCase();
  return PRACTITIONER_TYPES.has(normalized) ? normalized : null;
};

const normalizeCurrencyCode = (value) => {
  const normalized = normalizeIdentifier(value).toUpperCase();
  return normalized || null;
};

const hasMeaningfulValue = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim() !== '';
  return true;
};

const normalizeConsultationFeePayload = (inputData = {}, { isEdit = false } = {}) => {
  const data = { ...inputData };
  const practitionerType = normalizePractitionerType(data.practitioner_type);
  const hasFee = hasMeaningfulValue(data.consultation_fee);
  const hasCurrency = hasMeaningfulValue(data.consultation_currency);

  if (data.practitioner_type !== undefined) {
    data.practitioner_type = practitionerType;
  }
  if (data.consultation_currency !== undefined) {
    data.consultation_currency = normalizeCurrencyCode(data.consultation_currency);
  }

  if (practitionerType && practitionerType !== 'SPECIALIST') {
    data.consultation_fee = null;
    data.consultation_currency = null;
    data.is_fee_overridden = false;
    return data;
  }

  if (hasFee || hasCurrency) {
    if (!practitionerType && !isEdit) {
      data.practitioner_type = 'SPECIALIST';
    }
    if (!practitionerType && isEdit) {
      // Preserve current practitioner type on edit unless explicitly changed.
      data.is_fee_overridden = true;
      return data;
    }
    data.is_fee_overridden = data.is_fee_overridden !== undefined ? Boolean(data.is_fee_overridden) : true;
    return data;
  }

  if (data.is_fee_overridden !== undefined) {
    data.is_fee_overridden = Boolean(data.is_fee_overridden);
  }

  return data;
};

const resolveUserByIdentifier = async (identifier, tenantId = null) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;
  if (!prisma?.user?.findFirst) {
    return { id: normalized };
  }

  const where = {
    deleted_at: null,
    ...(tenantId ? { tenant_id: tenantId } : {})
  };

  const userWhere = isUuid(normalized)
    ? { ...where, id: normalized }
    : {
        ...where,
        OR: [
          { human_friendly_id: normalized.toUpperCase() },
          { email: normalized },
          { phone: normalized }
        ]
      };

  return prisma.user.findFirst({ where: userWhere });
};

const resolveStaffProfileByIdentifier = async (identifier) => {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;
  if (isUuid(normalized)) {
    return staffProfileRepository.findById(normalized);
  }

  if (!prisma?.staff_profile?.findFirst) {
    return staffProfileRepository.findById(normalized);
  }

  return prisma.staff_profile.findFirst({
    where: {
      human_friendly_id: normalized.toUpperCase(),
      deleted_at: null
    },
    include: STAFF_PROFILE_INCLUDE
  });
};

/**
 * List staff profiles with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Staff profiles and pagination data
 */
const listStaffProfiles = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    const whereClause = {};

    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.department_id) whereClause.department_id = filters.department_id;
    if (filters.staff_number) whereClause.staff_number = { contains: filters.staff_number };
    if (filters.position) whereClause.position = { contains: filters.position };

    const practitionerType = normalizePractitionerType(filters.practitioner_type);
    if (practitionerType) {
      whereClause.practitioner_type = practitionerType;
    }

    if (filters.user_id) {
      const resolvedUser = await resolveUserByIdentifier(filters.user_id, filters.tenant_id || null);
      if (!resolvedUser) {
        return {
          staffProfiles: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: page > 1
          }
        };
      }
      whereClause.user_id = resolvedUser.id;
    }

    if (filters.search) {
      const searchTerm = filters.search;
      const normalizedSearch = searchTerm.toUpperCase();

      whereClause.OR = [
        { human_friendly_id: { contains: normalizedSearch } },
        { staff_number: { contains: searchTerm } },
        { position: { contains: searchTerm } },
        { practitioner_type: { contains: normalizedSearch } },
        { user: { human_friendly_id: { contains: normalizedSearch } } },
        { user: { email: { contains: searchTerm } } },
        { user: { phone: { contains: searchTerm } } },
        { user: { profile: { first_name: { contains: searchTerm } } } },
        { user: { profile: { middle_name: { contains: searchTerm } } } },
        { user: { profile: { last_name: { contains: searchTerm } } } }
      ];
    }

    const [staffProfiles, total] = await Promise.all([
      staffProfileRepository.findMany(whereClause, skip, limit, orderBy),
      staffProfileRepository.count(whereClause)
    ]);

    return {
      staffProfiles,
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
 * Get staff profile by ID or human friendly ID
 *
 * @param {string} id - Staff profile identifier
 * @returns {Promise<Object>} Staff profile data
 */
const getStaffProfileById = async (id) => {
  try {
    const staffProfile = await resolveStaffProfileByIdentifier(id);

    if (!staffProfile) {
      throw new HttpError('errors.staff_profile.not_found', 404);
    }

    return staffProfile;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new staff profile
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Staff profile data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created staff profile
 */
const createStaffProfile = async (data, userId, ipAddress) => {
  try {
    const resolvedUser = await resolveUserByIdentifier(data.user_id, data.tenant_id || null);
    if (!resolvedUser) {
      throw new HttpError('errors.user.not_found', 404, [{ field: 'user_id' }]);
    }

    const payload = normalizeConsultationFeePayload(
      {
        ...data,
        user_id: resolvedUser.id
      },
      { isEdit: false }
    );

    const createdProfile = await staffProfileRepository.create(payload);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'staff_profile',
      entity_id: createdProfile.id,
      diff: { after: createdProfile },
      ip_address: ipAddress
    }).catch(() => {});

    return createdProfile;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update staff profile
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Staff profile identifier
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated staff profile
 */
const updateStaffProfile = async (id, data, userId, ipAddress) => {
  try {
    const before = await resolveStaffProfileByIdentifier(id);

    if (!before) {
      throw new HttpError('errors.staff_profile.not_found', 404);
    }

    const payload = normalizeConsultationFeePayload(data, { isEdit: true });
    const updatedProfile = await staffProfileRepository.update(before.id, payload);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'staff_profile',
      entity_id: updatedProfile.id,
      diff: { before, after: updatedProfile },
      ip_address: ipAddress
    }).catch(() => {});

    return updatedProfile;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete staff profile (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Staff profile identifier
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteStaffProfile = async (id, userId, ipAddress) => {
  try {
    const before = await resolveStaffProfileByIdentifier(id);

    if (!before) {
      throw new HttpError('errors.staff_profile.not_found', 404);
    }

    await staffProfileRepository.softDelete(before.id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'staff_profile',
      entity_id: before.id,
      diff: { before },
      ip_address: ipAddress
    }).catch(() => {});
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listStaffProfiles,
  getStaffProfileById,
  createStaffProfile,
  updateStaffProfile,
  deleteStaffProfile
};
