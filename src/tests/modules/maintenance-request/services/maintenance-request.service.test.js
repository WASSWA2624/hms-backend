/**
 * Maintenance request service tests
 *
 * @module tests/modules/maintenance-request/services
 * @description Tests for maintenance request service business logic layer
 */

const maintenanceRequestService = require('../../../../modules/maintenance-request/services/maintenance-request.service');
const maintenanceRequestRepository = require('../../../../modules/maintenance-request/repositories/maintenance-request.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock repository and audit
jest.mock('../../../../modules/maintenance-request/repositories/maintenance-request.repository');
jest.mock('@lib/audit');

describe('Maintenance Request Service', () => {
  const mockUserId = 'user-123';
  const mockIpAddress = '127.0.0.1';

  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockResolvedValue({});
  });

  describe('listMaintenanceRequests', () => {
    it('should list maintenance requests with pagination', async () => {
      const mockRequests = [
        { id: '1', status: 'OPEN' },
        { id: '2', status: 'IN_PROGRESS' }
      ];

      maintenanceRequestRepository.findMany.mockResolvedValue(mockRequests);
      maintenanceRequestRepository.count.mockResolvedValue(2);

      const result = await maintenanceRequestService.listMaintenanceRequests(
        {},
        1,
        20,
        'created_at',
        'desc',
        mockUserId,
        mockIpAddress
      );

      expect(result.maintenanceRequests).toEqual(mockRequests);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    it('should apply filters correctly', async () => {
      maintenanceRequestRepository.findMany.mockResolvedValue([]);
      maintenanceRequestRepository.count.mockResolvedValue(0);

      const filters = {
        facility_id: '123',
        asset_id: '456',
        status: 'OPEN',
        search: 'repair'
      };

      await maintenanceRequestService.listMaintenanceRequests(
        filters,
        1,
        20,
        null,
        'asc',
        mockUserId,
        mockIpAddress
      );

      expect(maintenanceRequestRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          facility_id: '123',
          asset_id: '456',
          status: 'OPEN',
          OR: [{ description: { contains: 'repair' } }]
        }),
        0,
        20,
        { created_at: 'desc' }
      );
    });

    it('should throw HttpError on repository error', async () => {
      maintenanceRequestRepository.findMany.mockRejectedValue(new Error('DB Error'));

      await expect(
        maintenanceRequestService.listMaintenanceRequests({}, 1, 20, null, 'asc', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('getMaintenanceRequestById', () => {
    it('should get maintenance request by ID', async () => {
      const mockRequest = { id: '1', status: 'OPEN' };
      maintenanceRequestRepository.findById.mockResolvedValue(mockRequest);

      const result = await maintenanceRequestService.getMaintenanceRequestById('1', mockUserId, mockIpAddress);

      expect(result).toEqual(mockRequest);
      expect(maintenanceRequestRepository.findById).toHaveBeenCalledWith('1');
    });

    it('should throw HttpError when maintenance request not found', async () => {
      maintenanceRequestRepository.findById.mockResolvedValue(null);

      await expect(
        maintenanceRequestService.getMaintenanceRequestById('non-existent', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createMaintenanceRequest', () => {
    it('should create maintenance request and log audit', async () => {
      const mockData = {
        facility_id: '123',
        status: 'OPEN',
        description: 'New request',
        reported_at: '2026-01-19T10:00:00Z'
      };

      const mockCreated = { id: '1', ...mockData };
      maintenanceRequestRepository.create.mockResolvedValue(mockCreated);

      const result = await maintenanceRequestService.createMaintenanceRequest(mockData, mockUserId, mockIpAddress);

      expect(result).toEqual(mockCreated);
      expect(maintenanceRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          facility_id: '123',
          status: 'OPEN',
          reported_at: expect.any(Date)
        })
      );
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          action: 'CREATE',
          entity: 'maintenance_request',
          entity_id: '1',
          ip_address: mockIpAddress
        })
      );
    });

    it('should handle datetime conversion', async () => {
      const mockData = {
        status: 'OPEN',
        reported_at: '2026-01-19T10:00:00Z',
        resolved_at: '2026-01-19T15:00:00Z'
      };

      maintenanceRequestRepository.create.mockResolvedValue({ id: '1' });

      await maintenanceRequestService.createMaintenanceRequest(mockData, mockUserId, mockIpAddress);

      expect(maintenanceRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reported_at: expect.any(Date),
          resolved_at: expect.any(Date)
        })
      );
    });
  });

  describe('updateMaintenanceRequest', () => {
    it('should update maintenance request and log audit', async () => {
      const mockBefore = { id: '1', status: 'OPEN' };
      const mockAfter = { id: '1', status: 'COMPLETED' };

      maintenanceRequestRepository.findById.mockResolvedValue(mockBefore);
      maintenanceRequestRepository.update.mockResolvedValue(mockAfter);

      const result = await maintenanceRequestService.updateMaintenanceRequest(
        '1',
        { status: 'COMPLETED' },
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(mockAfter);
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          action: 'UPDATE',
          entity: 'maintenance_request',
          diff: { before: mockBefore, after: mockAfter }
        })
      );
    });

    it('should throw HttpError when maintenance request not found', async () => {
      maintenanceRequestRepository.findById.mockResolvedValue(null);

      await expect(
        maintenanceRequestService.updateMaintenanceRequest('non-existent', {}, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('deleteMaintenanceRequest', () => {
    it('should soft delete maintenance request and log audit', async () => {
      const mockBefore = { id: '1', status: 'OPEN' };

      maintenanceRequestRepository.findById.mockResolvedValue(mockBefore);
      maintenanceRequestRepository.softDelete.mockResolvedValue({});

      await maintenanceRequestService.deleteMaintenanceRequest('1', mockUserId, mockIpAddress);

      expect(maintenanceRequestRepository.softDelete).toHaveBeenCalledWith('1');
      expect(createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          action: 'DELETE',
          entity: 'maintenance_request',
          entity_id: '1',
          diff: { before: mockBefore }
        })
      );
    });

    it('should throw HttpError when maintenance request not found', async () => {
      maintenanceRequestRepository.findById.mockResolvedValue(null);

      await expect(
        maintenanceRequestService.deleteMaintenanceRequest('non-existent', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });
});
