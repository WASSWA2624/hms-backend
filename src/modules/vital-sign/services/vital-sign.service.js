/**
 * Vital Sign service
 *
 * @module modules/vital-sign/services
 * @description Business logic layer for vital sign operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const vitalSignRepository = require('@repositories/vital-sign/vital-sign.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const BLOOD_PRESSURE_VALUE_REGEX = /^(\d{2,3}(?:\.\d{1,2})?)\s*\/\s*(\d{2,3}(?:\.\d{1,2})?)$/;

const toFiniteNumber = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value?.toNumber === 'function') {
    const parsed = value.toNumber();
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value?.toString === 'function') {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const roundToTwo = (value) => {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
};

const formatBpComponent = (value) => {
  const rounded = roundToTwo(value);
  if (!Number.isFinite(rounded)) return '';
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

const parseLegacyBpValue = (value) => {
  const match = String(value || '').trim().match(BLOOD_PRESSURE_VALUE_REGEX);
  if (!match) return null;

  const systolic = roundToTwo(toFiniteNumber(match[1]));
  const diastolic = roundToTwo(toFiniteNumber(match[2]));

  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) {
    return null;
  }

  return { systolic, diastolic };
};

const computeMap = (systolic, diastolic) => {
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null;
  return roundToTwo((systolic + 2 * diastolic) / 3);
};

const normalizeBloodPressurePayload = (input = {}) => {
  const parsedLegacy = parseLegacyBpValue(input.value);
  const systolic =
    roundToTwo(toFiniteNumber(input.systolic_value)) ?? parsedLegacy?.systolic ?? null;
  const diastolic =
    roundToTwo(toFiniteNumber(input.diastolic_value)) ?? parsedLegacy?.diastolic ?? null;

  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) {
    throw new HttpError('errors.validation.required', 400, [
      { field: 'systolic_value' },
      { field: 'diastolic_value' },
    ]);
  }

  const mapValue = roundToTwo(toFiniteNumber(input.map_value)) ?? computeMap(systolic, diastolic);
  return {
    value: `${formatBpComponent(systolic)}/${formatBpComponent(diastolic)}`,
    systolic_value: systolic,
    diastolic_value: diastolic,
    map_value: mapValue,
  };
};

const normalizeVitalSignPayload = (input = {}, existing = null) => {
  const source = { ...(existing || {}), ...(input || {}) };
  const vitalType = String(source.vital_type || '').trim().toUpperCase();
  const normalized = { ...input };

  if (vitalType === 'BLOOD_PRESSURE') {
    const normalizedBp = normalizeBloodPressurePayload(source);
    normalized.value = normalizedBp.value;
    normalized.systolic_value = normalizedBp.systolic_value;
    normalized.diastolic_value = normalizedBp.diastolic_value;
    normalized.map_value = normalizedBp.map_value;
    return normalized;
  }

  if (normalized.value !== undefined) {
    normalized.value = String(normalized.value || '').trim();
  }

  if (normalized.vital_type && String(normalized.vital_type).trim().toUpperCase() !== 'BLOOD_PRESSURE') {
    normalized.systolic_value = null;
    normalized.diastolic_value = null;
    normalized.map_value = null;
  }

  return normalized;
};

/**
 * List vital signs with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Vital signs and pagination data
 */
const listVitalSigns = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { recorded_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.encounter_id) whereClause.encounter_id = filters.encounter_id;
    if (filters.vital_type) whereClause.vital_type = filters.vital_type;

    const [vitalSigns, total] = await Promise.all([
      vitalSignRepository.findMany(whereClause, skip, limit, orderBy),
      vitalSignRepository.count(whereClause)
    ]);

    return {
      vitalSigns,
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
 * Get vital sign by ID
 *
 * @param {string} id - Vital sign ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Vital sign data
 */
const getVitalSignById = async (id, userId, ipAddress) => {
  try {
    const vitalSign = await vitalSignRepository.findById(id);

    if (!vitalSign) {
      throw new HttpError('errors.vital_sign.not_found', 404);
    }

    return vitalSign;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new vital sign
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {Object} data - Vital sign data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created vital sign
 */
const createVitalSign = async (data, userId, ipAddress) => {
  try {
    const vitalSign = await vitalSignRepository.create(normalizeVitalSignPayload(data));

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'vital_sign',
      entity_id: vitalSign.id,
      diff: { after: vitalSign },
      ip_address: ipAddress
    }).catch(() => {});

    return vitalSign;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update vital sign
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Vital sign ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated vital sign
 */
const updateVitalSign = async (id, data, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await vitalSignRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.vital_sign.not_found', 404);
    }

    const vitalSign = await vitalSignRepository.update(id, normalizeVitalSignPayload(data, before));

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'vital_sign',
      entity_id: vitalSign.id,
      diff: { before, after: vitalSign },
      ip_address: ipAddress
    }).catch(() => {});

    return vitalSign;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete vital sign (soft delete)
 * Per prisma.mdc: Mutations must create audit logs
 *
 * @param {string} id - Vital sign ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteVitalSign = async (id, userId, ipAddress) => {
  try {
    // Get current state for audit
    const before = await vitalSignRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.vital_sign.not_found', 404);
    }

    await vitalSignRepository.softDelete(id);

    // Create audit log (non-blocking)
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'vital_sign',
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
  listVitalSigns,
  getVitalSignById,
  createVitalSign,
  updateVitalSign,
  deleteVitalSign
};
