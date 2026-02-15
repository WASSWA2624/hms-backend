/**
 * Nurse roster service
 *
 * @module modules/nurse-roster/services
 * @description Business logic layer for nurse roster operations.
 * Per module-creation.mdc: Services only import/use their own repository.
 * Per prisma.mdc: All mutations call createAuditLog.
 */

const nurseRosterRepository = require('../repositories/nurse-roster.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

const listNurseRosters = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    const whereClause = {};

    if (filters.tenant_id) whereClause.tenant_id = filters.tenant_id;
    if (filters.facility_id) whereClause.facility_id = filters.facility_id;
    if (filters.department_id) whereClause.department_id = filters.department_id;
    if (filters.status) whereClause.status = filters.status;

    if (filters.period_start_from || filters.period_start_to) {
      whereClause.period_start = {};
      if (filters.period_start_from) whereClause.period_start.gte = new Date(filters.period_start_from);
      if (filters.period_start_to) whereClause.period_start.lte = new Date(filters.period_start_to);
    }

    const [rosters, total] = await Promise.all([
      nurseRosterRepository.findMany(whereClause, skip, limit, orderBy),
      nurseRosterRepository.count(whereClause)
    ]);

    return {
      rosters,
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

const getNurseRosterById = async (id, userId, ipAddress) => {
  try {
    const roster = await nurseRosterRepository.findById(id);

    if (!roster) {
      throw new HttpError('errors.nurse_roster.not_found', 404);
    }

    return roster;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const createNurseRoster = async (data, userId, ipAddress) => {
  try {
    const roster = await nurseRosterRepository.create(data);

    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'nurse_roster',
      entity_id: roster.id,
      tenant_id: roster.tenant_id,
      diff: { after: roster },
      ip_address: ipAddress
    }).catch(() => {});

    return roster;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const updateNurseRoster = async (id, data, userId, ipAddress) => {
  try {
    const before = await nurseRosterRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.nurse_roster.not_found', 404);
    }

    const roster = await nurseRosterRepository.update(id, data);

    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'nurse_roster',
      entity_id: roster.id,
      tenant_id: roster.tenant_id,
      diff: { before, after: roster },
      ip_address: ipAddress
    }).catch(() => {});

    return roster;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const deleteNurseRoster = async (id, userId, ipAddress) => {
  try {
    const before = await nurseRosterRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.nurse_roster.not_found', 404);
    }

    await nurseRosterRepository.softDelete(id);

    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'nurse_roster',
      entity_id: id,
      tenant_id: before.tenant_id,
      diff: { before },
      ip_address: ipAddress
    }).catch(() => {});
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const publishNurseRoster = async (id, notifyStaff, userId, ipAddress) => {
  try {
    const before = await nurseRosterRepository.findById(id);

    if (!before) {
      throw new HttpError('errors.nurse_roster.not_found', 404);
    }

    if (before.status === 'PUBLISHED') {
      throw new HttpError('errors.nurse_roster.already_published', 400);
    }

    const roster = await nurseRosterRepository.update(id, {
      status: 'PUBLISHED',
      published_at: new Date()
    });

    createAuditLog({
      user_id: userId,
      action: 'PUBLISH',
      entity: 'nurse_roster',
      entity_id: roster.id,
      tenant_id: roster.tenant_id,
      diff: { before, after: roster, metadata: { notifyStaff } },
      ip_address: ipAddress
    }).catch(() => {});

    return roster;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listNurseRosters,
  getNurseRosterById,
  createNurseRoster,
  updateNurseRoster,
  deleteNurseRoster,
  publishNurseRoster
};
