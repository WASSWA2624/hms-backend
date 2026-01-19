/**
 * Report definition repository tests
 *
 * @module tests/modules/report-definition/repositories
 * Per testing.mdc: Mock all Prisma operations
 */

const { HttpError } = require('@lib/errors');

// Mock Prisma instance before requiring the repository
jest.mock('@prisma/client', () => ({
  report_definition: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
}));

const {
  findById,
  findMany,
  count,
  create,
  update,
  softDelete
} = require('@repositories/report-definition/report-definition.repository');

const prisma = require('@prisma/client');

describe('Report Definition Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find report definition by ID', async () => {
      const mockReportDefinition = {
        id: 'report-123',
        tenant_id: 'tenant-123',
        facility_id: 'facility-123',
        name: 'Monthly Report',
        description: 'Monthly sales report',
        query_json: { query: 'SELECT * FROM sales' },
        parameters: { startDate: 'date', endDate: 'date' },
        created_by: 'user-123',
        created_at: new Date('2026-01-19'),
        updated_at: new Date('2026-01-19'),
        deleted_at: null,
        version: 1,
        tenant: { id: 'tenant-123', name: 'Test Tenant' },
        facility: { id: 'facility-123', name: 'Test Facility' },
        creator: { id: 'user-123', email: 'test@example.com' }
      };
      prisma.report_definition.findFirst.mockResolvedValue(mockReportDefinition);

      const result = await findById('report-123');

      expect(result).toEqual(mockReportDefinition);
      expect(prisma.report_definition.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'report-123',
          deleted_at: null
        },
        include: {
          tenant: { select: { id: true, name: true } },
          facility: { select: { id: true, name: true } },
          creator: { select: { id: true, email: true } }
        }
      });
    });

    it('should return null if report definition not found', async () => {
      prisma.report_definition.findFirst.mockResolvedValue(null);

      const result = await findById('report-123');

      expect(result).toBeNull();
    });

    it('should throw HttpError on database error', async () => {
      prisma.report_definition.findFirst.mockRejectedValue(new Error('DB error'));

      await expect(findById('report-123'))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('findMany', () => {
    it('should find many report definitions with default pagination', async () => {
      const mockReportDefinitions = [
        { id: 'report-1', name: 'Report 1', tenant_id: 'tenant-123' },
        { id: 'report-2', name: 'Report 2', tenant_id: 'tenant-123' }
      ];
      prisma.report_definition.findMany.mockResolvedValue(mockReportDefinitions);

      const result = await findMany({}, 0, 20);

      expect(result).toEqual(mockReportDefinitions);
      expect(prisma.report_definition.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null },
        skip: 0,
        take: 20,
        orderBy: { created_at: 'desc' },
        include: {
          tenant: { select: { id: true, name: true } },
          facility: { select: { id: true, name: true } },
          creator: { select: { id: true, email: true } }
        }
      });
    });

    it('should apply filters correctly', async () => {
      const mockReportDefinitions = [{ id: 'report-1', name: 'Report 1' }];
      prisma.report_definition.findMany.mockResolvedValue(mockReportDefinitions);

      await findMany({ tenant_id: 'tenant-123', facility_id: 'facility-123' }, 0, 20);

      expect(prisma.report_definition.findMany).toHaveBeenCalledWith({
        where: {
          deleted_at: null,
          tenant_id: 'tenant-123',
          facility_id: 'facility-123'
        },
        skip: 0,
        take: 20,
        orderBy: { created_at: 'desc' },
        include: {
          tenant: { select: { id: true, name: true } },
          facility: { select: { id: true, name: true } },
          creator: { select: { id: true, email: true } }
        }
      });
    });

    it('should throw HttpError on database error', async () => {
      prisma.report_definition.findMany.mockRejectedValue(new Error('DB error'));

      await expect(findMany({}, 0, 20))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('count', () => {
    it('should count report definitions', async () => {
      prisma.report_definition.count.mockResolvedValue(5);

      const result = await count({});

      expect(result).toBe(5);
      expect(prisma.report_definition.count).toHaveBeenCalledWith({
        where: { deleted_at: null }
      });
    });

    it('should count with filters', async () => {
      prisma.report_definition.count.mockResolvedValue(2);

      const result = await count({ tenant_id: 'tenant-123' });

      expect(result).toBe(2);
      expect(prisma.report_definition.count).toHaveBeenCalledWith({
        where: {
          deleted_at: null,
          tenant_id: 'tenant-123'
        }
      });
    });

    it('should throw HttpError on database error', async () => {
      prisma.report_definition.count.mockRejectedValue(new Error('DB error'));

      await expect(count({}))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('create', () => {
    it('should create report definition', async () => {
      const newData = {
        tenant_id: 'tenant-123',
        facility_id: 'facility-123',
        name: 'New Report',
        query_json: { query: 'SELECT * FROM sales' },
        created_by: 'user-123'
      };
      const mockCreated = { id: 'report-123', ...newData };
      prisma.report_definition.create.mockResolvedValue(mockCreated);

      const result = await create(newData);

      expect(result).toEqual(mockCreated);
      expect(prisma.report_definition.create).toHaveBeenCalledWith({
        data: newData,
        include: {
          tenant: { select: { id: true, name: true } },
          facility: { select: { id: true, name: true } },
          creator: { select: { id: true, email: true } }
        }
      });
    });

    it('should throw HttpError on unique constraint violation', async () => {
      const error = {
        code: 'P2002',
        meta: { target: ['name'] }
      };
      prisma.report_definition.create.mockRejectedValue(error);

      await expect(create({}))
        .rejects
        .toThrow(HttpError);
    });

    it('should throw HttpError on foreign key constraint violation', async () => {
      const error = {
        code: 'P2003',
        meta: { field_name: 'tenant_id' }
      };
      prisma.report_definition.create.mockRejectedValue(error);

      await expect(create({}))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('update', () => {
    it('should update report definition', async () => {
      const updateData = { name: 'Updated Report' };
      const mockUpdated = { id: 'report-123', name: 'Updated Report' };
      prisma.report_definition.update.mockResolvedValue(mockUpdated);

      const result = await update('report-123', updateData);

      expect(result).toEqual(mockUpdated);
      expect(prisma.report_definition.update).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: updateData,
        include: {
          tenant: { select: { id: true, name: true } },
          facility: { select: { id: true, name: true } },
          creator: { select: { id: true, email: true } }
        }
      });
    });

    it('should throw HttpError if report definition not found', async () => {
      const error = { code: 'P2025' };
      prisma.report_definition.update.mockRejectedValue(error);

      await expect(update('report-123', {}))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('softDelete', () => {
    it('should soft delete report definition', async () => {
      const mockDeleted = { id: 'report-123', deleted_at: new Date() };
      prisma.report_definition.update.mockResolvedValue(mockDeleted);

      const result = await softDelete('report-123');

      expect(result).toEqual(mockDeleted);
      expect(prisma.report_definition.update).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: { deleted_at: expect.any(Date) }
      });
    });

    it('should throw HttpError if report definition not found', async () => {
      const error = { code: 'P2025' };
      prisma.report_definition.update.mockRejectedValue(error);

      await expect(softDelete('report-123'))
        .rejects
        .toThrow(HttpError);
    });
  });
});
