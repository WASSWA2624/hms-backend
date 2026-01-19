/**
 * Report run controller tests
 *
 * @module tests/modules/report-run/controllers
 * Per testing.mdc: Mock all external dependencies
 */

// Mock dependencies before importing
jest.mock('@services/report-run/report-run.service');
jest.mock('@lib/response');

const reportRunService = require('@services/report-run/report-run.service');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');
const {
  listReportRuns,
  getReportRunById,
  createReportRun,
  updateReportRun,
  deleteReportRun
} = require('@controllers/report-run/report-run.controller');

describe('Report Run Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-123' },
      tenant: { id: 'tenant-123' },
      facility: { id: 'facility-123' },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Test Agent')
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('listReportRuns', () => {
    it('should list report runs with pagination', async () => {
      const mockResult = {
        reportRuns: [
          { id: 'run-1', status: 'COMPLETED' },
          { id: 'run-2', status: 'PENDING' }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };
      mockReq.query = { page: '1', limit: '20' };
      reportRunService.listReportRuns.mockResolvedValue(mockResult);

      await listReportRuns(mockReq, mockRes);

      expect(reportRunService.listReportRuns).toHaveBeenCalledWith(
        {},
        1,
        20,
        'created_at',
        'desc'
      );
      expect(sendPaginated).toHaveBeenCalledWith(
        mockRes,
        'messages.report_run.list_success',
        mockResult.reportRuns,
        mockResult.pagination
      );
    });

    it('should handle query filters', async () => {
      const mockResult = {
        reportRuns: [{ id: 'run-1', status: 'COMPLETED' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
      };
      mockReq.query = {
        page: '1',
        limit: '20',
        status: 'COMPLETED',
        format: 'PDF'
      };
      reportRunService.listReportRuns.mockResolvedValue(mockResult);

      await listReportRuns(mockReq, mockRes);

      expect(reportRunService.listReportRuns).toHaveBeenCalledWith(
        { status: 'COMPLETED', format: 'PDF' },
        1,
        20,
        'created_at',
        'desc'
      );
    });
  });

  describe('getReportRunById', () => {
    it('should return report run by ID', async () => {
      const mockReportRun = {
        id: 'run-123',
        status: 'COMPLETED'
      };
      mockReq.params.id = 'run-123';
      reportRunService.getReportRunById.mockResolvedValue(mockReportRun);

      await getReportRunById(mockReq, mockRes);

      expect(reportRunService.getReportRunById).toHaveBeenCalledWith('run-123');
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        'messages.report_run.get_success',
        mockReportRun
      );
    });
  });

  describe('createReportRun', () => {
    it('should create report run', async () => {
      const newData = {
        tenant_id: 'tenant-123',
        report_definition_id: 'report-def-123',
        format: 'PDF'
      };
      const mockCreated = { id: 'run-123', ...newData };
      mockReq.body = newData;
      reportRunService.createReportRun.mockResolvedValue(mockCreated);

      await createReportRun(mockReq, mockRes);

      expect(reportRunService.createReportRun).toHaveBeenCalledWith(
        newData,
        {
          user_id: 'user-123',
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          ip_address: '127.0.0.1',
          user_agent: 'Test Agent'
        }
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        201,
        'messages.report_run.create_success',
        mockCreated
      );
    });

    it('should handle missing context gracefully', async () => {
      const newData = {
        tenant_id: 'tenant-123',
        report_definition_id: 'report-def-123',
        format: 'CSV'
      };
      const mockCreated = { id: 'run-123', ...newData };
      mockReq = {
        body: newData,
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Test Agent')
      };
      reportRunService.createReportRun.mockResolvedValue(mockCreated);

      await createReportRun(mockReq, mockRes);

      expect(reportRunService.createReportRun).toHaveBeenCalledWith(
        newData,
        expect.objectContaining({
          user_id: undefined,
          ip_address: '127.0.0.1',
          user_agent: 'Test Agent'
        })
      );
    });
  });

  describe('updateReportRun', () => {
    it('should update report run', async () => {
      const updateData = { status: 'COMPLETED' };
      const mockUpdated = {
        id: 'run-123',
        status: 'COMPLETED'
      };
      mockReq.params.id = 'run-123';
      mockReq.body = updateData;
      reportRunService.updateReportRun.mockResolvedValue(mockUpdated);

      await updateReportRun(mockReq, mockRes);

      expect(reportRunService.updateReportRun).toHaveBeenCalledWith(
        'run-123',
        updateData,
        {
          user_id: 'user-123',
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          ip_address: '127.0.0.1',
          user_agent: 'Test Agent'
        }
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        'messages.report_run.update_success',
        mockUpdated
      );
    });
  });

  describe('deleteReportRun', () => {
    it('should delete report run', async () => {
      mockReq.params.id = 'run-123';
      reportRunService.deleteReportRun.mockResolvedValue();

      await deleteReportRun(mockReq, mockRes);

      expect(reportRunService.deleteReportRun).toHaveBeenCalledWith(
        'run-123',
        {
          user_id: 'user-123',
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          ip_address: '127.0.0.1',
          user_agent: 'Test Agent'
        }
      );
      expect(sendNoContent).toHaveBeenCalledWith(mockRes);
    });
  });
});
