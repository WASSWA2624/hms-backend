/**
 * Integration log service tests
 *
 * @module tests/modules/integration-log/services
 * @description Tests for integration log service functions
 */

const integrationLogService = require('@services/integration-log/integration-log.service');
const integrationLogRepository = require('@repositories/integration-log/integration-log.repository');
const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/integration-log/integration-log.repository');

describe('Integration Log Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getIntegrationLogById', () => {
    it('should return integration log when found', async () => {
      const mockIntegrationLog = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        integration_id: 'integration-123',
        status: 'ACTIVE',
        message: 'Test log'
      };

      integrationLogRepository.findById.mockResolvedValue(mockIntegrationLog);

      const result = await integrationLogService.getIntegrationLogById(mockIntegrationLog.id);

      expect(result).toEqual(mockIntegrationLog);
      expect(integrationLogRepository.findById).toHaveBeenCalledWith(
        mockIntegrationLog.id,
        { integration: true }
      );
    });

    it('should throw HttpError when integration log not found', async () => {
      integrationLogRepository.findById.mockResolvedValue(null);

      await expect(integrationLogService.getIntegrationLogById('non-existent-id'))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('getIntegrationLogsByIntegrationId', () => {
    it('should return paginated integration logs for integration', async () => {
      const mockIntegrationLogs = [
        { id: '1', integration_id: 'int-123', message: 'Log 1' },
        { id: '2', integration_id: 'int-123', message: 'Log 2' }
      ];

      integrationLogRepository.findMany.mockResolvedValue(mockIntegrationLogs);
      integrationLogRepository.count.mockResolvedValue(10);

      const result = await integrationLogService.getIntegrationLogsByIntegrationId('int-123', 1, 20);

      expect(result.data).toEqual(mockIntegrationLogs);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });

      expect(integrationLogRepository.findMany).toHaveBeenCalledWith(
        { integration_id: 'int-123' },
        0,
        20,
        { logged_at: 'desc' },
        { integration: true }
      );
    });

    it('should handle pagination correctly', async () => {
      integrationLogRepository.findMany.mockResolvedValue([]);
      integrationLogRepository.count.mockResolvedValue(50);

      const result = await integrationLogService.getIntegrationLogsByIntegrationId('int-123', 2, 20);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 50,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true
      });
    });
  });

  describe('listIntegrationLogs', () => {
    it('should return paginated integration logs', async () => {
      const mockIntegrationLogs = [
        { id: '1', message: 'Log 1' },
        { id: '2', message: 'Log 2' }
      ];

      integrationLogRepository.findMany.mockResolvedValue(mockIntegrationLogs);
      integrationLogRepository.count.mockResolvedValue(20);

      const result = await integrationLogService.listIntegrationLogs({}, 1, 20);

      expect(result.data).toEqual(mockIntegrationLogs);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    it('should apply filters correctly', async () => {
      const filters = {
        integration_id: 'int-123',
        status: 'ACTIVE',
        search: 'test'
      };

      integrationLogRepository.findMany.mockResolvedValue([]);
      integrationLogRepository.count.mockResolvedValue(0);

      await integrationLogService.listIntegrationLogs(filters, 1, 20);

      expect(integrationLogRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          integration_id: 'int-123',
          status: 'ACTIVE',
          OR: [{ message: { contains: 'test' } }]
        }),
        0,
        20,
        { logged_at: 'desc' },
        { integration: true }
      );
    });

    it('should handle custom sort parameters', async () => {
      integrationLogRepository.findMany.mockResolvedValue([]);
      integrationLogRepository.count.mockResolvedValue(0);

      await integrationLogService.listIntegrationLogs({}, 1, 20, 'created_at', 'asc');

      expect(integrationLogRepository.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        0,
        20,
        { created_at: 'asc' },
        { integration: true }
      );
    });
  });
});
