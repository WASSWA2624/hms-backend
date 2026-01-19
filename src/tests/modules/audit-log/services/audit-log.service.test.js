/**
 * Audit log service tests
 *
 * @module tests/modules/audit-log/services
 * @description Tests for audit log service layer
 */

const auditLogService = require('@modules/audit-log/services/audit-log.service');
const auditLogRepository = require('@modules/audit-log/repositories/audit-log.repository');
const { HttpError } = require('@lib/errors');

jest.mock('@modules/audit-log/repositories/audit-log.repository');

describe('Audit Log Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAuditLogById', () => {
    const mockId = '123e4567-e89b-12d3-a456-426614174000';
    const mockAuditLog = {
      id: mockId,
      action: 'CREATE',
      entity: 'user',
      tenant: { id: '123e4567-e89b-12d3-a456-426614174001' },
      user: { id: '123e4567-e89b-12d3-a456-426614174002', email: 'test@example.com' }
    };

    it('should get audit log by ID', async () => {
      auditLogRepository.findById.mockResolvedValue(mockAuditLog);

      const result = await auditLogService.getAuditLogById(mockId);

      expect(auditLogRepository.findById).toHaveBeenCalledWith(mockId, expect.any(Object));
      expect(result).toEqual(mockAuditLog);
    });

    it('should throw HttpError if audit log not found', async () => {
      auditLogRepository.findById.mockResolvedValue(null);

      await expect(auditLogService.getAuditLogById(mockId))
        .rejects.toThrow(HttpError);
      await expect(auditLogService.getAuditLogById(mockId))
        .rejects.toMatchObject({ message: 'errors.audit_log.not_found', statusCode: 404 });
    });
  });

  describe('getAuditLogs', () => {
    const mockAuditLogs = [
      { id: '1', action: 'CREATE', entity: 'user' },
      { id: '2', action: 'UPDATE', entity: 'patient' }
    ];

    it('should get paginated audit logs', async () => {
      auditLogRepository.findMany.mockResolvedValue(mockAuditLogs);
      auditLogRepository.count.mockResolvedValue(50);

      const result = await auditLogService.getAuditLogs({}, 1, 20);

      expect(auditLogRepository.findMany).toHaveBeenCalled();
      expect(auditLogRepository.count).toHaveBeenCalled();
      expect(result).toEqual({
        data: mockAuditLogs,
        total: 50,
        page: 1,
        limit: 20,
        totalPages: 3
      });
    });

    it('should apply filters', async () => {
      const filters = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'CREATE'
      };
      auditLogRepository.findMany.mockResolvedValue(mockAuditLogs);
      auditLogRepository.count.mockResolvedValue(2);

      await auditLogService.getAuditLogs(filters, 1, 20);

      expect(auditLogRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ tenant_id: filters.tenant_id, action: filters.action }),
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
      auditLogRepository.findMany.mockResolvedValue(mockAuditLogs);
      auditLogRepository.count.mockResolvedValue(10);

      await auditLogService.getAuditLogs(filters, 1, 20);

      expect(auditLogRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          created_at: {
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

    it('should handle custom sorting', async () => {
      auditLogRepository.findMany.mockResolvedValue(mockAuditLogs);
      auditLogRepository.count.mockResolvedValue(5);

      await auditLogService.getAuditLogs({}, 1, 20, 'action', 'asc');

      expect(auditLogRepository.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Number),
        expect.any(Number),
        { action: 'asc' },
        expect.any(Object)
      );
    });

    it('should calculate pagination correctly', async () => {
      auditLogRepository.findMany.mockResolvedValue(mockAuditLogs);
      auditLogRepository.count.mockResolvedValue(45);

      const result = await auditLogService.getAuditLogs({}, 2, 20);

      expect(auditLogRepository.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        20, // skip = (2 - 1) * 20
        20,
        expect.any(Object),
        expect.any(Object)
      );
      expect(result.totalPages).toBe(3); // Math.ceil(45 / 20)
    });
  });

  describe('getAuditLogsByUserId', () => {
    const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
    const mockResult = {
      data: [{ id: '1', user_id: mockUserId }],
      total: 10,
      page: 1,
      limit: 20,
      totalPages: 1
    };

    it('should get audit logs by user ID', async () => {
      auditLogRepository.findMany.mockResolvedValue(mockResult.data);
      auditLogRepository.count.mockResolvedValue(mockResult.total);

      const result = await auditLogService.getAuditLogsByUserId(mockUserId, 1, 20);

      expect(auditLogRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: mockUserId }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
        expect.any(Object)
      );
      expect(result.data).toEqual(mockResult.data);
    });
  });

  describe('getAuditLogsByEntity', () => {
    const mockEntity = 'user';
    const mockEntityId = '123e4567-e89b-12d3-a456-426614174000';
    const mockResult = {
      data: [{ id: '1', entity: mockEntity, entity_id: mockEntityId }],
      total: 5,
      page: 1,
      limit: 20,
      totalPages: 1
    };

    it('should get audit logs by entity', async () => {
      auditLogRepository.findMany.mockResolvedValue(mockResult.data);
      auditLogRepository.count.mockResolvedValue(mockResult.total);

      const result = await auditLogService.getAuditLogsByEntity(mockEntity, mockEntityId, 1, 20);

      expect(auditLogRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ entity: mockEntity, entity_id: mockEntityId }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
        expect.any(Object)
      );
      expect(result.data).toEqual(mockResult.data);
    });
  });
});
