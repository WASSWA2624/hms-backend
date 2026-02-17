/**
 * Shift template service
 */
const shiftTemplateRepository = require('@repositories/shift-template/shift-template.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const listShiftTemplates = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };
    const whereClause = {};
    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.facility_id) whereClause.facility_id = filters.facility_id;
    if (filters.shift_type) whereClause.shift_type = filters.shift_type;
    if (filters.is_active !== undefined) whereClause.is_active = filters.is_active === 'true';

    const [items, total] = await Promise.all([
      shiftTemplateRepository.findMany(whereClause, skip, limit, orderBy),
      shiftTemplateRepository.count(whereClause)
    ]);
    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPreviousPage: page > 1 }
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const getById = async (id, userId, ipAddress) => {
  const item = await shiftTemplateRepository.findById(id);
  if (!item) throw new HttpError('errors.shift_template.not_found', 404);
  return item;
};

const create = async (data, userId, ipAddress) => {
  const item = await shiftTemplateRepository.create(data);
  createAuditLog({ user_id: userId, action: 'CREATE', entity: 'shift_template', entity_id: item.id, diff: { after: item }, ip_address: ipAddress }).catch(() => {});
  return item;
};

const update = async (id, data, userId, ipAddress) => {
  const before = await shiftTemplateRepository.findById(id);
  if (!before) throw new HttpError('errors.shift_template.not_found', 404);
  const item = await shiftTemplateRepository.update(id, data);
  createAuditLog({ user_id: userId, action: 'UPDATE', entity: 'shift_template', entity_id: id, diff: { before, after: item }, ip_address: ipAddress }).catch(() => {});
  return item;
};

const remove = async (id, userId, ipAddress) => {
  const before = await shiftTemplateRepository.findById(id);
  if (!before) throw new HttpError('errors.shift_template.not_found', 404);
  await shiftTemplateRepository.softDelete(id);
  createAuditLog({ user_id: userId, action: 'DELETE', entity: 'shift_template', entity_id: id, diff: { before }, ip_address: ipAddress }).catch(() => {});
};

module.exports = { listShiftTemplates, getById, create, update, remove };
