/**
 * Report run repository tests
 *
 * @module tests/modules/report-run/repositories
 * Per testing.mdc: Mock all Prisma operations
 */

const { HttpError } = require('@lib/errors');

// Mock Prisma instance before requiring the repository
jest.mock('@prisma/client', () => ({
  report_run: {
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
} = require('@repositories/report-run/report-run.repository');

const prisma = require('@prisma/client');

describe('Report Run Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find report run by ID', async () => {
      const mockReportRun = {
        id: 'run-123',
        tenant_id: 'tenant-123',
        report_definition_id: 'report-def-123',
        format: 'PDF',
        status: 'COMPLETED',
        parameters: { startDate: '2026-01-01' },
        file_path: '/reports/report-123.pdf',
        created_by: 'user-123',
        created_at: new Date('2026-01-19'),
        updated_at: new Date('2026-01-19'),
        deleted_at: null,
        version: 1,
        tenant: { id: 'tenant-123', name: 'Test Tenant' },
        report_definition: { id: 'report-def-123', name: 'Monthly Report' },
        creator: { id: 'user-123', email: 'test@example.com' }
      };
      prisma.report_run.findFirst.mockResolvedValue(mockReportRun);

      const result = await findById('run-123');

      expect(result).toEqual(mockReportRun);
      expect(prisma.report_run.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'run-123',
          deleted_at: null
        },
        include: {
          tenant: { select: { id: true, name: true } },
          report_definition: { select: { id: true, name: true } },
          creator: { select: { id: true, email: true } }
        }
      });
    });

    it('should return null if report run not found', async () => {
      prisma.report_run.findFirst.mockResolvedValue(null);

      const result = await findById('run-123');

      expect(result).toBeNull();
    });

    it('should throw HttpError on database error', async () => {
      prisma.report_run.findFirst.mockRejectedValue(new Error('DB error'));

      await expect(findById('run-123'))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('findMany', () => {
    it('should find many report runs with default pagination', async () => {
      const mockReportRuns = [
        { id: 'run-1', report_definition_id: 'report-1', status: 'COMPLETED' },
        { id: 'run-2', report_definition_id: 'report-2', status: 'PENDING' }
      ];
      prisma.report_run.findMany.mockResolvedValue(mockReportRuns);

      const result = await findMany({}, 0, 20);

      expect(result).toEqual(mockReportRuns);
      expect(prisma.report_run.findMany).toHaveBeenCalledWith({
        where: { deleted_at: null },
        skip: 0,
        take: 20,
        orderBy: { created_at: 'desc' },
        include: {
          tenant: { select: { id: true, name: true } },
          report_definition: { select: { id: true, name: true } },
          creator: { select: { id: true, email: true } }
        }
      });
    });

    it('should apply filters correctly', async () => {
      const mockReportRuns = [{ id: 'run-1', status: 'COMPLETED' }];
      prisma.report_run.findMany.mockResolvedValue(mockReportRuns);

      await findMany({ tenant_id: 'tenant-123', status: 'COMPLETED' }, 0, 20);

      expect(prisma.report_run.findMany).toHaveBeenCalledWith({
        where: {
          deleted_at: null,
          tenant_id: 'tenant-123',
          status: 'COMPLETED'
        },
        skip: 0,
        take: 20,
        orderBy: { created_at: 'desc' },
        include: {
          tenant: { select: { id: true, name: true } },
          report_definition: { select: { id: true, name: true } },
          creator: { select: { id: true, email: true } }
        }
      });
    });

    it('should throw HttpError on database error', async () => {
      prisma.report_run.findMany.mockRejectedValue(new Error('DB error'));

      await expect(findMany({}, 0, 20))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('count', () => {
    it('should count report runs', async () => {
      prisma.report_run.count.mockResolvedValue(5);

      const result = await count({});

      expect(result).toBe(5);
      expect(prisma.report_run.count).toHaveBeenCalledWith({
        where: { deleted_at: null }
      });
    });

    it('should count with filters', async () => {
      prisma.report_run.count.mockResolvedValue(2);

      const result = await count({ status: 'COMPLETED' });

      expect(result).toBe(2);
      expect(prisma.report_run.count).toHaveBeenCalledWith({
        where: {
          deleted_at: null,
          status: 'COMPLETED'
        }
      });
    });

    it('should throw HttpError on database error', async () => {
      prisma.report_run.count.mockRejectedValue(new Error('DB error'));

      await expect(count({}))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('create', () => {
    it('should create report run', async () => {
      const newData = {
        tenant_id: 'tenant-123',
        report_definition_id: 'report-def-123',
        format: 'PDF',
        created_by: 'user-123'
      };
      const mockCreated = { id: 'run-123', ...newData };
      prisma.report_run.create.mockResolvedValue(mockCreated);

      const result = await create(newData);

      expect(result).toEqual(mockCreated);
      expect(prisma.report_run.create).toHaveBeenCalledWith({
        data: newData,
        include: {
          tenant: { select: { id: true, name: true } },
          report_definition: { select: { id: true, name: true } },
          creator: { select: { id: true, email: true } }
        }
      });
    });

    it('should throw HttpError on foreign key constraint violation', async () => {
      const error = {
        code: 'P2003',
        meta: { field_name: 'report_definition_id' }
      };
      prisma.report_run.create.mockRejectedValue(error);

      await expect(create({}))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('update', () => {
    it('should update report run', async () => {
      const updateData = { status: 'COMPLETED' };
      const mockUpdated = { id: 'run-123', status: 'COMPLETED' };
      prisma.report_run.update.mockResolvedValue(mockUpdated);

      const result = await update('run-123', updateData);

      expect(result).toEqual(mockUpdated);
      expect(prisma.report_run.update).toHaveBeenCalledWith({
        where: { id: 'run-123' },
        data: updateData,
        include: {
          tenant: { select: { id: true, name: true } },
          report_definition: { select: { id: true, name: true } },
          creator: { select: { id: true, email: true } }
        }
      });
    });

    it('should throw HttpError if report run not found', async () => {
      const error = { code: 'P2025' };
      prisma.report_run.update.mockRejectedValue(error);

      await expect(update('run-123', {}))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('softDelete', () => {
    it('should soft delete report run', async () => {
      const mockDeleted = { id: 'run-123', deleted_at: new Date() };
      prisma.report_run.update.mockResolvedValue(mockDeleted);

      const result = await softDelete('run-123');

      expect(result).toEqual(mockDeleted);
      expect(prisma.report_run.update).toHaveBeenCalledWith({
        where: { id: 'run-123' },
        data: { deleted_at: expect.any(Date) }
      });
    });

    it('should throw HttpError if report run not found', async () => {
      const error = { code: 'P2025' };
      prisma.report_run.update.mockRejectedValue(error);

      await expect(softDelete('run-123'))
        .rejects
        .toThrow(HttpError);
    });
  });
});
