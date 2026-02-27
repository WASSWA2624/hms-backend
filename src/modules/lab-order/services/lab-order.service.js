const labOrderRepository = require('@repositories/lab-order/lab-order.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const {
  LAB_ORDER_WITH_RELATIONS_INCLUDE,
  applyDateRangeFilter,
  buildPagination,
  normalizeSearchTerm,
  resolveModelIdOrThrow,
  resolveModelRecordOrThrow,
  toDateOrNull,
} = require('@services/lab-workspace/lab.shared');
const { mapLabOrderRecord } = require('@services/lab-workspace/lab.serializer');

const listLabOrders = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    const whereClause = {};

    if (filters.encounter_id) {
      whereClause.encounter_id = await resolveModelIdOrThrow({
        identifier: filters.encounter_id,
        model: 'encounter',
        where: { deleted_at: null },
        errorKey: 'errors.encounter.not_found',
      });
    }

    if (filters.patient_id) {
      whereClause.patient_id = await resolveModelIdOrThrow({
        identifier: filters.patient_id,
        model: 'patient',
        where: { deleted_at: null },
        errorKey: 'errors.patient.not_found',
      });
    }

    if (filters.status) whereClause.status = filters.status;
    applyDateRangeFilter(whereClause, 'ordered_at', filters.ordered_at_from, filters.ordered_at_to);

    const searchTerm = normalizeSearchTerm(filters.search);
    if (searchTerm) {
      whereClause.OR = [
        { human_friendly_id: { contains: searchTerm.upper } },
        { patient: { human_friendly_id: { contains: searchTerm.upper } } },
        { patient: { first_name: { contains: searchTerm.raw } } },
        { patient: { last_name: { contains: searchTerm.raw } } },
        { encounter: { human_friendly_id: { contains: searchTerm.upper } } },
        { items: { some: { human_friendly_id: { contains: searchTerm.upper } } } },
        { items: { some: { lab_test: { human_friendly_id: { contains: searchTerm.upper } } } } },
        { items: { some: { lab_test: { name: { contains: searchTerm.raw } } } } },
        { items: { some: { lab_test: { code: { contains: searchTerm.raw } } } } },
      ];
    }

    const [labOrders, total] = await Promise.all([
      labOrderRepository.findMany(
        whereClause,
        skip,
        limit,
        orderBy,
        LAB_ORDER_WITH_RELATIONS_INCLUDE
      ),
      labOrderRepository.count(whereClause),
    ]);

    return {
      labOrders: labOrders.map((record) => mapLabOrderRecord(record)).filter(Boolean),
      pagination: buildPagination(page, limit, total),
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const getLabOrderById = async (id, userId, ipAddress) => {
  try {
    const labOrder = await resolveModelRecordOrThrow({
      identifier: id,
      model: 'lab_order',
      where: { deleted_at: null },
      include: LAB_ORDER_WITH_RELATIONS_INCLUDE,
      errorKey: 'errors.lab_order.not_found',
    });

    return mapLabOrderRecord(labOrder);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const createLabOrder = async (data, userId, ipAddress) => {
  try {
    const payload = { ...data };
    payload.patient_id = await resolveModelIdOrThrow({
      identifier: payload.patient_id,
      model: 'patient',
      where: { deleted_at: null },
      errorKey: 'errors.patient.not_found',
    });

    if (payload.encounter_id) {
      payload.encounter_id = await resolveModelIdOrThrow({
        identifier: payload.encounter_id,
        model: 'encounter',
        where: { deleted_at: null },
        errorKey: 'errors.encounter.not_found',
      });
    } else {
      payload.encounter_id = null;
    }

    payload.ordered_at = toDateOrNull(payload.ordered_at, new Date());

    const labOrder = await labOrderRepository.create(payload);
    const createdOrder = await labOrderRepository.findById(
      labOrder.id,
      LAB_ORDER_WITH_RELATIONS_INCLUDE
    );

    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'lab_order',
      entity_id: labOrder.id,
      diff: { after: createdOrder || labOrder },
      ip_address: ipAddress,
    }).catch(() => {});

    return mapLabOrderRecord(createdOrder || labOrder);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const updateLabOrder = async (id, data, userId, ipAddress) => {
  try {
    const before = await resolveModelRecordOrThrow({
      identifier: id,
      model: 'lab_order',
      where: { deleted_at: null },
      include: LAB_ORDER_WITH_RELATIONS_INCLUDE,
      errorKey: 'errors.lab_order.not_found',
    });

    const payload = { ...data };
    if (Object.prototype.hasOwnProperty.call(payload, 'patient_id') && payload.patient_id) {
      payload.patient_id = await resolveModelIdOrThrow({
        identifier: payload.patient_id,
        model: 'patient',
        where: { deleted_at: null },
        errorKey: 'errors.patient.not_found',
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'encounter_id')) {
      payload.encounter_id = payload.encounter_id
        ? await resolveModelIdOrThrow({
            identifier: payload.encounter_id,
            model: 'encounter',
            where: { deleted_at: null },
            errorKey: 'errors.encounter.not_found',
          })
        : null;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'ordered_at')) {
      payload.ordered_at = toDateOrNull(payload.ordered_at, before.ordered_at);
    }

    const updated = await labOrderRepository.update(before.id, payload);
    const labOrder = await labOrderRepository.findById(updated.id, LAB_ORDER_WITH_RELATIONS_INCLUDE);

    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'lab_order',
      entity_id: updated.id,
      diff: { before, after: labOrder },
      ip_address: ipAddress,
    }).catch(() => {});

    return mapLabOrderRecord(labOrder || updated);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const deleteLabOrder = async (id, userId, ipAddress) => {
  try {
    const before = await resolveModelRecordOrThrow({
      identifier: id,
      model: 'lab_order',
      where: { deleted_at: null },
      include: LAB_ORDER_WITH_RELATIONS_INCLUDE,
      errorKey: 'errors.lab_order.not_found',
    });

    const labOrder = await labOrderRepository.softDelete(before.id);

    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'lab_order',
      entity_id: labOrder.id,
      diff: { before, after: labOrder },
      ip_address: ipAddress,
    }).catch(() => {});

    return mapLabOrderRecord(before);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listLabOrders,
  getLabOrderById,
  createLabOrder,
  updateLabOrder,
  deleteLabOrder
};
