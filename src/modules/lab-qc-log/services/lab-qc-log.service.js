/**
 * Lab QC log service
 */

const labQcLogRepository = require('../repositories/lab-qc-log.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const listLabQcLogs = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };
    const whereClause = {};
    if (filters.lab_test_id) whereClause.lab_test_id = filters.lab_test_id;

    const [labQcLogs, total] = await Promise.all([
      labQcLogRepository.findMany(whereClause, skip, limit, orderBy),
      labQcLogRepository.count(whereClause)
    ]);

    return {
      labQcLogs,
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

const getLabQcLogById = async (id, userId, ipAddress) => {
  try {
    const labQcLog = await labQcLogRepository.findById(id);
    if (!labQcLog) {
      throw new HttpError('errors.lab_qc_log.not_found', 404);
    }
    return labQcLog;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const createLabQcLog = async (data, userId, ipAddress) => {
  try {
    const labQcLog = await labQcLogRepository.create(data);

    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'lab_qc_log',
      entity_id: labQcLog.id,
      diff: { after: labQcLog },
      ip_address: ipAddress
    }).catch(() => {});

    return labQcLog;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const updateLabQcLog = async (id, data, userId, ipAddress) => {
  try {
    const before = await labQcLogRepository.findById(id);
    if (!before) {
      throw new HttpError('errors.lab_qc_log.not_found', 404);
    }

    const labQcLog = await labQcLogRepository.update(id, data);

    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'lab_qc_log',
      entity_id: labQcLog.id,
      diff: { before, after: labQcLog },
      ip_address: ipAddress
    }).catch(() => {});

    return labQcLog;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const deleteLabQcLog = async (id, userId, ipAddress) => {
  try {
    const before = await labQcLogRepository.findById(id);
    if (!before) {
      throw new HttpError('errors.lab_qc_log.not_found', 404);
    }

    await labQcLogRepository.softDelete(id);

    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'lab_qc_log',
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
  listLabQcLogs,
  getLabQcLogById,
  createLabQcLog,
  updateLabQcLog,
  deleteLabQcLog
};
