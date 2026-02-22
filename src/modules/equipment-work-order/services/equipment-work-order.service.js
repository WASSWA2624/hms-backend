const equipmentWorkOrderRepository = require('@repositories/equipment-work-order/equipment-work-order.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const listEquipmentWorkOrders = async (filters = {}, page = 1, limit = 20, sortBy = 'created_at', order = 'desc') => {
  const where = {};
  if (filters.tenant_id) where.tenant_id = filters.tenant_id;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: order };
  const [items, total] = await Promise.all([
    equipmentWorkOrderRepository.findMany(where, skip, limit, orderBy),
    equipmentWorkOrderRepository.count(where)
  ]);

  return {
    equipmentWorkOrders: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1
    }
  };
};

const getEquipmentWorkOrderById = async (id) => {
  const item = await equipmentWorkOrderRepository.findById(id);
  if (!item) throw new HttpError('errors.equipment_work_order.not_found', 404);
  return item;
};

const createEquipmentWorkOrder = async (data, context = {}) => {
  const item = await equipmentWorkOrderRepository.create(data);
  const tenantId = item.tenant_id || data.tenant_id || context.tenant_id;
  createAuditLog({
    tenant_id: tenantId,
    user_id: context.user_id || context.user?.id,
    action: 'CREATE',
    entity: 'equipment_work_order',
    entity_id: item.id,
    diff: { after: item },
    ip_address: context.ip_address || context.ip
  }).catch(() => {});
  return item;
};

const updateEquipmentWorkOrder = async (id, data, context = {}) => {
  const before = await equipmentWorkOrderRepository.findById(id);
  if (!before) throw new HttpError('errors.equipment_work_order.not_found', 404);
  const item = await equipmentWorkOrderRepository.update(id, data);
  createAuditLog({
    tenant_id: before.tenant_id || context.tenant_id,
    user_id: context.user_id || context.user?.id,
    action: 'UPDATE',
    entity: 'equipment_work_order',
    entity_id: item.id,
    diff: { before, after: item },
    ip_address: context.ip_address || context.ip
  }).catch(() => {});
  return item;
};

const deleteEquipmentWorkOrder = async (id, context = {}) => {
  const before = await equipmentWorkOrderRepository.findById(id);
  if (!before) throw new HttpError('errors.equipment_work_order.not_found', 404);
  await equipmentWorkOrderRepository.softDelete(id);
  createAuditLog({
    tenant_id: before.tenant_id || context.tenant_id,
    user_id: context.user_id || context.user?.id,
    action: 'DELETE',
    entity: 'equipment_work_order',
    entity_id: id,
    diff: { before },
    ip_address: context.ip_address || context.ip
  }).catch(() => {});
};

const startEquipmentWorkOrder = async (id, data = {}, context = {}) => {
  const before = await equipmentWorkOrderRepository.findById(id);
  if (!before) throw new HttpError('errors.equipment_work_order.not_found', 404);

  const currentStatus = String(before.status || '').toUpperCase();
  if (['COMPLETED', 'CLOSED', 'CANCELLED', 'RETURNED_TO_SERVICE'].includes(currentStatus)) {
    throw new HttpError('errors.equipment_work_order.cannot_start_terminal_status', 400);
  }

  const item = await equipmentWorkOrderRepository.update(id, {
    status: 'IN_REPAIR',
    started_at: data.started_at ? new Date(data.started_at) : new Date()
  });

  createAuditLog({
    tenant_id: before.tenant_id || context.tenant_id,
    user_id: context.user_id || context.user?.id,
    action: 'START',
    entity: 'equipment_work_order',
    entity_id: item.id,
    diff: {
      before,
      after: item,
      metadata: {
        notes: data.notes || null
      }
    },
    ip_address: context.ip_address || context.ip
  }).catch(() => {});

  return item;
};

const returnToServiceEquipmentWorkOrder = async (id, data = {}, context = {}) => {
  const before = await equipmentWorkOrderRepository.findById(id);
  if (!before) throw new HttpError('errors.equipment_work_order.not_found', 404);

  if (!before.started_at) {
    throw new HttpError('errors.equipment_work_order.cannot_return_before_start', 400);
  }

  const item = await equipmentWorkOrderRepository.update(id, {
    status: 'RETURNED_TO_SERVICE',
    completed_at: new Date(),
    closed_at: new Date(),
    resolution_notes: data.notes || before.resolution_notes
  });

  createAuditLog({
    tenant_id: before.tenant_id || context.tenant_id,
    user_id: context.user_id || context.user?.id,
    action: 'RETURN_TO_SERVICE',
    entity: 'equipment_work_order',
    entity_id: item.id,
    diff: {
      before,
      after: item,
      metadata: {
        verification_evidence: data.verification_evidence
      }
    },
    ip_address: context.ip_address || context.ip
  }).catch(() => {});

  return item;
};

module.exports = {
  listEquipmentWorkOrders,
  getEquipmentWorkOrderById,
  createEquipmentWorkOrder,
  updateEquipmentWorkOrder,
  deleteEquipmentWorkOrder,
  startEquipmentWorkOrder,
  returnToServiceEquipmentWorkOrder
};
