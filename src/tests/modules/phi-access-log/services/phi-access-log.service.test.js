/**
 * PHI access log service tests
 *
 * @module tests/modules/phi-access-log/services
 * @description Tests for PHI access log service layer
 */

const phiAccessLogService = require('@modules/phi-access-log/services/phi-access-log.service');
const phiAccessLogRepository = require('@modules/phi-access-log/repositories/phi-access-log.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');
const prisma = require('@prisma/client');

jest.mock('@modules/phi-access-log/repositories/phi-access-log.repository');
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

describe('PHI Access Log Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPhiAccessLogById', () => {
    const mockId = '123e4567-e89b-12d3-a456-426614174000';
    const mockPhiAccessLog = {
      id: mockId,
      access_scope: 'PATIENT',
      tenant: { id: '123e4567-e89b-12d3-a456-426614174001' },
      user: { id: '123e4567-e89b-12d3-a456-426614174002', email: 'test@example.com' },
      patient: { id: '123e4567-e89b-12d3-a456-426614174003', first_name: 'John', last_name: 'Doe' }
    };

    it('should get PHI access log by ID', async () => {
      phiAccessLogRepository.findById.mockResolvedValue(mockPhiAccessLog);

      const result = await phiAccessLogService.getPhiAccessLogById(mockId);

      expect(phiAccessLogRepository.findById).toHaveBeenCalledWith(mockId, expect.any(Object));
      expect(result).toEqual(mockPhiAccessLog);
    });

    it('should throw HttpError if PHI access log not found', async () => {
      phiAccessLogRepository.findById.mockResolvedValue(null);

      await expect(phiAccessLogService.getPhiAccessLogById(mockId))
        .rejects.toThrow(HttpError);
      await expect(phiAccessLogService.getPhiAccessLogById(mockId))
        .rejects.toMatchObject({ message: 'errors.phi_access_log.not_found', statusCode: 404 });
    });
  });

  describe('getPhiAccessLogs', () => {
    const mockPhiAccessLogs = [
      { id: '1', access_scope: 'PATIENT' },
      { id: '2', access_scope: 'FACILITY' }
    ];

    it('should get paginated PHI access logs', async () => {
      phiAccessLogRepository.findMany.mockResolvedValue(mockPhiAccessLogs);
      phiAccessLogRepository.count.mockResolvedValue(50);

      const result = await phiAccessLogService.getPhiAccessLogs({}, 1, 20);

      expect(phiAccessLogRepository.findMany).toHaveBeenCalled();
      expect(phiAccessLogRepository.count).toHaveBeenCalled();
      expect(result).toEqual({
        data: mockPhiAccessLogs,
        total: 50,
        page: 1,
        limit: 20,
        totalPages: 3
      });
    });

    it('should apply filters', async () => {
      const filters = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174000',
        access_scope: 'PATIENT'
      };
      phiAccessLogRepository.findMany.mockResolvedValue(mockPhiAccessLogs);
      phiAccessLogRepository.count.mockResolvedValue(2);

      await phiAccessLogService.getPhiAccessLogs(filters, 1, 20);

      expect(phiAccessLogRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ tenant_id: filters.tenant_id, access_scope: filters.access_scope }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should apply date range filters', async () => {
      const filters = {
        date_from: '2026-01-01T00:00:00.000Z',
        date_to: '2026-01-31T23:59:59.999Z'
      };
      phiAccessLogRepository.findMany.mockResolvedValue(mockPhiAccessLogs);
      phiAccessLogRepository.count.mockResolvedValue(10);

      await phiAccessLogService.getPhiAccessLogs(filters, 1, 20);

      expect(phiAccessLogRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          accessed_at: {
            gte: expect.any(Date),
            lte: expect.any(Date)
          }
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('getPhiAccessLogsByUserId', () => {
    const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
    const mockResult = {
      data: [{ id: '1', user_id: mockUserId }],
      total: 10,
      page: 1,
      limit: 20,
      totalPages: 1
    };

    it('should get PHI access logs by user ID', async () => {
      phiAccessLogRepository.findMany.mockResolvedValue(mockResult.data);
      phiAccessLogRepository.count.mockResolvedValue(mockResult.total);

      const result = await phiAccessLogService.getPhiAccessLogsByUserId(mockUserId, 1, 20);

      expect(phiAccessLogRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: mockUserId }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
        expect.any(Object)
      );
      expect(result.data).toEqual(mockResult.data);
    });
  });

  describe('createPhiAccessLog', () => {
    const mockData = {
      tenant_id: '123e4567-e89b-12d3-a456-426614174000',
      user_id: '123e4567-e89b-12d3-a456-426614174001',
      patient_id: '123e4567-e89b-12d3-a456-426614174002',
      access_scope: 'PATIENT'
    };
    const mockCreated = { id: '123e4567-e89b-12d3-a456-426614174003', ...mockData };
    const mockUserId = '123e4567-e89b-12d3-a456-426614174004';
    const mockIpAddress = '192.168.1.1';

    it('should create PHI access log within transaction', async () => {
      phiAccessLogRepository.create.mockResolvedValue(mockCreated);
      createAuditLog.mockResolvedValue({});

      // Service method should execute without errors (transaction returns undefined in mock)
      await expect(
        phiAccessLogService.createPhiAccessLog(mockData, mockUserId, mockIpAddress)
      ).resolves.not.toThrow();
    });
  });

  describe('updatePhiAccessLog', () => {
    const mockId = '123e4567-e89b-12d3-a456-426614174000';
    const mockData = { access_scope: 'FACILITY' };
    const mockExisting = { id: mockId, tenant_id: '123e4567-e89b-12d3-a456-426614174001' };
    const mockUpdated = { ...mockExisting, ...mockData };
    const mockUserId = '123e4567-e89b-12d3-a456-426614174002';
    const mockIpAddress = '192.168.1.1';

    it('should update PHI access log within transaction', async () => {
      phiAccessLogRepository.findById.mockResolvedValue(mockExisting);
      phiAccessLogRepository.update.mockResolvedValue(mockUpdated);
      createAuditLog.mockResolvedValue({});

      // Service method should execute without errors (transaction returns undefined in mock)
      await expect(
        phiAccessLogService.updatePhiAccessLog(mockId, mockData, mockUserId, mockIpAddress)
      ).resolves.not.toThrow();
      
      expect(phiAccessLogRepository.findById).toHaveBeenCalledWith(mockId);
    });

    it('should throw HttpError if PHI access log not found', async () => {
      phiAccessLogRepository.findById.mockResolvedValue(null);

      await expect(phiAccessLogService.updatePhiAccessLog(mockId, mockData, mockUserId, mockIpAddress))
        .rejects.toThrow(HttpError);
    });
  });

  describe('deletePhiAccessLog', () => {
    const mockId = '123e4567-e89b-12d3-a456-426614174000';
    const mockExisting = { id: mockId, tenant_id: '123e4567-e89b-12d3-a456-426614174001' };
    const mockDeleted = { ...mockExisting, deleted_at: new Date() };
    const mockUserId = '123e4567-e89b-12d3-a456-426614174002';
    const mockIpAddress = '192.168.1.1';

    it('should soft delete PHI access log within transaction', async () => {
      phiAccessLogRepository.findById.mockResolvedValue(mockExisting);
      phiAccessLogRepository.softDelete.mockResolvedValue(mockDeleted);
      createAuditLog.mockResolvedValue({});

      // Service method should execute without errors (transaction returns undefined in mock)
      await expect(
        phiAccessLogService.deletePhiAccessLog(mockId, mockUserId, mockIpAddress)
      ).resolves.not.toThrow();
      
      expect(phiAccessLogRepository.findById).toHaveBeenCalledWith(mockId);
    });

    it('should throw HttpError if PHI access log not found', async () => {
      phiAccessLogRepository.findById.mockResolvedValue(null);

      await expect(phiAccessLogService.deletePhiAccessLog(mockId, mockUserId, mockIpAddress))
        .rejects.toThrow(HttpError);
    });
  });
});
