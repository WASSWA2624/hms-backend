/**
 * Critical Alert service tests
 *
 * @module tests/modules/critical-alert/services
 * @description Tests for critical alert service operations
 * Per testing.mdc: Service tests must mock repository and audit functions
 */

const criticalAlertService = require('@services/critical-alert/critical-alert.service');
const criticalAlertRepository = require('@repositories/critical-alert/critical-alert.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

jest.mock('@repositories/critical-alert/critical-alert.repository');
jest.mock('@lib/audit');

describe('Critical Alert Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockResolvedValue({});
  });

  describe('listCriticalAlerts', () => {
    it('should list critical alerts with pagination', async () => {
      const mockAlerts = [{ id: '1', icu_stay_id: '100', severity: 'CRITICAL' }];
      criticalAlertRepository.findMany.mockResolvedValue(mockAlerts);
      criticalAlertRepository.count.mockResolvedValue(1);

      const result = await criticalAlertService.listCriticalAlerts({}, 1, 20, 'created_at', 'desc', 'user1', '127.0.0.1');

      expect(result.critical_alerts).toEqual(mockAlerts);
      expect(result.pagination.total).toBe(1);
    });

    it('should apply severity filter', async () => {
      criticalAlertRepository.findMany.mockResolvedValue([]);
      criticalAlertRepository.count.mockResolvedValue(0);

      await criticalAlertService.listCriticalAlerts(
        { severity: 'CRITICAL' },
        1, 20, 'created_at', 'desc', 'user1', '127.0.0.1'
      );

      const callArgs = criticalAlertRepository.findMany.mock.calls[0][0];
      expect(callArgs.severity).toBe('CRITICAL');
    });

    it('should apply search filter', async () => {
      criticalAlertRepository.findMany.mockResolvedValue([]);
      criticalAlertRepository.count.mockResolvedValue(0);

      await criticalAlertService.listCriticalAlerts(
        { search: 'heart rate' },
        1, 20, 'created_at', 'desc', 'user1', '127.0.0.1'
      );

      const callArgs = criticalAlertRepository.findMany.mock.calls[0][0];
      expect(callArgs.message).toEqual({ contains: 'heart rate' });
    });
  });

  describe('getCriticalAlertById', () => {
    it('should get critical alert by id', async () => {
      const mockAlert = { id: '123', icu_stay_id: '456', severity: 'HIGH' };
      criticalAlertRepository.findById.mockResolvedValue(mockAlert);

      const result = await criticalAlertService.getCriticalAlertById('123', 'user1', '127.0.0.1');

      expect(result).toEqual(mockAlert);
    });

    it('should throw HttpError if critical alert not found', async () => {
      criticalAlertRepository.findById.mockResolvedValue(null);

      await expect(
        criticalAlertService.getCriticalAlertById('nonexistent', 'user1', '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createCriticalAlert', () => {
    it('should create critical alert and audit log', async () => {
      const mockData = { icu_stay_id: '123', severity: 'CRITICAL', message: 'Test' };
      const mockAlert = { id: '456', ...mockData };
      criticalAlertRepository.create.mockResolvedValue(mockAlert);

      const result = await criticalAlertService.createCriticalAlert(mockData, 'user1', '127.0.0.1');

      expect(result).toEqual(mockAlert);
      expect(createAuditLog).toHaveBeenCalled();
    });
  });

  describe('updateCriticalAlert', () => {
    it('should update critical alert and audit log', async () => {
      const before = { id: '123', severity: 'HIGH', message: 'Old' };
      const after = { id: '123', severity: 'CRITICAL', message: 'New' };
      criticalAlertRepository.findById.mockResolvedValue(before);
      criticalAlertRepository.update.mockResolvedValue(after);

      const result = await criticalAlertService.updateCriticalAlert('123', { severity: 'CRITICAL' }, 'user1', '127.0.0.1');

      expect(result).toEqual(after);
      expect(createAuditLog).toHaveBeenCalled();
    });
  });

  describe('deleteCriticalAlert', () => {
    it('should delete critical alert and audit log', async () => {
      const before = { id: '123', severity: 'CRITICAL', message: 'Test' };
      criticalAlertRepository.findById.mockResolvedValue(before);
      criticalAlertRepository.softDelete.mockResolvedValue({});

      await criticalAlertService.deleteCriticalAlert('123', 'user1', '127.0.0.1');

      expect(criticalAlertRepository.softDelete).toHaveBeenCalledWith('123');
      expect(createAuditLog).toHaveBeenCalled();
    });
  });
});
