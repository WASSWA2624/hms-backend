/**
 * Anesthesia record service
 *
 * @module modules/anesthesia-record/services
 * @description Business logic layer for anesthesia record operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const anesthesiaRecordRepository = require('../repositories/anesthesia-record.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List anesthesia records with pagination and filtering
 *
 * @param {Object} filters - Query filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Anesthesia records and pagination data
 */
const listAnesthesiaRecords = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    // Build filter object
    const whereClause = {};
    
    if (filters.theatre_case_id) whereClause.theatre_case_id = filters.theatre_case_id;
    if (filters.anesthetist_user_id) whereClause.anesthetist_user_id = filters.anesthetist_user_id;

    const [anesthesiaRecords, total] = await Promise.all([
      anesthesiaRecordRepository.findMany(whereClause, skip, limit, orderBy),
      anesthesiaRecordRepository.count(whereClause)
    ]);

    return {
      anesthesia_records: anesthesiaRecords,
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
 * Get anesthesia record by ID
 *
 * @param {string} id - Anesthesia record ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Anesthesia record data
 */
const getAnesthesiaRecordById = async (id, userId, ipAddress) => {
  try {
    const anesthesiaRecord = await anesthesiaRecordRepository.findById(id);

    if (!anesthesiaRecord) {
      throw new HttpError('errors.anesthesia_record.not_found', 404);
    }

    return anesthesiaRecord;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Create new anesthesia record
 *
 * @param {Object} data - Anesthesia record data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Created anesthesia record
 */
const createAnesthesiaRecord = async (data, userId, ipAddress) => {
  try {
    const anesthesiaRecord = await anesthesiaRecordRepository.create(data);

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      resource: 'anesthesia_record',
      resource_id: anesthesiaRecord.id,
      user_id: userId,
      ip_address: ipAddress,
      details: { anesthesia_record: anesthesiaRecord }
    });

    return anesthesiaRecord;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Update anesthesia record
 *
 * @param {string} id - Anesthesia record ID
 * @param {Object} data - Update data
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<Object>} Updated anesthesia record
 */
const updateAnesthesiaRecord = async (id, data, userId, ipAddress) => {
  try {
    // Verify anesthesia record exists
    const existingAnesthesiaRecord = await anesthesiaRecordRepository.findById(id);
    if (!existingAnesthesiaRecord) {
      throw new HttpError('errors.anesthesia_record.not_found', 404);
    }

    const updatedAnesthesiaRecord = await anesthesiaRecordRepository.update(id, data);

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      resource: 'anesthesia_record',
      resource_id: id,
      user_id: userId,
      ip_address: ipAddress,
      details: {
        old: existingAnesthesiaRecord,
        new: updatedAnesthesiaRecord
      }
    });

    return updatedAnesthesiaRecord;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

/**
 * Delete anesthesia record (soft delete)
 *
 * @param {string} id - Anesthesia record ID
 * @param {string} userId - User ID for audit
 * @param {string} ipAddress - User IP for audit
 * @returns {Promise<void>}
 */
const deleteAnesthesiaRecord = async (id, userId, ipAddress) => {
  try {
    // Verify anesthesia record exists
    const existingAnesthesiaRecord = await anesthesiaRecordRepository.findById(id);
    if (!existingAnesthesiaRecord) {
      throw new HttpError('errors.anesthesia_record.not_found', 404);
    }

    await anesthesiaRecordRepository.softDelete(id);

    // Audit log
    await createAuditLog({
      action: 'DELETE',
      resource: 'anesthesia_record',
      resource_id: id,
      user_id: userId,
      ip_address: ipAddress,
      details: { anesthesia_record: existingAnesthesiaRecord }
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listAnesthesiaRecords,
  getAnesthesiaRecordById,
  createAnesthesiaRecord,
  updateAnesthesiaRecord,
  deleteAnesthesiaRecord
};
