/**
 * Report run service tests
 *
 * @module tests/modules/report-run/services
 * Per testing.mdc: Mock all external dependencies
 */

const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/report-run/report-run.repository');
jest.mock('@lib/audit');

const reportRunRepository = require('@repositories/report-run/report-run.repository');
const { createAuditLog } = require('@lib/audit');
const {
  listReportRuns,
  getReportRunById,
  createReportRun,
  updateReportRun,
  deleteReportRun
} = require('@services/report-run/report-run.service');

describe('Report Run Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listReportRuns', () => {
    it('should list report runs with default pagination', async () => {
      const mockReportRuns = [
        { id: 'run-1', report_definition_id: 'report-1', status: 'COMPLETED' },
        { id: 'run-2', report_definition_id: 'report-2', status: 'PENDING' }
      ];
      reportRunRepository.findMany.mockResolvedValue(mockReportRuns);
      reportRunRepository.count.mockResolvedValue(10);

      const result = await listReportRuns({}, 1, 20);

      expect(result.reportRuns).toEqual(mockReportRuns);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
      expect(reportRunRepository.findMany).toHaveBeenCalledWith(
        {},
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should filter by tenant_id', async () => {
      const mockReportRuns = [{ id: 'run-1', status: 'COMPLETED' }];
      reportRunRepository.findMany.mockResolvedValue(mockReportRuns);
      reportRunRepository.count.mockResolvedValue(1);

      await listReportRuns({ tenant_id: 'tenant-123' }, 1, 20);

      expect(reportRunRepository.findMany).toHaveBeenCalledWith(
        { tenant_id: 'tenant-123' },
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should filter by report_definition_id', async () => {
      const mockReportRuns = [{ id: 'run-1', status: 'COMPLETED' }];
      reportRunRepository.findMany.mockResolvedValue(mockReportRuns);
      reportRunRepository.count.mockResolvedValue(1);

      await listReportRuns({ report_definition_id: 'report-def-123' }, 1, 20);

      expect(reportRunRepository.findMany).toHaveBeenCalledWith(
        { report_definition_id: 'report-def-123' },
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should filter by status and format', async () => {
      const mockReportRuns = [{ id: 'run-1', status: 'COMPLETED' }];
      reportRunRepository.findMany.mockResolvedValue(mockReportRuns);
      reportRunRepository.count.mockResolvedValue(1);

      await listReportRuns({ status: 'COMPLETED', format: 'PDF' }, 1, 20);

      expect(reportRunRepository.findMany).toHaveBeenCalledWith(
        { status: 'COMPLETED', format: 'PDF' },
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should handle pagination correctly', async () => {
      const mockReportRuns = [{ id: 'run-1', status: 'COMPLETED' }];
      reportRunRepository.findMany.mockResolvedValue(mockReportRuns);
      reportRunRepository.count.mockResolvedValue(50);

      const result = await listReportRuns({}, 2, 20);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 50,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true
      });
      expect(reportRunRepository.findMany).toHaveBeenCalledWith(
        {},
        20,
        20,
        { created_at: 'desc' }
      );
    });
  });

  describe('getReportRunById', () => {
    it('should return report run when found', async () => {
      const mockReportRun = {
        id: 'run-123',
        status: 'COMPLETED',
        tenant_id: 'tenant-123'
      };
      reportRunRepository.findById.mockResolvedValue(mockReportRun);

      const result = await getReportRunById('run-123');

      expect(result).toEqual(mockReportRun);
      expect(reportRunRepository.findById).toHaveBeenCalledWith('run-123');
    });

    it('should throw HttpError when report run not found', async () => {
      reportRunRepository.findById.mockResolvedValue(null);

      await expect(getReportRunById('run-123'))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('createReportRun', () => {
    it('should create report run with audit log', async () => {
      const newData = {
        tenant_id: 'tenant-123',
        report_definition_id: 'report-def-123',
        format: 'PDF',
        parameters: { startDate: '2026-01-01' }
      };
      const context = {
        user_id: 'user-123',
        tenant_id: 'tenant-123',
        ip_address: '127.0.0.1',
        user_agent: 'Test Agent'
      };
      const mockCreated = {
        id: 'run-123',
        ...newData,
        created_by: 'user-123'
      };
      reportRunRepository.create.mockResolvedValue(mockCreated);

      const result = await createReportRun(newData, context);

      expect(result).toEqual(mockCreated);
      expect(reportRunRepository.create).toHaveBeenCalledWith({
        ...newData,
        created_by: 'user-123'
      });
      expect(createAuditLog).toHaveBeenCalledWith({
        action: 'REPORT_RUN_CREATED',
        entity: 'report_run',
        entity_id: 'run-123',
        user_id: 'user-123',
        tenant_id: 'tenant-123',
        facility_id: undefined,
        ip_address: '127.0.0.1',
        user_agent: 'Test Agent',
        details: {
          tenant_id: 'tenant-123',
          report_definition_id: 'report-def-123',
          format: 'PDF',
          created_by: 'user-123'
        }
      });
    });

    it('should create report run without context', async () => {
      const newData = {
        tenant_id: 'tenant-123',
        report_definition_id: 'report-def-123',
        format: 'EXCEL'
      };
      const mockCreated = {
        id: 'run-123',
        ...newData,
        created_by: null
      };
      reportRunRepository.create.mockResolvedValue(mockCreated);

      const result = await createReportRun(newData);

      expect(result).toEqual(mockCreated);
      expect(reportRunRepository.create).toHaveBeenCalledWith({
        ...newData,
        created_by: null
      });
    });
  });

  describe('updateReportRun', () => {
    it('should update report run with audit log', async () => {
      const beforeData = {
        id: 'run-123',
        status: 'PENDING',
        file_path: null,
        error_message: null
      };
      const updateData = {
        status: 'COMPLETED',
        file_path: '/reports/report-123.pdf'
      };
      const afterData = {
        id: 'run-123',
        status: 'COMPLETED',
        file_path: '/reports/report-123.pdf',
        error_message: null
      };
      const context = {
        user_id: 'user-123',
        tenant_id: 'tenant-123'
      };
      reportRunRepository.findById.mockResolvedValue(beforeData);
      reportRunRepository.update.mockResolvedValue(afterData);

      const result = await updateReportRun('run-123', updateData, context);

      expect(result).toEqual(afterData);
      expect(reportRunRepository.update).toHaveBeenCalledWith('run-123', updateData);
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'REPORT_RUN_UPDATED',
        entity: 'report_run',
        entity_id: 'run-123',
        user_id: 'user-123'
      }));
    });

    it('should convert datetime strings to Date objects', async () => {
      const beforeData = { id: 'run-123', status: 'PENDING' };
      const updateData = {
        status: 'PROCESSING',
        started_at: '2026-01-19T10:00:00Z'
      };
      const afterData = { id: 'run-123', status: 'PROCESSING' };
      reportRunRepository.findById.mockResolvedValue(beforeData);
      reportRunRepository.update.mockResolvedValue(afterData);

      await updateReportRun('run-123', updateData, {});

      expect(reportRunRepository.update).toHaveBeenCalledWith('run-123', {
        status: 'PROCESSING',
        started_at: expect.any(Date)
      });
    });

    it('should throw HttpError when report run not found', async () => {
      reportRunRepository.findById.mockResolvedValue(null);

      await expect(updateReportRun('run-123', {}))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('deleteReportRun', () => {
    it('should soft delete report run with audit log', async () => {
      const mockReportRun = {
        id: 'run-123',
        tenant_id: 'tenant-123',
        report_definition_id: 'report-def-123',
        format: 'PDF',
        status: 'COMPLETED',
        created_by: 'user-123'
      };
      const context = {
        user_id: 'user-123',
        tenant_id: 'tenant-123'
      };
      reportRunRepository.findById.mockResolvedValue(mockReportRun);
      reportRunRepository.softDelete.mockResolvedValue(mockReportRun);

      await deleteReportRun('run-123', context);

      expect(reportRunRepository.softDelete).toHaveBeenCalledWith('run-123');
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'REPORT_RUN_DELETED',
        entity: 'report_run',
        entity_id: 'run-123',
        user_id: 'user-123'
      }));
    });

    it('should throw HttpError when report run not found', async () => {
      reportRunRepository.findById.mockResolvedValue(null);

      await expect(deleteReportRun('run-123'))
        .rejects
        .toThrow(HttpError);
    });
  });
});
