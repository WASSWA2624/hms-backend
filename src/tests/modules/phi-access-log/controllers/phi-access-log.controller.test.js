/**
 * PHI access log controller tests
 *
 * @module tests/modules/phi-access-log/controllers
 * @description Tests for PHI access log controller layer
 */

// Mock dependencies before imports
jest.mock('@modules/phi-access-log/services/phi-access-log.service');
jest.mock('@lib/response');

const phiAccessLogController = require('@modules/phi-access-log/controllers/phi-access-log.controller');
const phiAccessLogService = require('@modules/phi-access-log/services/phi-access-log.service');
const { sendSuccess, sendPaginated, sendNoContent } = require('@lib/response');

describe('PHI Access Log Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: {},
      query: {},
      body: {},
      user: { id: '123e4567-e89b-12d3-a456-426614174000' },
      ip: '192.168.1.1'
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getPhiAccessLogById', () => {
    it('should get PHI access log by ID', async () => {
      const mockId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPhiAccessLog = { id: mockId, access_scope: 'PATIENT' };
      req.params.id = mockId;
      phiAccessLogService.getPhiAccessLogById.mockResolvedValue(mockPhiAccessLog);

      await phiAccessLogController.getPhiAccessLogById(req, res);

      expect(phiAccessLogService.getPhiAccessLogById).toHaveBeenCalledWith(mockId);
      expect(sendSuccess).toHaveBeenCalledWith(
        res,
        200,
        'messages.phi_access_log.retrieved',
        mockPhiAccessLog
      );
    });
  });

  describe('getPhiAccessLogs', () => {
    it('should get paginated PHI access logs', async () => {
      const mockResult = {
        data: [{ id: '1' }, { id: '2' }],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      };
      req.query = { page: '1', limit: '20' };
      phiAccessLogService.getPhiAccessLogs.mockResolvedValue(mockResult);

      await phiAccessLogController.getPhiAccessLogs(req, res);

      expect(phiAccessLogService.getPhiAccessLogs).toHaveBeenCalledWith(
        expect.any(Object),
        1,
        20,
        'accessed_at',
        'desc'
      );
      expect(sendPaginated).toHaveBeenCalledWith(
        res,
        'messages.phi_access_log.list_retrieved',
        mockResult.data,
        expect.any(Object)
      );
    });

    it('should apply filters from query params', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      req.query = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174000',
        access_scope: 'PATIENT',
        patient_id: '123e4567-e89b-12d3-a456-426614174001'
      };
      phiAccessLogService.getPhiAccessLogs.mockResolvedValue(mockResult);

      await phiAccessLogController.getPhiAccessLogs(req, res);

      expect(phiAccessLogService.getPhiAccessLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: req.query.tenant_id,
          access_scope: req.query.access_scope,
          patient_id: req.query.patient_id
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(String),
        expect.any(String)
      );
    });
  });

  describe('getPhiAccessLogsByUserId', () => {
    it('should get PHI access logs by user ID', async () => {
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
      phiAccessLogService.getPhiAccessLogsByUserId.mockResolvedValue(mockResult);

      await phiAccessLogController.getPhiAccessLogsByUserId(req, res);

      expect(phiAccessLogService.getPhiAccessLogsByUserId).toHaveBeenCalledWith(
        mockUserId,
        1,
        20,
        'accessed_at',
        'desc'
      );
      expect(sendPaginated).toHaveBeenCalledWith(
        res,
        'messages.phi_access_log.user_list_retrieved',
        mockResult.data,
        expect.any(Object)
      );
    });
  });

  describe('createPhiAccessLog', () => {
    it('should create PHI access log', async () => {
      const mockData = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        patient_id: '123e4567-e89b-12d3-a456-426614174002',
        access_scope: 'PATIENT'
      };
      const mockCreated = { id: '123e4567-e89b-12d3-a456-426614174003', ...mockData };
      req.body = mockData;
      phiAccessLogService.createPhiAccessLog.mockResolvedValue(mockCreated);

      await phiAccessLogController.createPhiAccessLog(req, res);

      expect(phiAccessLogService.createPhiAccessLog).toHaveBeenCalledWith(
        mockData,
        req.user.id,
        req.ip
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        res,
        201,
        'messages.phi_access_log.created',
        mockCreated
      );
    });
  });

  describe('updatePhiAccessLog', () => {
    it('should update PHI access log', async () => {
      const mockId = '123e4567-e89b-12d3-a456-426614174000';
      const mockData = { access_scope: 'FACILITY' };
      const mockUpdated = { id: mockId, ...mockData };
      req.params.id = mockId;
      req.body = mockData;
      phiAccessLogService.updatePhiAccessLog.mockResolvedValue(mockUpdated);

      await phiAccessLogController.updatePhiAccessLog(req, res);

      expect(phiAccessLogService.updatePhiAccessLog).toHaveBeenCalledWith(
        mockId,
        mockData,
        req.user.id,
        req.ip
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        res,
        200,
        'messages.phi_access_log.updated',
        mockUpdated
      );
    });
  });

  describe('deletePhiAccessLog', () => {
    it('should delete PHI access log', async () => {
      const mockId = '123e4567-e89b-12d3-a456-426614174000';
      req.params.id = mockId;
      phiAccessLogService.deletePhiAccessLog.mockResolvedValue({});

      await phiAccessLogController.deletePhiAccessLog(req, res);

      expect(phiAccessLogService.deletePhiAccessLog).toHaveBeenCalledWith(
        mockId,
        req.user.id,
        req.ip
      );
      expect(sendNoContent).toHaveBeenCalledWith(res);
    });
  });
});
