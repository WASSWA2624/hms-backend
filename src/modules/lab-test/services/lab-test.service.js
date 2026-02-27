const labTestRepository = require('@repositories/lab-test/lab-test.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const {
  LAB_TEST_WITH_RELATIONS_INCLUDE,
  buildPagination,
  normalizeSearchTerm,
  resolveModelIdOrThrow,
  resolveModelRecordOrThrow,
} = require('@services/lab-workspace/lab.shared');
const { mapLabTestRecord } = require('@services/lab-workspace/lab.serializer');

const listLabTests = async (filters, page, limit, sortBy, order, userId, ipAddress) => {
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

    const [labTests, total] = await Promise.all([
      labTestRepository.findMany(
        whereClause,
        skip,
        limit,
        orderBy,
        LAB_TEST_WITH_RELATIONS_INCLUDE
      ),
      labTestRepository.count(whereClause),
    ]);

    return {
      labTests: labTests.map((record) => mapLabTestRecord(record)).filter(Boolean),
      pagination: buildPagination(page, limit, total),
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const getLabTestById = async (id, userId, ipAddress) => {
  try {
    const labTest = await resolveModelRecordOrThrow({
      identifier: id,
      model: 'lab_test',
      where: { deleted_at: null },
      include: LAB_TEST_WITH_RELATIONS_INCLUDE,
      errorKey: 'errors.lab_test.not_found',
    });

    return mapLabTestRecord(labTest);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const createLabTest = async (data, userId, ipAddress) => {
  try {
    const payload = { ...data };
    payload.tenant_id = await resolveModelIdOrThrow({
      identifier: payload.tenant_id,
      model: 'tenant',
      where: { deleted_at: null },
      errorKey: 'errors.tenant.not_found',
    });

    const labTest = await labTestRepository.create(payload);
    const created = await labTestRepository.findById(labTest.id, LAB_TEST_WITH_RELATIONS_INCLUDE);

    createAuditLog({
      user_id: userId,
      action: 'CREATE',
      entity: 'lab_test',
      entity_id: labTest.id,
      diff: { after: created || labTest },
      ip_address: ipAddress,
    }).catch(() => {});

    return mapLabTestRecord(created || labTest);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const updateLabTest = async (id, data, userId, ipAddress) => {
  try {
    const before = await resolveModelRecordOrThrow({
      identifier: id,
      model: 'lab_test',
      where: { deleted_at: null },
      include: LAB_TEST_WITH_RELATIONS_INCLUDE,
      errorKey: 'errors.lab_test.not_found',
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

    const updated = await labTestRepository.update(before.id, payload);
    const labTest = await labTestRepository.findById(updated.id, LAB_TEST_WITH_RELATIONS_INCLUDE);

    createAuditLog({
      user_id: userId,
      action: 'UPDATE',
      entity: 'lab_test',
      entity_id: updated.id,
      diff: { before, after: labTest },
      ip_address: ipAddress,
    }).catch(() => {});

    return mapLabTestRecord(labTest || updated);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

const deleteLabTest = async (id, userId, ipAddress) => {
  try {
    const before = await resolveModelRecordOrThrow({
      identifier: id,
      model: 'lab_test',
      where: { deleted_at: null },
      include: LAB_TEST_WITH_RELATIONS_INCLUDE,
      errorKey: 'errors.lab_test.not_found',
    });

    const labTest = await labTestRepository.softDelete(before.id);

    createAuditLog({
      user_id: userId,
      action: 'DELETE',
      entity: 'lab_test',
      entity_id: labTest.id,
      diff: { before },
      ip_address: ipAddress,
    }).catch(() => {});

    return mapLabTestRecord(before);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError('errors.server.unexpected', 500, [{ originalError: error.message }]);
  }
};

module.exports = {
  listLabTests,
  getLabTestById,
  createLabTest,
  updateLabTest,
  deleteLabTest
};
