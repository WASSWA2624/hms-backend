/**
 * Shift swap request service
 *
 * @module modules/shift-swap-request/services
 * @description Business logic layer for shift swap request operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const shiftSwapRequestRepository = require('../repositories/shift-swap-request.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

/**
 * List shift swap requests with pagination and filtering
 */
const listShiftSwapRequests = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    const whereClause = {};
    if (filters.shift_id) whereClause.shift_id = filters.shift_id;
    if (filters.requester_staff_id) whereClause.requester_staff_id = filters.requester_staff_id;
    if (filters.target_staff_id) whereClause.target_staff_id = filters.target_staff_id;
    if (filters.status) whereClause.status = filters.status;

    const [shiftSwapRequests, total] = await Promise.all([
      shiftSwapRequestRepository.findMany(whereClause, skip, limit, orderBy),
      shiftSwapRequestRepository.count(whereClause)
    ]);

    return {
      shiftSwapRequests,
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

const getShiftSwapRequestById = async (id, userId, ipAddress) => {
  try {
    const shiftSwapRequest = await shiftSwapRequestRepository.findById(id);
    if (!shiftSwapRequest) {
      throw new HttpError('errors.shift_swap_request.not_found', 404);
    }
    return shiftSwapRequest;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const createShiftSwapRequest = async (data, userId, ipAddress) => {
  try {
    const shiftSwapRequest = await shiftSwapRequestRepository.create(data);
    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'shift_swap_request',
      entity_id: shiftSwapRequest.id,
      diff: { after: shiftSwapRequest },
      ip_address: ipAddress
    }).catch(() => {});
    return shiftSwapRequest;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const updateShiftSwapRequest = async (id, data, userId, ipAddress) => {
  try {
    const before = await shiftSwapRequestRepository.findById(id);
    if (!before) {
      throw new HttpError('errors.shift_swap_request.not_found', 404);
    }
    const shiftSwapRequest = await shiftSwapRequestRepository.update(id, data);
    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'shift_swap_request',
      entity_id: shiftSwapRequest.id,
      diff: { before, after: shiftSwapRequest },
      ip_address: ipAddress
    }).catch(() => {});
    return shiftSwapRequest;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const deleteShiftSwapRequest = async (id, userId, ipAddress) => {
  try {
    const before = await shiftSwapRequestRepository.findById(id);
    if (!before) {
      throw new HttpError('errors.shift_swap_request.not_found', 404);
    }
    await shiftSwapRequestRepository.softDelete(id);
    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'shift_swap_request',
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
  listShiftSwapRequests,
  getShiftSwapRequestById,
  createShiftSwapRequest,
  updateShiftSwapRequest,
  deleteShiftSwapRequest
};
