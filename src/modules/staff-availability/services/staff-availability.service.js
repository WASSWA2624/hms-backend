/**
 * Staff availability service
 */
const staffAvailabilityRepository = require('@repositories/staff-availability/staff-availability.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const list = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  const skip = (page - 1) * limit;
  const orderBy = sortBy ? { [sortBy]: order } : { effective_from: 'desc' };
  const whereClause = {};
  if (filters.staff_profile_id) whereClause.staff_profile_id = filters.staff_profile_id;
  if (filters.day_of_week !== undefined) whereClause.day_of_week = parseInt(filters.day_of_week);
  if (filters.preference) whereClause.preference = filters.preference;

  const [items, total] = await Promise.all([
    staffAvailabilityRepository.findMany(whereClause, skip, limit, orderBy),
    staffAvailabilityRepository.count(whereClause)
  ]);
  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPreviousPage: page > 1 }
  };
};

const getById = async (id, userId, ipAddress) => {
  const item = await staffAvailabilityRepository.findById(id);
  if (!item) throw new HttpError('errors.staff_availability.not_found', 404);
  return item;
};

const create = async (data, userId, ipAddress) => {
  const item = await staffAvailabilityRepository.create(data);
  createAuditLog({ user_id: userId, action: 'CREATE', entity: 'staff_availability', entity_id: item.id, diff: { after: item }, ip_address: ipAddress }).catch(() => {});
  return item;
};

const update = async (id, data, userId, ipAddress) => {
  const before = await staffAvailabilityRepository.findById(id);
  if (!before) throw new HttpError('errors.staff_availability.not_found', 404);
  const item = await staffAvailabilityRepository.update(id, data);
  createAuditLog({ user_id: userId, action: 'UPDATE', entity: 'staff_availability', entity_id: id, diff: { before, after: item }, ip_address: ipAddress }).catch(() => {});
  return item;
};

const remove = async (id, userId, ipAddress) => {
  const before = await staffAvailabilityRepository.findById(id);
  if (!before) throw new HttpError('errors.staff_availability.not_found', 404);
  await staffAvailabilityRepository.softDelete(id);
  createAuditLog({ user_id: userId, action: 'DELETE', entity: 'staff_availability', entity_id: id, diff: { before }, ip_address: ipAddress }).catch(() => {});
};

module.exports = { list, getById, create, update, remove };
