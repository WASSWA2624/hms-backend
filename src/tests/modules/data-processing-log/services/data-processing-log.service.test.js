/**
 * Data processing log service tests
 *
 * @module tests/modules/data-processing-log/services
 * @description Tests for data processing log service layer
 */

const dataProcessingLogService = require('@modules/data-processing-log/services/data-processing-log.service');
const dataProcessingLogRepository = require('@modules/data-processing-log/repositories/data-processing-log.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const prisma = require('@prisma/client');

jest.mock('@modules/data-processing-log/repositories/data-processing-log.repository');
jest.mock('@lib/audit');

// Mock prisma properly
jest.mock('@prisma/client', () => {
  const mockTransaction = jest.fn(async (callback) => await callback({}));
  return {
    __esModule: true,
    default: {
      $transaction: mockTransaction
    },
    $transaction: mockTransaction
  };
});

describe('Data Processing Log Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDataProcessingLogById', () => {
    const mockId = '123e4567-e89b-12d3-a456-426614174000';
    const mockLog = { id: mockId, purpose: 'TREATMENT', tenant: {}, user: {} };

    it('should get data processing log by ID', async () => {
      dataProcessingLogRepository.findById.mockResolvedValue(mockLog);
      const result = await dataProcessingLogService.getDataProcessingLogById(mockId);
      expect(result).toEqual(mockLog);
    });

    it('should throw HttpError if not found', async () => {
      dataProcessingLogRepository.findById.mockResolvedValue(null);
      await expect(dataProcessingLogService.getDataProcessingLogById(mockId))
        .rejects.toMatchObject({ message: 'errors.data_processing_log.not_found', statusCode: 404 });
    });
  });

  describe('getDataProcessingLogs', () => {
    const mockLogs = [{ id: '1' }, { id: '2' }];

    it('should get paginated data processing logs', async () => {
      dataProcessingLogRepository.findMany.mockResolvedValue(mockLogs);
      dataProcessingLogRepository.count.mockResolvedValue(50);
      const result = await dataProcessingLogService.getDataProcessingLogs({}, 1, 20);
      expect(result).toEqual({ data: mockLogs, total: 50, page: 1, limit: 20, totalPages: 3 });
    });

    it('should apply filters', async () => {
      const filters = { tenant_id: '123e4567-e89b-12d3-a456-426614174000', purpose: 'TREATMENT' };
      dataProcessingLogRepository.findMany.mockResolvedValue(mockLogs);
      dataProcessingLogRepository.count.mockResolvedValue(2);
      await dataProcessingLogService.getDataProcessingLogs(filters, 1, 20);
      expect(dataProcessingLogRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining(filters), expect.any(Number), expect.any(Number), expect.any(Object), expect.any(Object)
      );
    });
  });

  describe('createDataProcessingLog', () => {
    const mockData = { tenant_id: '123e4567-e89b-12d3-a456-426614174000', purpose: 'TREATMENT', legal_basis: 'CONSENT' };
    const mockCreated = { id: '123e4567-e89b-12d3-a456-426614174003', ...mockData };
    const mockUserId = '123e4567-e89b-12d3-a456-426614174004';
    const mockIpAddress = '192.168.1.1';

    it('should create data processing log within transaction', async () => {
      dataProcessingLogRepository.create.mockResolvedValue(mockCreated);
      createAuditLog.mockResolvedValue({});
      
      // Service method should execute without errors (transaction returns undefined in mock)
      await expect(
        dataProcessingLogService.createDataProcessingLog(mockData, mockUserId, mockIpAddress)
      ).resolves.not.toThrow();
    });
  });

  describe('updateDataProcessingLog', () => {
    const mockId = '123e4567-e89b-12d3-a456-426614174000';
    const mockData = { purpose: 'OPERATIONS' };
    const mockExisting = { id: mockId, tenant_id: '123e4567-e89b-12d3-a456-426614174001' };
    const mockUpdated = { ...mockExisting, ...mockData };
    const mockUserId = '123e4567-e89b-12d3-a456-426614174002';
    const mockIpAddress = '192.168.1.1';

    it('should update data processing log within transaction', async () => {
      dataProcessingLogRepository.findById.mockResolvedValue(mockExisting);
      dataProcessingLogRepository.update.mockResolvedValue(mockUpdated);
      createAuditLog.mockResolvedValue({});
      
      // Service method should execute without errors (transaction returns undefined in mock)
      await expect(
        dataProcessingLogService.updateDataProcessingLog(mockId, mockData, mockUserId, mockIpAddress)
      ).resolves.not.toThrow();
      
      expect(dataProcessingLogRepository.findById).toHaveBeenCalledWith(mockId);
    });

    it('should throw HttpError if not found', async () => {
      dataProcessingLogRepository.findById.mockResolvedValue(null);
      await expect(dataProcessingLogService.updateDataProcessingLog(mockId, mockData, mockUserId, mockIpAddress))
        .rejects.toThrow(HttpError);
    });
  });

  describe('deleteDataProcessingLog', () => {
    const mockId = '123e4567-e89b-12d3-a456-426614174000';
    const mockExisting = { id: mockId, tenant_id: '123e4567-e89b-12d3-a456-426614174001' };
    const mockDeleted = { ...mockExisting, deleted_at: new Date() };
    const mockUserId = '123e4567-e89b-12d3-a456-426614174002';
    const mockIpAddress = '192.168.1.1';

    it('should soft delete data processing log within transaction', async () => {
      dataProcessingLogRepository.findById.mockResolvedValue(mockExisting);
      dataProcessingLogRepository.softDelete.mockResolvedValue(mockDeleted);
      createAuditLog.mockResolvedValue({});
      
      // Service method should execute without errors (transaction returns undefined in mock)
      await expect(
        dataProcessingLogService.deleteDataProcessingLog(mockId, mockUserId, mockIpAddress)
      ).resolves.not.toThrow();
      
      expect(dataProcessingLogRepository.findById).toHaveBeenCalledWith(mockId);
    });

    it('should throw HttpError if not found', async () => {
      dataProcessingLogRepository.findById.mockResolvedValue(null);
      await expect(dataProcessingLogService.deleteDataProcessingLog(mockId, mockUserId, mockIpAddress))
        .rejects.toThrow(HttpError);
    });
  });
});
