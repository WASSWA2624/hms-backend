/**
 * Lab QC log service tests
 */

const labQcLogService = require('@services/lab-qc-log/lab-qc-log.service');
const labQcLogRepository = require('@repositories/lab-qc-log/lab-qc-log.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

jest.mock('@repositories/lab-qc-log/lab-qc-log.repository');
jest.mock('@lib/audit');

describe('Lab QC Log Service', () => {
  const mockUserId = 'user-123';
  const mockIpAddress = '127.0.0.1';

  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockReturnValue(Promise.resolve());
  });

  describe('listLabQcLogs', () => {
    it('should list lab QC logs with pagination', async () => {
      const mockLabQcLogs = [{ id: '1', lab_test_id: '456', status: 'Passed' }];
      labQcLogRepository.findMany.mockResolvedValue(mockLabQcLogs);
      labQcLogRepository.count.mockResolvedValue(1);

      const result = await labQcLogService.listLabQcLogs({}, 1, 20, 'created_at', 'desc', mockUserId, mockIpAddress);

      expect(result.labQcLogs).toEqual(mockLabQcLogs);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getLabQcLogById', () => {
    it('should get lab QC log by id', async () => {
      const mockLabQcLog = { id: '123', lab_test_id: '456', status: 'Passed' };
      labQcLogRepository.findById.mockResolvedValue(mockLabQcLog);

      const result = await labQcLogService.getLabQcLogById('123', mockUserId, mockIpAddress);

      expect(result).toEqual(mockLabQcLog);
    });

    it('should throw HttpError if not found', async () => {
      labQcLogRepository.findById.mockResolvedValue(null);

      await expect(
        labQcLogService.getLabQcLogById('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow('errors.lab_qc_log.not_found');
    });
  });

  describe('createLabQcLog', () => {
    it('should create lab QC log and log audit', async () => {
      const mockData = { lab_test_id: '456', status: 'Passed' };
      const mockLabQcLog = { id: '123', ...mockData };
      labQcLogRepository.create.mockResolvedValue(mockLabQcLog);

      const result = await labQcLogService.createLabQcLog(mockData, mockUserId, mockIpAddress);

      expect(result).toEqual(mockLabQcLog);
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockUserId,
        action: 'CREATE',
        entity: 'lab_qc_log'
      }));
    });
  });

  describe('updateLabQcLog', () => {
    it('should update lab QC log and log audit', async () => {
      const mockBefore = { id: '123', status: 'Passed' };
      const mockAfter = { id: '123', status: 'Failed' };
      labQcLogRepository.findById.mockResolvedValue(mockBefore);
      labQcLogRepository.update.mockResolvedValue(mockAfter);

      const result = await labQcLogService.updateLabQcLog('123', { status: 'Failed' }, mockUserId, mockIpAddress);

      expect(result).toEqual(mockAfter);
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'UPDATE',
        diff: { before: mockBefore, after: mockAfter }
      }));
    });

    it('should throw HttpError if not found', async () => {
      labQcLogRepository.findById.mockResolvedValue(null);

      await expect(
        labQcLogService.updateLabQcLog('nonexistent', {}, mockUserId, mockIpAddress)
      ).rejects.toThrow('errors.lab_qc_log.not_found');
    });
  });

  describe('deleteLabQcLog', () => {
    it('should soft delete lab QC log and log audit', async () => {
      const mockBefore = { id: '123', status: 'Passed' };
      labQcLogRepository.findById.mockResolvedValue(mockBefore);
      labQcLogRepository.softDelete.mockResolvedValue({ ...mockBefore, deleted_at: new Date() });

      await labQcLogService.deleteLabQcLog('123', mockUserId, mockIpAddress);

      expect(labQcLogRepository.softDelete).toHaveBeenCalledWith('123');
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'DELETE',
        entity: 'lab_qc_log'
      }));
    });
  });
});
