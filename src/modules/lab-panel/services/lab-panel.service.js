const labPanelRepository = require('@repositories/lab-panel/lab-panel.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const {
  LAB_PANEL_WITH_RELATIONS_INCLUDE,
  buildPagination,
  normalizeSearchTerm,
  resolveModelIdOrThrow,
  resolveModelRecordOrThrow,
} = require('@services/lab-workspace/lab.shared');
const { mapLabPanelRecord } = require('@services/lab-workspace/lab.serializer');

const listLabPanels = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
  try {
    const skip = (page - 1) * limit;
    const orderBy = sortBy ? { [sortBy]: order } : { created_at: 'desc' };

    const whereClause = {};
    if (filters.tenant_id) {
      whereClause.tenant_id = await resolveModelIdOrThrow({
        identifier: filters.tenant_id,
        model: 'tenant',
        where: { deleted_at: null },
        errorKey: 'errors.tenant.not_found',
      });
    }

    if (filters.code) whereClause.code = { contains: filters.code };
    if (filters.name) whereClause.name = { contains: filters.name };

    const searchTerm = normalizeSearchTerm(filters.search);
    if (searchTerm) {
      whereClause.OR = [
        { human_friendly_id: { contains: searchTerm.upper } },
        { name: { contains: searchTerm.raw } },
        { code: { contains: searchTerm.raw } },
        { tenant: { human_friendly_id: { contains: searchTerm.upper } } },
      ];
    }

    const [labPanels, total] = await Promise.all([
      labPanelRepository.findMany(
        whereClause,
        skip,
        limit,
        orderBy,
        LAB_PANEL_WITH_RELATIONS_INCLUDE
      ),
      labPanelRepository.count(whereClause),
    ]);

    return {
      labPanels: labPanels.map((record) => mapLabPanelRecord(record)).filter(Boolean),
      pagination: buildPagination(page, limit, total),
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const getLabPanelById = async (id, userId, ipAddress) => {
  try {
    const labPanel = await resolveModelRecordOrThrow({
      identifier: id,
      model: 'lab_panel',
      where: { deleted_at: null },
      include: LAB_PANEL_WITH_RELATIONS_INCLUDE,
      errorKey: 'errors.lab_panel.not_found',
    });

    return mapLabPanelRecord(labPanel);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const createLabPanel = async (data, userId, ipAddress) => {
  try {
    const payload = { ...data };
    payload.tenant_id = await resolveModelIdOrThrow({
      identifier: payload.tenant_id,
      model: 'tenant',
      where: { deleted_at: null },
      errorKey: 'errors.tenant.not_found',
    });

    const labPanel = await labPanelRepository.create(payload);
    const created = await labPanelRepository.findById(labPanel.id, LAB_PANEL_WITH_RELATIONS_INCLUDE);

    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'lab_panel',
      entity_id: labPanel.id,
      diff: { after: created || labPanel },
      ip_address: ipAddress,
    }).catch(() => {});

    return mapLabPanelRecord(created || labPanel);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const updateLabPanel = async (id, data, userId, ipAddress) => {
  try {
    const before = await resolveModelRecordOrThrow({
      identifier: id,
      model: 'lab_panel',
      where: { deleted_at: null },
      include: LAB_PANEL_WITH_RELATIONS_INCLUDE,
      errorKey: 'errors.lab_panel.not_found',
    });

    const payload = { ...data };
    if (Object.prototype.hasOwnProperty.call(payload, 'tenant_id') && payload.tenant_id) {
      payload.tenant_id = await resolveModelIdOrThrow({
        identifier: payload.tenant_id,
        model: 'tenant',
        where: { deleted_at: null },
        errorKey: 'errors.tenant.not_found',
      });
    }

    const updated = await labPanelRepository.update(before.id, payload);
    const labPanel = await labPanelRepository.findById(updated.id, LAB_PANEL_WITH_RELATIONS_INCLUDE);

    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'lab_panel',
      entity_id: updated.id,
      diff: { before, after: labPanel },
      ip_address: ipAddress,
    }).catch(() => {});

    return mapLabPanelRecord(labPanel || updated);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const deleteLabPanel = async (id, userId, ipAddress) => {
  try {
    const before = await resolveModelRecordOrThrow({
      identifier: id,
      model: 'lab_panel',
      where: { deleted_at: null },
      include: LAB_PANEL_WITH_RELATIONS_INCLUDE,
      errorKey: 'errors.lab_panel.not_found',
    });

    const labPanel = await labPanelRepository.softDelete(before.id);

    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'lab_panel',
      entity_id: labPanel.id,
      diff: { before },
      ip_address: ipAddress,
    }).catch(() => {});

    return mapLabPanelRecord(before);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listLabPanels,
  getLabPanelById,
  createLabPanel,
  updateLabPanel,
  deleteLabPanel
};
