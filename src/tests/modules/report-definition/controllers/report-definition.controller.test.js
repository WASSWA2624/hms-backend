/**
 * Report definition controller tests
 *
 * @module tests/modules/report-definition/controllers
 * Per testing.mdc: Mock all external dependencies
 */

// Mock dependencies before importing
jest.mock('@services/report-definition/report-definition.service');
jest.mock('@lib/response');

const reportDefinitionService = require('@services/report-definition/report-definition.service');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');
const {
  listReportDefinitions,
  getReportDefinitionById,
  createReportDefinition,
  updateReportDefinition,
  deleteReportDefinition
} = require('@controllers/report-definition/report-definition.controller');

describe('Report Definition Controller', () => {
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

  describe('listReportDefinitions', () => {
    it('should list report definitions with pagination', async () => {
      const mockResult = {
        reportDefinitions: [
          { id: 'report-1', name: 'Report 1' },
          { id: 'report-2', name: 'Report 2' }
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
      reportDefinitionService.listReportDefinitions.mockResolvedValue(mockResult);

      await listReportDefinitions(mockReq, mockRes);

      expect(reportDefinitionService.listReportDefinitions).toHaveBeenCalledWith(
        {},
        1,
        20,
        'created_at',
        'desc'
      );
      expect(sendPaginated).toHaveBeenCalledWith(
        mockRes,
        'messages.report_definition.list_success',
        mockResult.reportDefinitions,
        mockResult.pagination
      );
    });

    it('should handle query filters', async () => {
      const mockResult = {
        reportDefinitions: [{ id: 'report-1', name: 'Report 1' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
      };
      mockReq.query = {
        page: '1',
        limit: '20',
        tenant_id: 'tenant-123',
        search: 'Monthly'
      };
      reportDefinitionService.listReportDefinitions.mockResolvedValue(mockResult);

      await listReportDefinitions(mockReq, mockRes);

      expect(reportDefinitionService.listReportDefinitions).toHaveBeenCalledWith(
        { tenant_id: 'tenant-123', search: 'Monthly' },
        1,
        20,
        'created_at',
        'desc'
      );
    });
  });

  describe('getReportDefinitionById', () => {
    it('should return report definition by ID', async () => {
      const mockReportDefinition = {
        id: 'report-123',
        name: 'Test Report'
      };
      mockReq.params.id = 'report-123';
      reportDefinitionService.getReportDefinitionById.mockResolvedValue(mockReportDefinition);

      await getReportDefinitionById(mockReq, mockRes);

      expect(reportDefinitionService.getReportDefinitionById).toHaveBeenCalledWith('report-123');
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        'messages.report_definition.get_success',
        mockReportDefinition
      );
    });
  });

  describe('createReportDefinition', () => {
    it('should create report definition', async () => {
      const newData = {
        tenant_id: 'tenant-123',
        name: 'New Report',
        query_json: { query: 'SELECT * FROM sales' }
      };
      const mockCreated = { id: 'report-123', ...newData };
      mockReq.body = newData;
      reportDefinitionService.createReportDefinition.mockResolvedValue(mockCreated);

      await createReportDefinition(mockReq, mockRes);

      expect(reportDefinitionService.createReportDefinition).toHaveBeenCalledWith(
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
        'messages.report_definition.create_success',
        mockCreated
      );
    });

    it('should handle missing context gracefully', async () => {
      const newData = {
        tenant_id: 'tenant-123',
        name: 'New Report',
        query_json: { query: 'SELECT * FROM sales' }
      };
      const mockCreated = { id: 'report-123', ...newData };
      mockReq = {
        body: newData,
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Test Agent')
      };
      reportDefinitionService.createReportDefinition.mockResolvedValue(mockCreated);

      await createReportDefinition(mockReq, mockRes);

      expect(reportDefinitionService.createReportDefinition).toHaveBeenCalledWith(
        newData,
        expect.objectContaining({
          user_id: undefined,
          ip_address: '127.0.0.1',
          user_agent: 'Test Agent'
        })
      );
    });
  });

  describe('updateReportDefinition', () => {
    it('should update report definition', async () => {
      const updateData = { name: 'Updated Report' };
      const mockUpdated = {
        id: 'report-123',
        name: 'Updated Report'
      };
      mockReq.params.id = 'report-123';
      mockReq.body = updateData;
      reportDefinitionService.updateReportDefinition.mockResolvedValue(mockUpdated);

      await updateReportDefinition(mockReq, mockRes);

      expect(reportDefinitionService.updateReportDefinition).toHaveBeenCalledWith(
        'report-123',
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
        'messages.report_definition.update_success',
        mockUpdated
      );
    });
  });

  describe('deleteReportDefinition', () => {
    it('should delete report definition', async () => {
      mockReq.params.id = 'report-123';
      reportDefinitionService.deleteReportDefinition.mockResolvedValue();

      await deleteReportDefinition(mockReq, mockRes);

      expect(reportDefinitionService.deleteReportDefinition).toHaveBeenCalledWith(
        'report-123',
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
