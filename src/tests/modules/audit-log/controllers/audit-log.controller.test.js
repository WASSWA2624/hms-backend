/**
 * Audit log controller tests
 *
 * @module tests/modules/audit-log/controllers
 * @description Tests for audit log controller layer
 */

// Mock dependencies before imports
jest.mock('@modules/audit-log/services/audit-log.service');
jest.mock('@lib/response');

const auditLogController = require('@modules/audit-log/controllers/audit-log.controller');
const auditLogService = require('@modules/audit-log/services/audit-log.service');
const { sendSuccess, sendPaginated } = require('@lib/response');

describe('Audit Log Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: {},
      query: {},
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getAuditLogById', () => {
    it('should get audit log by ID', async () => {
      const mockId = '123e4567-e89b-12d3-a456-426614174000';
      const mockAuditLog = { id: mockId, action: 'CREATE' };
      req.params.id = mockId;
      auditLogService.getAuditLogById.mockResolvedValue(mockAuditLog);

      await auditLogController.getAuditLogById(req, res);

      expect(auditLogService.getAuditLogById).toHaveBeenCalledWith(mockId);
      expect(sendSuccess).toHaveBeenCalledWith(
        res,
        200,
        'messages.audit_log.retrieved',
        mockAuditLog
      );
    });
  });

  describe('getAuditLogs', () => {
    it('should get paginated audit logs', async () => {
      const mockResult = {
        data: [{ id: '1' }, { id: '2' }],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      };
      req.query = { page: '1', limit: '20' };
      auditLogService.getAuditLogs.mockResolvedValue(mockResult);

      await auditLogController.getAuditLogs(req, res);

      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith(
        expect.any(Object),
        1,
        20,
        'created_at',
        'desc'
      );
      expect(sendPaginated).toHaveBeenCalledWith(
        res,
        'messages.audit_log.list_retrieved',
        mockResult.data,
        expect.objectContaining({
          page: mockResult.page,
          limit: mockResult.limit,
          total: mockResult.total,
          totalPages: mockResult.totalPages
        })
      );
    });

    it('should apply filters from query params', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      req.query = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174000',
        action: 'CREATE',
        entity: 'user'
      };
      auditLogService.getAuditLogs.mockResolvedValue(mockResult);

      await auditLogController.getAuditLogs(req, res);

      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: req.query.tenant_id,
          action: req.query.action,
          entity: req.query.entity
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should use default pagination values', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      auditLogService.getAuditLogs.mockResolvedValue(mockResult);

      await auditLogController.getAuditLogs(req, res);

      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith(
        expect.any(Object),
        1,
        20,
        'created_at',
        'desc'
      );
    });

    it('should handle custom sorting', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      req.query = { sort_by: 'action', order: 'asc' };
      auditLogService.getAuditLogs.mockResolvedValue(mockResult);

      await auditLogController.getAuditLogs(req, res);

      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith(
        expect.any(Object),
        1,
        20,
        'action',
        'asc'
      );
    });
  });

  describe('getAuditLogsByUserId', () => {
    it('should get audit logs by user ID', async () => {
      const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
      const mockResult = {
        data: [{ id: '1', user_id: mockUserId }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      };
      req.params.userId = mockUserId;
      req.query = {};
      auditLogService.getAuditLogsByUserId.mockResolvedValue(mockResult);

      await auditLogController.getAuditLogsByUserId(req, res);

      expect(auditLogService.getAuditLogsByUserId).toHaveBeenCalledWith(
        mockUserId,
        1,
        20,
        'created_at',
        'desc'
      );
      expect(sendPaginated).toHaveBeenCalledWith(
        res,
        'messages.audit_log.user_list_retrieved',
        mockResult.data,
        expect.any(Object)
      );
    });
  });

  describe('getAuditLogsByEntity', () => {
    it('should get audit logs by entity', async () => {
      const mockEntity = 'user';
      const mockEntityId = '123e4567-e89b-12d3-a456-426614174000';
      const mockResult = {
        data: [{ id: '1', entity: mockEntity, entity_id: mockEntityId }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      };
      req.params = { entity: mockEntity, entityId: mockEntityId };
      req.query = {};
      auditLogService.getAuditLogsByEntity.mockResolvedValue(mockResult);

      await auditLogController.getAuditLogsByEntity(req, res);

      expect(auditLogService.getAuditLogsByEntity).toHaveBeenCalledWith(
        mockEntity,
        mockEntityId,
        1,
        20,
        'created_at',
        'desc'
      );
      expect(sendPaginated).toHaveBeenCalledWith(
        res,
        'messages.audit_log.entity_list_retrieved',
        mockResult.data,
        expect.any(Object)
      );
    });
  });
});
