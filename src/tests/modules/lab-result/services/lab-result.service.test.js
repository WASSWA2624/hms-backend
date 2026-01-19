/**
 * Lab result service tests
 */

const labResultService = require('@services/lab-result/lab-result.service');
const labResultRepository = require('@repositories/lab-result/lab-result.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

jest.mock('@repositories/lab-result/lab-result.repository');
jest.mock('@lib/audit');

describe('Lab Result Service', () => {
  const mockUserId = 'user-123';
  const mockIpAddress = '127.0.0.1';

  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockReturnValue(Promise.resolve());
  });

  describe('listLabResults', () => {
    it('should list lab results with pagination', async () => {
      const mockLabResults = [{ id: '1', lab_order_item_id: '456', status: 'PENDING' }];
      labResultRepository.findMany.mockResolvedValue(mockLabResults);
      labResultRepository.count.mockResolvedValue(1);

      const result = await labResultService.listLabResults({}, 1, 20, 'created_at', 'desc', mockUserId, mockIpAddress);

      expect(result.labResults).toEqual(mockLabResults);
      expect(result.pagination.total).toBe(1);
      expect(labResultRepository.findMany).toHaveBeenCalled();
      expect(labResultRepository.count).toHaveBeenCalled();
    });

    it('should handle lab_order_item_id filter', async () => {
      labResultRepository.findMany.mockResolvedValue([]);
      labResultRepository.count.mockResolvedValue(0);

      await labResultService.listLabResults({ lab_order_item_id: '456' }, 1, 20, null, 'asc', mockUserId, mockIpAddress);

      expect(labResultRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ lab_order_item_id: '456' }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('getLabResultById', () => {
    it('should get lab result by id', async () => {
      const mockLabResult = { id: '123', lab_order_item_id: '456', status: 'PENDING' };
      labResultRepository.findById.mockResolvedValue(mockLabResult);

      const result = await labResultService.getLabResultById('123', mockUserId, mockIpAddress);

      expect(result).toEqual(mockLabResult);
    });

    it('should throw HttpError if not found', async () => {
      labResultRepository.findById.mockResolvedValue(null);

      await expect(
        labResultService.getLabResultById('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow('errors.lab_result.not_found');
    });
  });

  describe('createLabResult', () => {
    it('should create lab result and log audit', async () => {
      const mockData = { lab_order_item_id: '456', status: 'PENDING' };
      const mockLabResult = { id: '123', ...mockData };
      labResultRepository.create.mockResolvedValue(mockLabResult);

      const result = await labResultService.createLabResult(mockData, mockUserId, mockIpAddress);

      expect(result).toEqual(mockLabResult);
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockUserId,
        action: 'CREATE',
        entity: 'lab_result'
      }));
    });
  });

  describe('updateLabResult', () => {
    it('should update lab result and log audit', async () => {
      const mockBefore = { id: '123', status: 'PENDING' };
      const mockAfter = { id: '123', status: 'NORMAL' };
      labResultRepository.findById.mockResolvedValue(mockBefore);
      labResultRepository.update.mockResolvedValue(mockAfter);

      const result = await labResultService.updateLabResult('123', { status: 'NORMAL' }, mockUserId, mockIpAddress);

      expect(result).toEqual(mockAfter);
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'UPDATE',
        diff: { before: mockBefore, after: mockAfter }
      }));
    });

    it('should throw HttpError if not found', async () => {
      labResultRepository.findById.mockResolvedValue(null);

      await expect(
        labResultService.updateLabResult('nonexistent', {}, mockUserId, mockIpAddress)
      ).rejects.toThrow('errors.lab_result.not_found');
    });
  });

  describe('deleteLabResult', () => {
    it('should soft delete lab result and log audit', async () => {
      const mockBefore = { id: '123', status: 'PENDING' };
      labResultRepository.findById.mockResolvedValue(mockBefore);
      labResultRepository.softDelete.mockResolvedValue({ ...mockBefore, deleted_at: new Date() });

      await labResultService.deleteLabResult('123', mockUserId, mockIpAddress);

      expect(labResultRepository.softDelete).toHaveBeenCalledWith('123');
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'DELETE',
        entity: 'lab_result'
      }));
    });

    it('should throw HttpError if not found', async () => {
      labResultRepository.findById.mockResolvedValue(null);

      await expect(
        labResultService.deleteLabResult('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow('errors.lab_result.not_found');
    });
  });
});
