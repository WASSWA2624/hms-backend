/**
 * Lab sample service tests
 *
 * @module tests/modules/lab-sample/services
 * @description Tests for lab sample service business logic
 * Per testing.mdc: Service tests must mock repository and audit functions
 */

const labSampleService = require('@services/lab-sample/lab-sample.service');
const labSampleRepository = require('@repositories/lab-sample/lab-sample.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/lab-sample/lab-sample.repository');
jest.mock('@lib/audit');

describe('Lab Sample Service', () => {
  const mockUserId = 'user-123';
  const mockIpAddress = '127.0.0.1';

  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockReturnValue(Promise.resolve());
  });

  describe('listLabSamples', () => {
    it('should list lab samples with pagination', async () => {
      const mockLabSamples = [
        { id: '1', lab_order_id: '456', status: 'PENDING' }
      ];
      labSampleRepository.findMany.mockResolvedValue(mockLabSamples);
      labSampleRepository.count.mockResolvedValue(1);

      const result = await labSampleService.listLabSamples(
        {}, 1, 20, 'created_at', 'desc', mockUserId, mockIpAddress
      );

      expect(result.labSamples).toEqual(mockLabSamples);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(labSampleRepository.findMany).toHaveBeenCalled();
      expect(labSampleRepository.count).toHaveBeenCalled();
    });

    it('should handle lab_order_id filter', async () => {
      labSampleRepository.findMany.mockResolvedValue([]);
      labSampleRepository.count.mockResolvedValue(0);

      await labSampleService.listLabSamples(
        { lab_order_id: '456' }, 1, 20, null, 'asc', mockUserId, mockIpAddress
      );

      expect(labSampleRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ lab_order_id: '456' }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should handle status filter', async () => {
      labSampleRepository.findMany.mockResolvedValue([]);
      labSampleRepository.count.mockResolvedValue(0);

      await labSampleService.listLabSamples(
        { status: 'PENDING' }, 1, 20, null, 'asc', mockUserId, mockIpAddress
      );

      expect(labSampleRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING' }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should calculate pagination correctly', async () => {
      labSampleRepository.findMany.mockResolvedValue([]);
      labSampleRepository.count.mockResolvedValue(25);

      const result = await labSampleService.listLabSamples(
        {}, 2, 10, null, 'asc', mockUserId, mockIpAddress
      );

      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });

    it('should throw HttpError on repository error', async () => {
      labSampleRepository.findMany.mockRejectedValue(new Error('DB Error'));

      await expect(
        labSampleService.listLabSamples({}, 1, 20, null, 'asc', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('getLabSampleById', () => {
    it('should get lab sample by id', async () => {
      const mockLabSample = {
        id: '123',
        lab_order_id: '456',
        status: 'PENDING'
      };
      labSampleRepository.findById.mockResolvedValue(mockLabSample);

      const result = await labSampleService.getLabSampleById('123', mockUserId, mockIpAddress);

      expect(result).toEqual(mockLabSample);
      expect(labSampleRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw HttpError if lab sample not found', async () => {
      labSampleRepository.findById.mockResolvedValue(null);

      await expect(
        labSampleService.getLabSampleById('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
      await expect(
        labSampleService.getLabSampleById('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow('errors.lab_sample.not_found');
    });

    it('should throw HttpError on repository error', async () => {
      labSampleRepository.findById.mockRejectedValue(new Error('DB Error'));

      await expect(
        labSampleService.getLabSampleById('123', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createLabSample', () => {
    it('should create lab sample and log audit', async () => {
      const mockData = {
        lab_order_id: '456',
        status: 'PENDING',
        collected_at: null,
        received_at: null
      };
      const mockLabSample = { id: '123', ...mockData };
      labSampleRepository.create.mockResolvedValue(mockLabSample);

      const result = await labSampleService.createLabSample(mockData, mockUserId, mockIpAddress);

      expect(result).toEqual(mockLabSample);
      expect(labSampleRepository.create).toHaveBeenCalledWith(mockData);
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockUserId,
        action: 'CREATE',
        entity: 'lab_sample',
        entity_id: '123',
        ip_address: mockIpAddress
      }));
    });

    it('should create lab sample even if audit fails', async () => {
      const mockData = { lab_order_id: '456', status: 'PENDING' };
      const mockLabSample = { id: '123', ...mockData };
      labSampleRepository.create.mockResolvedValue(mockLabSample);
      createAuditLog.mockReturnValue(Promise.reject(new Error('Audit failed')));

      const result = await labSampleService.createLabSample(mockData, mockUserId, mockIpAddress);

      expect(result).toEqual(mockLabSample);
    });

    it('should propagate HttpError from repository', async () => {
      const httpError = new HttpError('errors.database.foreign_key_field', 400);
      labSampleRepository.create.mockRejectedValue(httpError);

      await expect(
        labSampleService.createLabSample({}, mockUserId, mockIpAddress)
      ).rejects.toThrow(httpError);
    });
  });

  describe('updateLabSample', () => {
    it('should update lab sample and log audit', async () => {
      const mockBefore = { id: '123', status: 'PENDING' };
      const mockAfter = { id: '123', status: 'COLLECTED' };
      labSampleRepository.findById.mockResolvedValue(mockBefore);
      labSampleRepository.update.mockResolvedValue(mockAfter);

      const result = await labSampleService.updateLabSample(
        '123', { status: 'COLLECTED' }, mockUserId, mockIpAddress
      );

      expect(result).toEqual(mockAfter);
      expect(labSampleRepository.findById).toHaveBeenCalledWith('123');
      expect(labSampleRepository.update).toHaveBeenCalledWith('123', { status: 'COLLECTED' });
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'UPDATE',
        entity: 'lab_sample',
        diff: { before: mockBefore, after: mockAfter }
      }));
    });

    it('should throw HttpError if lab sample not found', async () => {
      labSampleRepository.findById.mockResolvedValue(null);

      await expect(
        labSampleService.updateLabSample('nonexistent', {}, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
      await expect(
        labSampleService.updateLabSample('nonexistent', {}, mockUserId, mockIpAddress)
      ).rejects.toThrow('errors.lab_sample.not_found');
    });

    it('should update lab sample even if audit fails', async () => {
      const mockBefore = { id: '123', status: 'PENDING' };
      const mockAfter = { id: '123', status: 'COLLECTED' };
      labSampleRepository.findById.mockResolvedValue(mockBefore);
      labSampleRepository.update.mockResolvedValue(mockAfter);
      createAuditLog.mockReturnValue(Promise.reject(new Error('Audit failed')));

      const result = await labSampleService.updateLabSample(
        '123', { status: 'COLLECTED' }, mockUserId, mockIpAddress
      );

      expect(result).toEqual(mockAfter);
    });
  });

  describe('deleteLabSample', () => {
    it('should soft delete lab sample and log audit', async () => {
      const mockBefore = { id: '123', status: 'PENDING' };
      labSampleRepository.findById.mockResolvedValue(mockBefore);
      labSampleRepository.softDelete.mockResolvedValue({ ...mockBefore, deleted_at: new Date() });

      await labSampleService.deleteLabSample('123', mockUserId, mockIpAddress);

      expect(labSampleRepository.findById).toHaveBeenCalledWith('123');
      expect(labSampleRepository.softDelete).toHaveBeenCalledWith('123');
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'DELETE',
        entity: 'lab_sample',
        entity_id: '123',
        diff: { before: mockBefore }
      }));
    });

    it('should throw HttpError if lab sample not found', async () => {
      labSampleRepository.findById.mockResolvedValue(null);

      await expect(
        labSampleService.deleteLabSample('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
      await expect(
        labSampleService.deleteLabSample('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow('errors.lab_sample.not_found');
    });

    it('should delete lab sample even if audit fails', async () => {
      const mockBefore = { id: '123', status: 'PENDING' };
      labSampleRepository.findById.mockResolvedValue(mockBefore);
      labSampleRepository.softDelete.mockResolvedValue({ ...mockBefore, deleted_at: new Date() });
      createAuditLog.mockReturnValue(Promise.reject(new Error('Audit failed')));

      await expect(
        labSampleService.deleteLabSample('123', mockUserId, mockIpAddress)
      ).resolves.not.toThrow();
    });
  });
});
