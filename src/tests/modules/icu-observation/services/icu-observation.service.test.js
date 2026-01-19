/**
 * ICU Observation service tests
 *
 * @module tests/modules/icu-observation/services
 * @description Tests for ICU observation service operations
 * Per testing.mdc: Service tests must mock repository and audit functions
 */

const icuObservationService = require('@services/icu-observation/icu-observation.service');
const icuObservationRepository = require('@repositories/icu-observation/icu-observation.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

jest.mock('@repositories/icu-observation/icu-observation.repository');
jest.mock('@lib/audit');

describe('ICU Observation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockResolvedValue({});
  });

  describe('listIcuObservations', () => {
    it('should list ICU observations with pagination', async () => {
      const mockObservations = [{ id: '1', icu_stay_id: '100' }];
      icuObservationRepository.findMany.mockResolvedValue(mockObservations);
      icuObservationRepository.count.mockResolvedValue(1);

      const result = await icuObservationService.listIcuObservations({}, 1, 20, 'created_at', 'desc', 'user1', '127.0.0.1');

      expect(result.icu_observations).toEqual(mockObservations);
      expect(result.pagination.total).toBe(1);
    });

    it('should apply search filter', async () => {
      icuObservationRepository.findMany.mockResolvedValue([]);
      icuObservationRepository.count.mockResolvedValue(0);

      await icuObservationService.listIcuObservations(
        { search: 'vital signs' },
        1, 20, 'created_at', 'desc', 'user1', '127.0.0.1'
      );

      const callArgs = icuObservationRepository.findMany.mock.calls[0][0];
      expect(callArgs.observation).toEqual({ contains: 'vital signs' });
    });
  });

  describe('getIcuObservationById', () => {
    it('should get ICU observation by id', async () => {
      const mockObservation = { id: '123', icu_stay_id: '456' };
      icuObservationRepository.findById.mockResolvedValue(mockObservation);

      const result = await icuObservationService.getIcuObservationById('123', 'user1', '127.0.0.1');

      expect(result).toEqual(mockObservation);
    });

    it('should throw HttpError if ICU observation not found', async () => {
      icuObservationRepository.findById.mockResolvedValue(null);

      await expect(
        icuObservationService.getIcuObservationById('nonexistent', 'user1', '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createIcuObservation', () => {
    it('should create ICU observation and audit log', async () => {
      const mockData = { icu_stay_id: '123', observation: 'Test' };
      const mockObservation = { id: '456', ...mockData };
      icuObservationRepository.create.mockResolvedValue(mockObservation);

      const result = await icuObservationService.createIcuObservation(mockData, 'user1', '127.0.0.1');

      expect(result).toEqual(mockObservation);
      expect(createAuditLog).toHaveBeenCalled();
    });
  });

  describe('updateIcuObservation', () => {
    it('should update ICU observation and audit log', async () => {
      const before = { id: '123', observation: 'Old' };
      const after = { id: '123', observation: 'New' };
      icuObservationRepository.findById.mockResolvedValue(before);
      icuObservationRepository.update.mockResolvedValue(after);

      const result = await icuObservationService.updateIcuObservation('123', { observation: 'New' }, 'user1', '127.0.0.1');

      expect(result).toEqual(after);
      expect(createAuditLog).toHaveBeenCalled();
    });
  });

  describe('deleteIcuObservation', () => {
    it('should delete ICU observation and audit log', async () => {
      const before = { id: '123', observation: 'Test' };
      icuObservationRepository.findById.mockResolvedValue(before);
      icuObservationRepository.softDelete.mockResolvedValue({});

      await icuObservationService.deleteIcuObservation('123', 'user1', '127.0.0.1');

      expect(icuObservationRepository.softDelete).toHaveBeenCalledWith('123');
      expect(createAuditLog).toHaveBeenCalled();
    });
  });
});
