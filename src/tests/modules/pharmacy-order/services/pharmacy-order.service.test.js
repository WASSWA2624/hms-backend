/**
 * Pharmacy order service tests
 *
 * @module tests/modules/pharmacy-order/services
 * @description Tests for pharmacy order service business logic
 * Per testing.mdc: Service tests must mock repository and audit functions
 */

const pharmacyOrderService = require('@services/pharmacy-order/pharmacy-order.service');
const pharmacyOrderRepository = require('@repositories/pharmacy-order/pharmacy-order.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/pharmacy-order/pharmacy-order.repository');
jest.mock('@lib/audit');

describe('Pharmacy Order Service', () => {
  const mockUserId = 'user-123';
  const mockIpAddress = '127.0.0.1';

  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockReturnValue(Promise.resolve());
  });

  describe('listPharmacyOrders', () => {
    it('should list pharmacy orders with pagination', async () => {
      const mockPharmacyOrders = [
        { 
          id: 'order-1', 
          patient_id: 'patient-123', 
          status: 'ORDERED',
          ordered_at: new Date('2026-01-19T12:00:00.000Z')
        }
      ];
      pharmacyOrderRepository.findMany.mockResolvedValue(mockPharmacyOrders);
      pharmacyOrderRepository.count.mockResolvedValue(1);

      const result = await pharmacyOrderService.listPharmacyOrders(
        {}, 
        1, 
        20, 
        'ordered_at', 
        'desc', 
        mockUserId, 
        mockIpAddress
      );

      expect(result.pharmacyOrders).toEqual(mockPharmacyOrders);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(pharmacyOrderRepository.findMany).toHaveBeenCalled();
      expect(pharmacyOrderRepository.count).toHaveBeenCalled();
    });

    it('should handle patient_id filter', async () => {
      pharmacyOrderRepository.findMany.mockResolvedValue([]);
      pharmacyOrderRepository.count.mockResolvedValue(0);

      await pharmacyOrderService.listPharmacyOrders(
        { patient_id: 'patient-123' }, 
        1, 
        20, 
        null, 
        'asc', 
        mockUserId, 
        mockIpAddress
      );

      expect(pharmacyOrderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ patient_id: 'patient-123' }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should handle encounter_id filter', async () => {
      pharmacyOrderRepository.findMany.mockResolvedValue([]);
      pharmacyOrderRepository.count.mockResolvedValue(0);

      await pharmacyOrderService.listPharmacyOrders(
        { encounter_id: 'encounter-123' }, 
        1, 
        20, 
        null, 
        'asc', 
        mockUserId, 
        mockIpAddress
      );

      expect(pharmacyOrderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ encounter_id: 'encounter-123' }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should handle status filter', async () => {
      pharmacyOrderRepository.findMany.mockResolvedValue([]);
      pharmacyOrderRepository.count.mockResolvedValue(0);

      await pharmacyOrderService.listPharmacyOrders(
        { status: 'DISPENSED' }, 
        1, 
        20, 
        null, 
        'asc', 
        mockUserId, 
        mockIpAddress
      );

      expect(pharmacyOrderRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'DISPENSED' }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should handle date range filters', async () => {
      pharmacyOrderRepository.findMany.mockResolvedValue([]);
      pharmacyOrderRepository.count.mockResolvedValue(0);

      await pharmacyOrderService.listPharmacyOrders(
        { 
          ordered_at_from: '2026-01-01T00:00:00.000Z',
          ordered_at_to: '2026-12-31T23:59:59.999Z'
        }, 
        1, 
        20, 
        null, 
        'asc', 
        mockUserId, 
        mockIpAddress
      );

      expect(pharmacyOrderRepository.findMany).toHaveBeenCalledWith(
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

    it('should calculate pagination correctly', async () => {
      pharmacyOrderRepository.findMany.mockResolvedValue([]);
      pharmacyOrderRepository.count.mockResolvedValue(45);

      const result = await pharmacyOrderService.listPharmacyOrders(
        {}, 
        2, 
        20, 
        null, 
        'desc', 
        mockUserId, 
        mockIpAddress
      );

      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });
  });

  describe('getPharmacyOrderById', () => {
    it('should get pharmacy order by id', async () => {
      const mockPharmacyOrder = { 
        id: '123', 
        patient_id: 'patient-123',
        status: 'ORDERED'
      };
      pharmacyOrderRepository.findById.mockResolvedValue(mockPharmacyOrder);

      const result = await pharmacyOrderService.getPharmacyOrderById(
        '123', 
        mockUserId, 
        mockIpAddress
      );

      expect(result).toEqual(mockPharmacyOrder);
      expect(pharmacyOrderRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw HttpError if pharmacy order not found', async () => {
      pharmacyOrderRepository.findById.mockResolvedValue(null);

      await expect(
        pharmacyOrderService.getPharmacyOrderById('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createPharmacyOrder', () => {
    it('should create pharmacy order and log audit', async () => {
      const mockData = { 
        patient_id: 'patient-123',
        encounter_id: 'encounter-123',
        status: 'ORDERED'
      };
      const mockPharmacyOrder = { 
        id: 'order-456', 
        ...mockData,
        ordered_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };
      pharmacyOrderRepository.create.mockResolvedValue(mockPharmacyOrder);

      const result = await pharmacyOrderService.createPharmacyOrder(
        mockData, 
        mockUserId, 
        mockIpAddress
      );

      expect(result).toEqual(mockPharmacyOrder);
      expect(pharmacyOrderRepository.create).toHaveBeenCalledWith(mockData);
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockUserId,
        action: 'CREATE',
        entity: 'pharmacy_order',
        entity_id: 'order-456',
        ip_address: mockIpAddress
      }));
    });

    it('should handle repository errors', async () => {
      const mockData = { patient_id: 'patient-123', status: 'ORDERED' };
      pharmacyOrderRepository.create.mockRejectedValue(new Error('DB error'));

      await expect(
        pharmacyOrderService.createPharmacyOrder(mockData, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('updatePharmacyOrder', () => {
    it('should update pharmacy order and log audit', async () => {
      const mockBefore = { 
        id: '123', 
        patient_id: 'patient-123',
        status: 'ORDERED'
      };
      const mockAfter = { 
        id: '123', 
        patient_id: 'patient-123',
        status: 'DISPENSED'
      };
      pharmacyOrderRepository.findById.mockResolvedValue(mockBefore);
      pharmacyOrderRepository.update.mockResolvedValue(mockAfter);

      const result = await pharmacyOrderService.updatePharmacyOrder(
        '123', 
        { status: 'DISPENSED' }, 
        mockUserId, 
        mockIpAddress
      );

      expect(result).toEqual(mockAfter);
      expect(pharmacyOrderRepository.findById).toHaveBeenCalledWith('123');
      expect(pharmacyOrderRepository.update).toHaveBeenCalledWith('123', { status: 'DISPENSED' });
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockUserId,
        action: 'UPDATE',
        entity: 'pharmacy_order',
        entity_id: '123',
        diff: { before: mockBefore, after: mockAfter },
        ip_address: mockIpAddress
      }));
    });

    it('should throw HttpError if pharmacy order not found before update', async () => {
      pharmacyOrderRepository.findById.mockResolvedValue(null);

      await expect(
        pharmacyOrderService.updatePharmacyOrder('nonexistent', {}, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should handle repository errors', async () => {
      const mockBefore = { id: '123', status: 'ORDERED' };
      pharmacyOrderRepository.findById.mockResolvedValue(mockBefore);
      pharmacyOrderRepository.update.mockRejectedValue(new Error('DB error'));

      await expect(
        pharmacyOrderService.updatePharmacyOrder('123', { status: 'DISPENSED' }, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('deletePharmacyOrder', () => {
    it('should soft delete pharmacy order and log audit', async () => {
      const mockPharmacyOrder = { 
        id: '123', 
        patient_id: 'patient-123',
        status: 'ORDERED'
      };
      pharmacyOrderRepository.findById.mockResolvedValue(mockPharmacyOrder);
      pharmacyOrderRepository.softDelete.mockResolvedValue({ 
        ...mockPharmacyOrder, 
        deleted_at: new Date() 
      });

      await pharmacyOrderService.deletePharmacyOrder('123', mockUserId, mockIpAddress);

      expect(pharmacyOrderRepository.findById).toHaveBeenCalledWith('123');
      expect(pharmacyOrderRepository.softDelete).toHaveBeenCalledWith('123');
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockUserId,
        action: 'DELETE',
        entity: 'pharmacy_order',
        entity_id: '123',
        ip_address: mockIpAddress
      }));
    });

    it('should throw HttpError if pharmacy order not found', async () => {
      pharmacyOrderRepository.findById.mockResolvedValue(null);

      await expect(
        pharmacyOrderService.deletePharmacyOrder('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should handle repository errors', async () => {
      const mockPharmacyOrder = { id: '123', status: 'ORDERED' };
      pharmacyOrderRepository.findById.mockResolvedValue(mockPharmacyOrder);
      pharmacyOrderRepository.softDelete.mockRejectedValue(new Error('DB error'));

      await expect(
        pharmacyOrderService.deletePharmacyOrder('123', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });
});
