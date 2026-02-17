/**
 * Roster day off service
 */
const rosterDayOffRepository = require('@repositories/roster-day-off/roster-day-off.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const list = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  const skip = (page - 1) * limit;
  const orderBy = sortBy ? { [sortBy]: order } : { off_date: 'asc' };
  const whereClause = {};
  if (filters.nurse_roster_id) whereClause.nurse_roster_id = filters.nurse_roster_id;
  if (filters.staff_profile_id) whereClause.staff_profile_id = filters.staff_profile_id;
  if (filters.off_date_from) whereClause.off_date_from = filters.off_date_from;
  if (filters.off_date_to) whereClause.off_date_to = filters.off_date_to;

  const [items, total] = await Promise.all([
    rosterDayOffRepository.findMany(whereClause, skip, limit, orderBy),
    rosterDayOffRepository.count(whereClause)
  ]);
  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPreviousPage: page > 1 }
  };
};

const getById = async (id, userId, ipAddress) => {
  const item = await rosterDayOffRepository.findById(id);
  if (!item) throw new HttpError('errors.roster_day_off.not_found', 404);
  return item;
};

const create = async (data, userId, ipAddress) => {
  const item = await rosterDayOffRepository.create(data);
  createAuditLog({ user_id: userId, action: 'CREATE', entity: 'roster_day_off', entity_id: item.id, diff: { after: item }, ip_address: ipAddress }).catch(() => {});
  return item;
};

const update = async (id, data, userId, ipAddress) => {
  const before = await rosterDayOffRepository.findById(id);
  if (!before) throw new HttpError('errors.roster_day_off.not_found', 404);
  const item = await rosterDayOffRepository.update(id, data);
  createAuditLog({ user_id: userId, action: 'UPDATE', entity: 'roster_day_off', entity_id: id, diff: { before, after: item }, ip_address: ipAddress }).catch(() => {});
  return item;
};

const remove = async (id, userId, ipAddress) => {
  const before = await rosterDayOffRepository.findById(id);
  if (!before) throw new HttpError('errors.roster_day_off.not_found', 404);
  await rosterDayOffRepository.softDelete(id);
  createAuditLog({ user_id: userId, action: 'DELETE', entity: 'roster_day_off', entity_id: id, diff: { before }, ip_address: ipAddress }).catch(() => {});
};

module.exports = { list, getById, create, update, remove };
