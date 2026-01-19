/**
 * Report definition service tests
 *
 * @module tests/modules/report-definition/services
 * Per testing.mdc: Mock all external dependencies
 */

const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/report-definition/report-definition.repository');
jest.mock('@lib/audit');

const reportDefinitionRepository = require('@repositories/report-definition/report-definition.repository');
const { createAuditLog } = require('@lib/audit');
const {
  listReportDefinitions,
  getReportDefinitionById,
  createReportDefinition,
  updateReportDefinition,
  deleteReportDefinition
} = require('@services/report-definition/report-definition.service');

describe('Report Definition Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listReportDefinitions', () => {
    it('should list report definitions with default pagination', async () => {
      const mockReportDefinitions = [
        { id: 'report-1', name: 'Report 1', tenant_id: 'tenant-123' },
        { id: 'report-2', name: 'Report 2', tenant_id: 'tenant-123' }
      ];
      reportDefinitionRepository.findMany.mockResolvedValue(mockReportDefinitions);
      reportDefinitionRepository.count.mockResolvedValue(10);

      const result = await listReportDefinitions({}, 1, 20);

      expect(result.reportDefinitions).toEqual(mockReportDefinitions);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
      expect(reportDefinitionRepository.findMany).toHaveBeenCalledWith(
        {},
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should filter by tenant_id', async () => {
      const mockReportDefinitions = [{ id: 'report-1', name: 'Report 1' }];
      reportDefinitionRepository.findMany.mockResolvedValue(mockReportDefinitions);
      reportDefinitionRepository.count.mockResolvedValue(1);

      const result = await listReportDefinitions({ tenant_id: 'tenant-123' }, 1, 20);

      expect(result.reportDefinitions).toEqual(mockReportDefinitions);
      expect(reportDefinitionRepository.findMany).toHaveBeenCalledWith(
        { tenant_id: 'tenant-123' },
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should filter by facility_id', async () => {
      const mockReportDefinitions = [{ id: 'report-1', name: 'Report 1' }];
      reportDefinitionRepository.findMany.mockResolvedValue(mockReportDefinitions);
      reportDefinitionRepository.count.mockResolvedValue(1);

      const result = await listReportDefinitions({ facility_id: 'facility-123' }, 1, 20);

      expect(result.reportDefinitions).toEqual(mockReportDefinitions);
      expect(reportDefinitionRepository.findMany).toHaveBeenCalledWith(
        { facility_id: 'facility-123' },
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should filter by created_by', async () => {
      const mockReportDefinitions = [{ id: 'report-1', name: 'Report 1' }];
      reportDefinitionRepository.findMany.mockResolvedValue(mockReportDefinitions);
      reportDefinitionRepository.count.mockResolvedValue(1);

      const result = await listReportDefinitions({ created_by: 'user-123' }, 1, 20);

      expect(result.reportDefinitions).toEqual(mockReportDefinitions);
      expect(reportDefinitionRepository.findMany).toHaveBeenCalledWith(
        { created_by: 'user-123' },
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should handle search filter', async () => {
      const mockReportDefinitions = [{ id: 'report-1', name: 'Monthly Report' }];
      reportDefinitionRepository.findMany.mockResolvedValue(mockReportDefinitions);
      reportDefinitionRepository.count.mockResolvedValue(1);

      await listReportDefinitions({ search: 'Monthly' }, 1, 20);

      expect(reportDefinitionRepository.findMany).toHaveBeenCalledWith(
        {
          OR: [
            { name: { contains: 'Monthly', mode: 'insensitive' } },
            { description: { contains: 'Monthly', mode: 'insensitive' } }
          ]
        },
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should handle pagination correctly', async () => {
      const mockReportDefinitions = [{ id: 'report-1', name: 'Report 1' }];
      reportDefinitionRepository.findMany.mockResolvedValue(mockReportDefinitions);
      reportDefinitionRepository.count.mockResolvedValue(50);

      const result = await listReportDefinitions({}, 2, 20);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 50,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true
      });
      expect(reportDefinitionRepository.findMany).toHaveBeenCalledWith(
        {},
        20,
        20,
        { created_at: 'desc' }
      );
    });

    it('should handle custom sorting', async () => {
      const mockReportDefinitions = [{ id: 'report-1', name: 'Report 1' }];
      reportDefinitionRepository.findMany.mockResolvedValue(mockReportDefinitions);
      reportDefinitionRepository.count.mockResolvedValue(1);

      await listReportDefinitions({}, 1, 20, 'name', 'asc');

      expect(reportDefinitionRepository.findMany).toHaveBeenCalledWith(
        {},
        0,
        20,
        { name: 'asc' }
      );
    });
  });

  describe('getReportDefinitionById', () => {
    it('should return report definition when found', async () => {
      const mockReportDefinition = {
        id: 'report-123',
        name: 'Test Report',
        tenant_id: 'tenant-123'
      };
      reportDefinitionRepository.findById.mockResolvedValue(mockReportDefinition);

      const result = await getReportDefinitionById('report-123');

      expect(result).toEqual(mockReportDefinition);
      expect(reportDefinitionRepository.findById).toHaveBeenCalledWith('report-123');
    });

    it('should throw HttpError when report definition not found', async () => {
      reportDefinitionRepository.findById.mockResolvedValue(null);

      await expect(getReportDefinitionById('report-123'))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('createReportDefinition', () => {
    it('should create report definition with audit log', async () => {
      const newData = {
        tenant_id: 'tenant-123',
        facility_id: 'facility-123',
        name: 'New Report',
        query_json: { query: 'SELECT * FROM sales' }
      };
      const context = {
        user_id: 'user-123',
        tenant_id: 'tenant-123',
        facility_id: 'facility-123',
        ip_address: '127.0.0.1',
        user_agent: 'Test Agent'
      };
      const mockCreated = {
        id: 'report-123',
        ...newData,
        created_by: 'user-123'
      };
      reportDefinitionRepository.create.mockResolvedValue(mockCreated);

      const result = await createReportDefinition(newData, context);

      expect(result).toEqual(mockCreated);
      expect(reportDefinitionRepository.create).toHaveBeenCalledWith({
        ...newData,
        created_by: 'user-123'
      });
      expect(createAuditLog).toHaveBeenCalledWith({
        action: 'REPORT_DEFINITION_CREATED',
        entity: 'report_definition',
        entity_id: 'report-123',
        user_id: 'user-123',
        tenant_id: 'tenant-123',
        facility_id: 'facility-123',
        ip_address: '127.0.0.1',
        user_agent: 'Test Agent',
        details: {
          tenant_id: 'tenant-123',
          facility_id: 'facility-123',
          name: 'New Report',
          created_by: 'user-123'
        }
      });
    });

    it('should create report definition without context', async () => {
      const newData = {
        tenant_id: 'tenant-123',
        name: 'New Report',
        query_json: { query: 'SELECT * FROM sales' }
      };
      const mockCreated = {
        id: 'report-123',
        ...newData,
        created_by: null
      };
      reportDefinitionRepository.create.mockResolvedValue(mockCreated);

      const result = await createReportDefinition(newData);

      expect(result).toEqual(mockCreated);
      expect(reportDefinitionRepository.create).toHaveBeenCalledWith({
        ...newData,
        created_by: null
      });
    });
  });

  describe('updateReportDefinition', () => {
    it('should update report definition with audit log', async () => {
      const beforeData = {
        id: 'report-123',
        facility_id: 'facility-123',
        name: 'Old Name',
        description: 'Old description'
      };
      const updateData = {
        name: 'New Name',
        description: 'New description'
      };
      const afterData = {
        id: 'report-123',
        facility_id: 'facility-123',
        name: 'New Name',
        description: 'New description'
      };
      const context = {
        user_id: 'user-123',
        tenant_id: 'tenant-123',
        ip_address: '127.0.0.1'
      };
      reportDefinitionRepository.findById.mockResolvedValue(beforeData);
      reportDefinitionRepository.update.mockResolvedValue(afterData);

      const result = await updateReportDefinition('report-123', updateData, context);

      expect(result).toEqual(afterData);
      expect(reportDefinitionRepository.update).toHaveBeenCalledWith('report-123', updateData);
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'REPORT_DEFINITION_UPDATED',
        entity: 'report_definition',
        entity_id: 'report-123',
        user_id: 'user-123'
      }));
    });

    it('should throw HttpError when report definition not found', async () => {
      reportDefinitionRepository.findById.mockResolvedValue(null);

      await expect(updateReportDefinition('report-123', {}))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('deleteReportDefinition', () => {
    it('should soft delete report definition with audit log', async () => {
      const mockReportDefinition = {
        id: 'report-123',
        tenant_id: 'tenant-123',
        name: 'Test Report',
        created_by: 'user-123'
      };
      const context = {
        user_id: 'user-123',
        tenant_id: 'tenant-123',
        ip_address: '127.0.0.1'
      };
      reportDefinitionRepository.findById.mockResolvedValue(mockReportDefinition);
      reportDefinitionRepository.softDelete.mockResolvedValue(mockReportDefinition);

      await deleteReportDefinition('report-123', context);

      expect(reportDefinitionRepository.softDelete).toHaveBeenCalledWith('report-123');
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'REPORT_DEFINITION_DELETED',
        entity: 'report_definition',
        entity_id: 'report-123',
        user_id: 'user-123'
      }));
    });

    it('should throw HttpError when report definition not found', async () => {
      reportDefinitionRepository.findById.mockResolvedValue(null);

      await expect(deleteReportDefinition('report-123'))
        .rejects
        .toThrow(HttpError);
    });
  });
});
