/**
 * Lab order service tests
 *
 * @module tests/modules/lab-order/services
 * @description Tests for lab order service business logic
 * Per testing.mdc: Service tests must mock repository and audit functions
 */

const labOrderService = require('@services/lab-order/lab-order.service');
const labOrderRepository = require('@repositories/lab-order/lab-order.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/lab-order/lab-order.repository');
jest.mock('@lib/audit');

describe('Lab Order Service', () => {
  const mockUserId = 'user-123';
  const mockIpAddress = '127.0.0.1';

  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockReturnValue(Promise.resolve());
  });

  describe('listLabOrders', () => {
    it('should list lab orders with pagination', async () => {
      const mockLabOrders = [{ id: '1', patient_id: '456', status: 'ORDERED' }];
      labOrderRepository.findMany.mockResolvedValue(mockLabOrders);
      labOrderRepository.count.mockResolvedValue(1);

      const result = await labOrderService.listLabOrders({}, 1, 20, 'created_at', 'desc', mockUserId, mockIpAddress);

      expect(result.labOrders).toEqual(mockLabOrders);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(labOrderRepository.findMany).toHaveBeenCalled();
      expect(labOrderRepository.count).toHaveBeenCalled();
    });

    it('should calculate pagination correctly', async () => {
      labOrderRepository.findMany.mockResolvedValue([]);
      labOrderRepository.count.mockResolvedValue(100);

      const result = await labOrderService.listLabOrders({}, 3, 20, null, 'asc', mockUserId, mockIpAddress);

      expect(result.pagination.totalPages).toBe(5);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });

    it('should handle patient_id filter', async () => {
      labOrderRepository.findMany.mockResolvedValue([]);
      labOrderRepository.count.mockResolvedValue(0);

      await labOrderService.listLabOrders({ patient_id: '456' }, 1, 20, null, 'asc', mockUserId, mockIpAddress);

      expect(labOrderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ patient_id: '456' }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should handle encounter_id filter', async () => {
      labOrderRepository.findMany.mockResolvedValue([]);
      labOrderRepository.count.mockResolvedValue(0);

      await labOrderService.listLabOrders({ encounter_id: '789' }, 1, 20, null, 'asc', mockUserId, mockIpAddress);

      expect(labOrderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ encounter_id: '789' }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should handle status filter', async () => {
      labOrderRepository.findMany.mockResolvedValue([]);
      labOrderRepository.count.mockResolvedValue(0);

      await labOrderService.listLabOrders({ status: 'COMPLETED' }, 1, 20, null, 'asc', mockUserId, mockIpAddress);

      expect(labOrderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'COMPLETED' }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should handle date range filters', async () => {
      labOrderRepository.findMany.mockResolvedValue([]);
      labOrderRepository.count.mockResolvedValue(0);

      await labOrderService.listLabOrders({
        ordered_at_from: '2026-01-01T00:00:00.000Z',
        ordered_at_to: '2026-01-31T23:59:59.999Z'
      }, 1, 20, null, 'asc', mockUserId, mockIpAddress);

      expect(labOrderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          ordered_at: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date)
          })
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should use custom sort field and order', async () => {
      labOrderRepository.findMany.mockResolvedValue([]);
      labOrderRepository.count.mockResolvedValue(0);

      await labOrderService.listLabOrders({}, 1, 20, 'ordered_at', 'asc', mockUserId, mockIpAddress);

      expect(labOrderRepository.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Number),
        expect.any(Number),
        { ordered_at: 'asc' }
      );
    });

    it('should throw HttpError on repository error', async () => {
      labOrderRepository.findMany.mockRejectedValue(new Error('DB Error'));

      await expect(
        labOrderService.listLabOrders({}, 1, 20, null, 'asc', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('getLabOrderById', () => {
    it('should get lab order by id', async () => {
      const mockLabOrder = { id: '123', patient_id: '456', status: 'ORDERED' };
      labOrderRepository.findById.mockResolvedValue(mockLabOrder);

      const result = await labOrderService.getLabOrderById('123', mockUserId, mockIpAddress);

      expect(result).toEqual(mockLabOrder);
      expect(labOrderRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw HttpError if lab order not found', async () => {
      labOrderRepository.findById.mockResolvedValue(null);

      await expect(
        labOrderService.getLabOrderById('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError with correct message key', async () => {
      labOrderRepository.findById.mockResolvedValue(null);

      try {
        await labOrderService.getLabOrderById('nonexistent', mockUserId, mockIpAddress);
      } catch (error) {
        expect(error.message).toBe('errors.lab_order.not_found');
        expect(error.statusCode).toBe(404);
      }
    });

    it('should propagate repository errors as HttpError', async () => {
      const repoError = new HttpError('errors.database.unexpected', 500);
      labOrderRepository.findById.mockRejectedValue(repoError);

      await expect(
        labOrderService.getLabOrderById('123', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createLabOrder', () => {
    it('should create lab order and log audit', async () => {
      const mockData = { patient_id: '456', encounter_id: '789', status: 'ORDERED' };
      const mockLabOrder = { id: '123', ...mockData };
      labOrderRepository.create.mockResolvedValue(mockLabOrder);

      const result = await labOrderService.createLabOrder(mockData, mockUserId, mockIpAddress);

      expect(result).toEqual(mockLabOrder);
      expect(labOrderRepository.create).toHaveBeenCalledWith(mockData);
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockUserId,
        action: 'CREATE',
        entity: 'lab_order',
        entity_id: '123',
        ip_address: mockIpAddress
      }));
    });

    it('should include diff in audit log', async () => {
      const mockData = { patient_id: '456', status: 'ORDERED' };
      const mockLabOrder = { id: '123', ...mockData };
      labOrderRepository.create.mockResolvedValue(mockLabOrder);

      await labOrderService.createLabOrder(mockData, mockUserId, mockIpAddress);

      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        diff: { after: mockLabOrder }
      }));
    });

    it('should not throw if audit log fails', async () => {
      const mockData = { patient_id: '456', status: 'ORDERED' };
      const mockLabOrder = { id: '123', ...mockData };
      labOrderRepository.create.mockResolvedValue(mockLabOrder);
      createAuditLog.mockReturnValue(Promise.reject(new Error('Audit failed')));

      const result = await labOrderService.createLabOrder(mockData, mockUserId, mockIpAddress);

      expect(result).toEqual(mockLabOrder);
    });

    it('should propagate repository errors', async () => {
      const repoError = new HttpError('errors.database.foreign_key_field', 400);
      labOrderRepository.create.mockRejectedValue(repoError);

      await expect(
        labOrderService.createLabOrder({}, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('updateLabOrder', () => {
    it('should update lab order and log audit', async () => {
      const mockBefore = { id: '123', patient_id: '456', status: 'ORDERED' };
      const mockAfter = { id: '123', patient_id: '456', status: 'COMPLETED' };
      labOrderRepository.findById.mockResolvedValue(mockBefore);
      labOrderRepository.update.mockResolvedValue(mockAfter);

      const result = await labOrderService.updateLabOrder('123', { status: 'COMPLETED' }, mockUserId, mockIpAddress);

      expect(result).toEqual(mockAfter);
      expect(labOrderRepository.update).toHaveBeenCalledWith('123', { status: 'COMPLETED' });
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockUserId,
        action: 'UPDATE',
        entity: 'lab_order',
        entity_id: '123',
        diff: { before: mockBefore, after: mockAfter }
      }));
    });

    it('should throw HttpError if lab order not found', async () => {
      labOrderRepository.findById.mockResolvedValue(null);

      await expect(
        labOrderService.updateLabOrder('nonexistent', {}, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should not call update if lab order not found', async () => {
      labOrderRepository.findById.mockResolvedValue(null);

      try {
        await labOrderService.updateLabOrder('nonexistent', {}, mockUserId, mockIpAddress);
      } catch (error) {
        expect(labOrderRepository.update).not.toHaveBeenCalled();
      }
    });

    it('should not throw if audit log fails', async () => {
      const mockBefore = { id: '123', status: 'ORDERED' };
      const mockAfter = { id: '123', status: 'COMPLETED' };
      labOrderRepository.findById.mockResolvedValue(mockBefore);
      labOrderRepository.update.mockResolvedValue(mockAfter);
      createAuditLog.mockReturnValue(Promise.reject(new Error('Audit failed')));

      const result = await labOrderService.updateLabOrder('123', { status: 'COMPLETED' }, mockUserId, mockIpAddress);

      expect(result).toEqual(mockAfter);
    });
  });

  describe('deleteLabOrder', () => {
    it('should soft delete lab order and log audit', async () => {
      const mockLabOrder = { id: '123', patient_id: '456', status: 'ORDERED' };
      const deletedLabOrder = { ...mockLabOrder, deleted_at: new Date() };
      labOrderRepository.findById.mockResolvedValue(mockLabOrder);
      labOrderRepository.softDelete.mockResolvedValue(deletedLabOrder);

      const result = await labOrderService.deleteLabOrder('123', mockUserId, mockIpAddress);

      expect(result).toEqual(deletedLabOrder);
      expect(labOrderRepository.softDelete).toHaveBeenCalledWith('123');
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockUserId,
        action: 'DELETE',
        entity: 'lab_order',
        entity_id: '123'
      }));
    });

    it('should include before and after in diff', async () => {
      const mockLabOrder = { id: '123', status: 'ORDERED' };
      const deletedLabOrder = { ...mockLabOrder, deleted_at: new Date() };
      labOrderRepository.findById.mockResolvedValue(mockLabOrder);
      labOrderRepository.softDelete.mockResolvedValue(deletedLabOrder);

      await labOrderService.deleteLabOrder('123', mockUserId, mockIpAddress);

      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        diff: { before: mockLabOrder, after: deletedLabOrder }
      }));
    });

    it('should throw HttpError if lab order not found', async () => {
      labOrderRepository.findById.mockResolvedValue(null);

      await expect(
        labOrderService.deleteLabOrder('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should not call softDelete if lab order not found', async () => {
      labOrderRepository.findById.mockResolvedValue(null);

      try {
        await labOrderService.deleteLabOrder('nonexistent', mockUserId, mockIpAddress);
      } catch (error) {
        expect(labOrderRepository.softDelete).not.toHaveBeenCalled();
      }
    });

    it('should not throw if audit log fails', async () => {
      const mockLabOrder = { id: '123', status: 'ORDERED' };
      const deletedLabOrder = { ...mockLabOrder, deleted_at: new Date() };
      labOrderRepository.findById.mockResolvedValue(mockLabOrder);
      labOrderRepository.softDelete.mockResolvedValue(deletedLabOrder);
      createAuditLog.mockReturnValue(Promise.reject(new Error('Audit failed')));

      const result = await labOrderService.deleteLabOrder('123', mockUserId, mockIpAddress);

      expect(result).toEqual(deletedLabOrder);
    });
  });
});
