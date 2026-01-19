/**
 * System change log controller tests
 *
 * @module tests/modules/system-change-log/controllers
 * @description Tests for system change log controller operations
 * Per testing.mdc: Comprehensive controller tests with mocked services
 */

const systemChangeLogController = require('@controllers/system-change-log/system-change-log.controller');
const systemChangeLogService = require('@services/system-change-log/system-change-log.service');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');

// Mock service and response helpers
jest.mock('@services/system-change-log/system-change-log.service');
jest.mock('@lib/response');

describe('System Change Log Controller', () => {
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

  const mockReq = {
    query: {},
    params: {},
    body: {},
    user: {
      id: 'user-123',
      tenant_id: '550e8400-e29b-41d4-a716-446655440001'
    },
    ip: '127.0.0.1'
  };

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listSystemChangeLogs', () => {
    it('should list system change logs with pagination', async () => {
      const mockResult = {
        systemChangeLogs: [mockSystemChangeLog],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };

      systemChangeLogService.listSystemChangeLogs.mockResolvedValue(mockResult);

      const req = { ...mockReq, query: { page: 1, limit: 20 } };

      await systemChangeLogController.listSystemChangeLogs(req, mockRes);

      expect(systemChangeLogService.listSystemChangeLogs).toHaveBeenCalled();
      expect(sendPaginated).toHaveBeenCalledWith(
        mockRes,
        'messages.system_change_log.list.success',
        mockResult.systemChangeLogs,
        mockResult.pagination
      );
    });
  });

  describe('getSystemChangeLogById', () => {
    it('should get system change log by ID', async () => {
      systemChangeLogService.getSystemChangeLogById.mockResolvedValue(mockSystemChangeLog);

      const req = { ...mockReq, params: { id: mockSystemChangeLog.id } };

      await systemChangeLogController.getSystemChangeLogById(req, mockRes);

      expect(systemChangeLogService.getSystemChangeLogById).toHaveBeenCalledWith(
        mockSystemChangeLog.id,
        mockReq.user.id,
        mockReq.ip
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        'messages.system_change_log.get.success',
        mockSystemChangeLog
      );
    });
  });

  describe('createSystemChangeLog', () => {
    it('should create a new system change log', async () => {
      const createData = {
        change_type: 'DATABASE_MIGRATION',
        details: 'Added new column to users table'
      };

      systemChangeLogService.createSystemChangeLog.mockResolvedValue(mockSystemChangeLog);

      const req = { ...mockReq, body: createData };

      await systemChangeLogController.createSystemChangeLog(req, mockRes);

      expect(systemChangeLogService.createSystemChangeLog).toHaveBeenCalledWith(
        createData,
        mockReq.user.tenant_id,
        mockReq.user.id,
        mockReq.ip
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        201,
        'messages.system_change_log.create.success',
        mockSystemChangeLog
      );
    });
  });

  describe('updateSystemChangeLog', () => {
    it('should update a system change log', async () => {
      const updateData = { change_type: 'CONFIG_UPDATE' };
      const updatedSystemChangeLog = { ...mockSystemChangeLog, ...updateData };

      systemChangeLogService.updateSystemChangeLog.mockResolvedValue(updatedSystemChangeLog);

      const req = {
        ...mockReq,
        params: { id: mockSystemChangeLog.id },
        body: updateData
      };

      await systemChangeLogController.updateSystemChangeLog(req, mockRes);

      expect(systemChangeLogService.updateSystemChangeLog).toHaveBeenCalledWith(
        mockSystemChangeLog.id,
        updateData,
        mockReq.user.id,
        mockReq.ip
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        'messages.system_change_log.update.success',
        updatedSystemChangeLog
      );
    });
  });

  describe('approveSystemChangeLog', () => {
    it('should approve a system change log', async () => {
      const approvedSystemChangeLog = {
        ...mockSystemChangeLog,
        details: mockSystemChangeLog.details + '\n\n[APPROVED]'
      };

      systemChangeLogService.approveSystemChangeLog.mockResolvedValue(approvedSystemChangeLog);

      const req = {
        ...mockReq,
        params: { id: mockSystemChangeLog.id },
        body: { approval_notes: 'Approved after review' }
      };

      await systemChangeLogController.approveSystemChangeLog(req, mockRes);

      expect(systemChangeLogService.approveSystemChangeLog).toHaveBeenCalledWith(
        mockSystemChangeLog.id,
        'Approved after review',
        mockReq.user.id,
        mockReq.ip
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        'messages.system_change_log.approve.success',
        approvedSystemChangeLog
      );
    });

    it('should approve without notes', async () => {
      const approvedSystemChangeLog = {
        ...mockSystemChangeLog,
        details: mockSystemChangeLog.details + '\n\n[APPROVED]'
      };

      systemChangeLogService.approveSystemChangeLog.mockResolvedValue(approvedSystemChangeLog);

      const req = {
        ...mockReq,
        params: { id: mockSystemChangeLog.id },
        body: {}
      };

      await systemChangeLogController.approveSystemChangeLog(req, mockRes);

      expect(systemChangeLogService.approveSystemChangeLog).toHaveBeenCalledWith(
        mockSystemChangeLog.id,
        undefined,
        mockReq.user.id,
        mockReq.ip
      );
    });
  });

  describe('implementSystemChangeLog', () => {
    it('should implement a system change log', async () => {
      const implementedSystemChangeLog = {
        ...mockSystemChangeLog,
        details: mockSystemChangeLog.details + '\n\n[IMPLEMENTED]'
      };

      systemChangeLogService.implementSystemChangeLog.mockResolvedValue(implementedSystemChangeLog);

      const req = {
        ...mockReq,
        params: { id: mockSystemChangeLog.id },
        body: { implementation_notes: 'Successfully implemented' }
      };

      await systemChangeLogController.implementSystemChangeLog(req, mockRes);

      expect(systemChangeLogService.implementSystemChangeLog).toHaveBeenCalledWith(
        mockSystemChangeLog.id,
        'Successfully implemented',
        mockReq.user.id,
        mockReq.ip
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        200,
        'messages.system_change_log.implement.success',
        implementedSystemChangeLog
      );
    });

    it('should implement without notes', async () => {
      const implementedSystemChangeLog = {
        ...mockSystemChangeLog,
        details: mockSystemChangeLog.details + '\n\n[IMPLEMENTED]'
      };

      systemChangeLogService.implementSystemChangeLog.mockResolvedValue(implementedSystemChangeLog);

      const req = {
        ...mockReq,
        params: { id: mockSystemChangeLog.id },
        body: {}
      };

      await systemChangeLogController.implementSystemChangeLog(req, mockRes);

      expect(systemChangeLogService.implementSystemChangeLog).toHaveBeenCalledWith(
        mockSystemChangeLog.id,
        undefined,
        mockReq.user.id,
        mockReq.ip
      );
    });
  });

  describe('deleteSystemChangeLog', () => {
    it('should soft delete a system change log', async () => {
      systemChangeLogService.deleteSystemChangeLog.mockResolvedValue();

      const req = { ...mockReq, params: { id: mockSystemChangeLog.id } };

      await systemChangeLogController.deleteSystemChangeLog(req, mockRes);

      expect(systemChangeLogService.deleteSystemChangeLog).toHaveBeenCalledWith(
        mockSystemChangeLog.id,
        mockReq.user.id,
        mockReq.ip
      );
      expect(sendNoContent).toHaveBeenCalledWith(mockRes);
    });
  });
});
