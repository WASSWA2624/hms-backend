/**
 * System change log service tests
 *
 * @module tests/modules/system-change-log/services
 * @description Tests for system change log service operations
 * Per testing.mdc: Comprehensive service tests with mocked repositories and audit
 */

const systemChangeLogService = require('@services/system-change-log/system-change-log.service');
const systemChangeLogRepository = require('@repositories/system-change-log/system-change-log.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock repository and audit
jest.mock('@repositories/system-change-log/system-change-log.repository');
jest.mock('@lib/audit');

describe('System Change Log Service', () => {
  const mockSystemChangeLog = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    tenant_id: '550e8400-e29b-41d4-a716-446655440001',
    user_id: '550e8400-e29b-41d4-a716-446655440002',
    change_type: 'DATABASE_MIGRATION',
    details: 'Added new column to users table',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    version: 1
  };

  const userId = 'user-123';
  const ipAddress = '127.0.0.1';
  const tenantId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockResolvedValue({});
  });

  describe('listSystemChangeLogs', () => {
    it('should list system change logs with pagination', async () => {
      const mockSystemChangeLogs = [mockSystemChangeLog];
      systemChangeLogRepository.findMany.mockResolvedValue(mockSystemChangeLogs);
      systemChangeLogRepository.count.mockResolvedValue(1);

      const filters = { change_type: 'DATABASE_MIGRATION' };
      const result = await systemChangeLogService.listSystemChangeLogs(
        filters, 1, 20, 'created_at', 'desc', userId, ipAddress
      );

      expect(result.systemChangeLogs).toEqual(mockSystemChangeLogs);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    it('should handle date range filters', async () => {
      systemChangeLogRepository.findMany.mockResolvedValue([mockSystemChangeLog]);
      systemChangeLogRepository.count.mockResolvedValue(1);

      const filters = {
        from_date: '2024-01-01T00:00:00Z',
        to_date: '2024-01-31T23:59:59Z'
      };

      await systemChangeLogService.listSystemChangeLogs(
        filters, 1, 20, 'created_at', 'desc', userId, ipAddress
      );

      expect(systemChangeLogRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          created_at: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date)
          })
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('getSystemChangeLogById', () => {
    it('should get system change log by ID', async () => {
      systemChangeLogRepository.findById.mockResolvedValue(mockSystemChangeLog);

      const result = await systemChangeLogService.getSystemChangeLogById(
        mockSystemChangeLog.id, userId, ipAddress
      );

      expect(result).toEqual(mockSystemChangeLog);
      expect(systemChangeLogRepository.findById).toHaveBeenCalledWith(mockSystemChangeLog.id);
    });

    it('should throw HttpError when system change log not found', async () => {
      systemChangeLogRepository.findById.mockResolvedValue(null);

      await expect(
        systemChangeLogService.getSystemChangeLogById('non-existent-id', userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createSystemChangeLog', () => {
    it('should create a new system change log', async () => {
      const createData = {
        change_type: 'DATABASE_MIGRATION',
        details: 'Added new column to users table'
      };

      systemChangeLogRepository.create.mockResolvedValue(mockSystemChangeLog);

      const result = await systemChangeLogService.createSystemChangeLog(
        createData, tenantId, userId, ipAddress
      );

      expect(result).toEqual(mockSystemChangeLog);
      expect(systemChangeLogRepository.create).toHaveBeenCalledWith({
        ...createData,
        tenant_id: tenantId,
        user_id: userId
      });
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          action: 'CREATE',
          entity: 'system_change_log',
          entity_id: mockSystemChangeLog.id
        })
      );
    });
  });

  describe('updateSystemChangeLog', () => {
    it('should update a system change log', async () => {
      const updateData = { change_type: 'CONFIG_UPDATE' };
      const updatedSystemChangeLog = { ...mockSystemChangeLog, ...updateData };

      systemChangeLogRepository.findById.mockResolvedValue(mockSystemChangeLog);
      systemChangeLogRepository.update.mockResolvedValue(updatedSystemChangeLog);

      const result = await systemChangeLogService.updateSystemChangeLog(
        mockSystemChangeLog.id, updateData, userId, ipAddress
      );

      expect(result).toEqual(updatedSystemChangeLog);
      expect(systemChangeLogRepository.update).toHaveBeenCalledWith(
        mockSystemChangeLog.id, updateData
      );
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: userId,
          action: 'UPDATE',
          entity: 'system_change_log'
        })
      );
    });

    it('should throw HttpError when system change log not found', async () => {
      systemChangeLogRepository.findById.mockResolvedValue(null);

      await expect(
        systemChangeLogService.updateSystemChangeLog('non-existent-id', {}, userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('approveSystemChangeLog', () => {
    it('should approve a system change log with notes', async () => {
      const approvalNotes = 'Approved after review';
      const approvedSystemChangeLog = {
        ...mockSystemChangeLog,
        details: expect.stringContaining('[APPROVED]')
      };

      systemChangeLogRepository.findById.mockResolvedValue(mockSystemChangeLog);
      systemChangeLogRepository.update.mockResolvedValue(approvedSystemChangeLog);

      const result = await systemChangeLogService.approveSystemChangeLog(
        mockSystemChangeLog.id, approvalNotes, userId, ipAddress
      );

      expect(systemChangeLogRepository.update).toHaveBeenCalledWith(
        mockSystemChangeLog.id,
        expect.objectContaining({
          details: expect.stringContaining('[APPROVED]')
        })
      );
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'APPROVE',
          entity: 'system_change_log'
        })
      );
    });

    it('should approve with default notes when not provided', async () => {
      const approvedSystemChangeLog = {
        ...mockSystemChangeLog,
        details: expect.stringContaining('[APPROVED]')
      };

      systemChangeLogRepository.findById.mockResolvedValue(mockSystemChangeLog);
      systemChangeLogRepository.update.mockResolvedValue(approvedSystemChangeLog);

      await systemChangeLogService.approveSystemChangeLog(
        mockSystemChangeLog.id, null, userId, ipAddress
      );

      expect(systemChangeLogRepository.update).toHaveBeenCalledWith(
        mockSystemChangeLog.id,
        expect.objectContaining({
          details: expect.stringContaining('Approved')
        })
      );
    });

    it('should throw HttpError when system change log not found', async () => {
      systemChangeLogRepository.findById.mockResolvedValue(null);

      await expect(
        systemChangeLogService.approveSystemChangeLog('non-existent-id', null, userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('implementSystemChangeLog', () => {
    it('should implement a system change log with notes', async () => {
      const implementationNotes = 'Successfully implemented';
      const implementedSystemChangeLog = {
        ...mockSystemChangeLog,
        details: expect.stringContaining('[IMPLEMENTED]')
      };

      systemChangeLogRepository.findById.mockResolvedValue(mockSystemChangeLog);
      systemChangeLogRepository.update.mockResolvedValue(implementedSystemChangeLog);

      const result = await systemChangeLogService.implementSystemChangeLog(
        mockSystemChangeLog.id, implementationNotes, userId, ipAddress
      );

      expect(systemChangeLogRepository.update).toHaveBeenCalledWith(
        mockSystemChangeLog.id,
        expect.objectContaining({
          details: expect.stringContaining('[IMPLEMENTED]')
        })
      );
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'IMPLEMENT',
          entity: 'system_change_log'
        })
      );
    });

    it('should implement with default notes when not provided', async () => {
      const implementedSystemChangeLog = {
        ...mockSystemChangeLog,
        details: expect.stringContaining('[IMPLEMENTED]')
      };

      systemChangeLogRepository.findById.mockResolvedValue(mockSystemChangeLog);
      systemChangeLogRepository.update.mockResolvedValue(implementedSystemChangeLog);

      await systemChangeLogService.implementSystemChangeLog(
        mockSystemChangeLog.id, null, userId, ipAddress
      );

      expect(systemChangeLogRepository.update).toHaveBeenCalledWith(
        mockSystemChangeLog.id,
        expect.objectContaining({
          details: expect.stringContaining('Implemented')
        })
      );
    });

    it('should throw HttpError when system change log not found', async () => {
      systemChangeLogRepository.findById.mockResolvedValue(null);

      await expect(
        systemChangeLogService.implementSystemChangeLog('non-existent-id', null, userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('deleteSystemChangeLog', () => {
    it('should soft delete a system change log', async () => {
      systemChangeLogRepository.findById.mockResolvedValue(mockSystemChangeLog);
      systemChangeLogRepository.softDelete.mockResolvedValue(mockSystemChangeLog);

      await systemChangeLogService.deleteSystemChangeLog(
        mockSystemChangeLog.id, userId, ipAddress
      );

      expect(systemChangeLogRepository.softDelete).toHaveBeenCalledWith(mockSystemChangeLog.id);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          entity: 'system_change_log'
        })
      );
    });

    it('should throw HttpError when system change log not found', async () => {
      systemChangeLogRepository.findById.mockResolvedValue(null);

      await expect(
        systemChangeLogService.deleteSystemChangeLog('non-existent-id', userId, ipAddress)
      ).rejects.toThrow(HttpError);
    });
  });
});
