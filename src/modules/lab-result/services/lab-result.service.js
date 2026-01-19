/**
 * Lab result service
 */

const labResultRepository = require('../repositories/lab-result.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const listLabResults = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    const whereClause = {};
    if (filters.lab_order_item_id) whereClause.lab_order_item_id = filters.lab_order_item_id;
    if (filters.status) whereClause.status = filters.status;

    const [labResults, total] = await Promise.all([
      labResultRepository.findMany(whereClause, skip, limit, orderBy),
      labResultRepository.count(whereClause)
    ]);

    return {
      labResults,
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

const getLabResultById = async (id, userId, ipAddress) => {
  try {
    const labResult = await labResultRepository.findById(id);
    if (!labResult) {
      throw new HttpError('errors.lab_result.not_found', 404);
    }
    return labResult;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const createLabResult = async (data, userId, ipAddress) => {
  try {
    const labResult = await labResultRepository.create(data);

    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'lab_result',
      entity_id: labResult.id,
      diff: { after: labResult },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return labResult;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const updateLabResult = async (id, data, userId, ipAddress) => {
  try {
    const before = await labResultRepository.findById(id);
    if (!before) {
      throw new HttpError('errors.lab_result.not_found', 404);
    }

    const labResult = await labResultRepository.update(id, data);

    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'lab_result',
      entity_id: labResult.id,
      diff: { before, after: labResult },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return labResult;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const deleteLabResult = async (id, userId, ipAddress) => {
  try {
    const before = await labResultRepository.findById(id);
    if (!before) {
      throw new HttpError('errors.lab_result.not_found', 404);
    }

    await labResultRepository.softDelete(id);

    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'lab_result',
      entity_id: id,
      diff: { before },
      ip_address: ipAddress
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listLabResults,
  getLabResultById,
  createLabResult,
  updateLabResult,
  deleteLabResult
};
