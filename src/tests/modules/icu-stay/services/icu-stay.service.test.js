/**
 * ICU Stay service tests
 *
 * @module tests/modules/icu-stay/services
 * @description Tests for ICU stay service operations
 * Per testing.mdc: Service tests must mock repository and audit functions
 */

const icuStayService = require('@services/icu-stay/icu-stay.service');
const icuStayRepository = require('@repositories/icu-stay/icu-stay.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock repository and audit
jest.mock('@repositories/icu-stay/icu-stay.repository');
jest.mock('@lib/audit');

describe('ICU Stay Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockResolvedValue({});
  });

  describe('listIcuStays', () => {
    it('should list ICU stays with pagination', async () => {
      const mockIcuStays = [
        { id: '1', admission_id: '100' },
        { id: '2', admission_id: '200' }
      ];
      icuStayRepository.findMany.mockResolvedValue(mockIcuStays);
      icuStayRepository.count.mockResolvedValue(2);

      const result = await icuStayService.listIcuStays({}, 1, 20, 'created_at', 'desc', 'user1', '127.0.0.1');

      expect(result.icu_stays).toEqual(mockIcuStays);
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1
      });
    });

    it('should apply admission_id filter', async () => {
      icuStayRepository.findMany.mockResolvedValue([]);
      icuStayRepository.count.mockResolvedValue(0);

      await icuStayService.listIcuStays(
        { admission_id: '123' },
        1, 20, 'created_at', 'desc', 'user1', '127.0.0.1'
      );

      expect(icuStayRepository.findMany).toHaveBeenCalledWith(
        { admission_id: '123' },
        0, 20,
        { created_at: 'desc' }
      );
    });

    it('should apply started_at date range filter', async () => {
      icuStayRepository.findMany.mockResolvedValue([]);
      icuStayRepository.count.mockResolvedValue(0);

      await icuStayService.listIcuStays(
        { 
          started_at_from: '2024-01-01T00:00:00.000Z',
          started_at_to: '2024-01-31T23:59:59.999Z'
        },
        1, 20, 'created_at', 'desc', 'user1', '127.0.0.1'
      );

      const callArgs = icuStayRepository.findMany.mock.calls[0][0];
      expect(callArgs.started_at).toBeDefined();
      expect(callArgs.started_at.gte).toBeInstanceOf(Date);
      expect(callArgs.started_at.lte).toBeInstanceOf(Date);
    });

    it('should filter active ICU stays (ended_at is null)', async () => {
      icuStayRepository.findMany.mockResolvedValue([]);
      icuStayRepository.count.mockResolvedValue(0);

      await icuStayService.listIcuStays(
        { is_active: true },
        1, 20, 'created_at', 'desc', 'user1', '127.0.0.1'
      );

      const callArgs = icuStayRepository.findMany.mock.calls[0][0];
      expect(callArgs.ended_at).toBeNull();
    });

    it('should filter inactive ICU stays (ended_at is not null)', async () => {
      icuStayRepository.findMany.mockResolvedValue([]);
      icuStayRepository.count.mockResolvedValue(0);

      await icuStayService.listIcuStays(
        { is_active: false },
        1, 20, 'created_at', 'desc', 'user1', '127.0.0.1'
      );

      const callArgs = icuStayRepository.findMany.mock.calls[0][0];
      expect(callArgs.ended_at).toEqual({ not: null });
    });

    it('should throw HttpError on repository error', async () => {
      icuStayRepository.findMany.mockRejectedValue(new Error('DB Error'));

      await expect(
        icuStayService.listIcuStays({}, 1, 20, 'created_at', 'desc', 'user1', '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });
  });

  describe('getIcuStayById', () => {
    it('should get ICU stay by id', async () => {
      const mockIcuStay = { id: '123', admission_id: '456' };
      icuStayRepository.findById.mockResolvedValue(mockIcuStay);

      const result = await icuStayService.getIcuStayById('123', 'user1', '127.0.0.1');

      expect(result).toEqual(mockIcuStay);
      expect(icuStayRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw HttpError if ICU stay not found', async () => {
      icuStayRepository.findById.mockResolvedValue(null);

      await expect(
        icuStayService.getIcuStayById('nonexistent', 'user1', '127.0.0.1')
      ).rejects.toThrow(HttpError);
      await expect(
        icuStayService.getIcuStayById('nonexistent', 'user1', '127.0.0.1')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw HttpError on repository error', async () => {
      icuStayRepository.findById.mockRejectedValue(new Error('DB Error'));

      await expect(
        icuStayService.getIcuStayById('123', 'user1', '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createIcuStay', () => {
    it('should create ICU stay and audit log', async () => {
      const mockData = { admission_id: '123', started_at: new Date() };
      const mockIcuStay = { id: '456', ...mockData };
      icuStayRepository.create.mockResolvedValue(mockIcuStay);

      const result = await icuStayService.createIcuStay(mockData, 'user1', '127.0.0.1');

      expect(result).toEqual(mockIcuStay);
      expect(icuStayRepository.create).toHaveBeenCalledWith(mockData);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: 'user1',
        action: 'CREATE',
        entity: 'icu_stay',
        entity_id: '456',
        diff: { after: mockIcuStay },
        ip_address: '127.0.0.1'
      });
    });

    it('should not fail if audit log fails', async () => {
      const mockData = { admission_id: '123' };
      const mockIcuStay = { id: '456', ...mockData };
      icuStayRepository.create.mockResolvedValue(mockIcuStay);
      createAuditLog.mockRejectedValue(new Error('Audit failed'));

      const result = await icuStayService.createIcuStay(mockData, 'user1', '127.0.0.1');

      expect(result).toEqual(mockIcuStay);
    });

    it('should throw HttpError on repository error', async () => {
      icuStayRepository.create.mockRejectedValue(
        new HttpError('errors.database.foreign_key_field', 400)
      );

      await expect(
        icuStayService.createIcuStay({}, 'user1', '127.0.0.1')
      ).rejects.toThrow(HttpError);
    });
  });

  describe('updateIcuStay', () => {
    it('should update ICU stay and audit log', async () => {
      const before = { id: '123', admission_id: '456', ended_at: null };
      const after = { id: '123', admission_id: '456', ended_at: new Date() };
      icuStayRepository.findById.mockResolvedValue(before);
      icuStayRepository.update.mockResolvedValue(after);

      const result = await icuStayService.updateIcuStay('123', { ended_at: after.ended_at }, 'user1', '127.0.0.1');

      expect(result).toEqual(after);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: 'user1',
        action: 'UPDATE',
        entity: 'icu_stay',
        entity_id: '123',
        diff: { before, after },
        ip_address: '127.0.0.1'
      });
    });

    it('should throw HttpError if ICU stay not found', async () => {
      icuStayRepository.findById.mockResolvedValue(null);

      await expect(
        icuStayService.updateIcuStay('nonexistent', {}, 'user1', '127.0.0.1')
      ).rejects.toThrow(HttpError);
      await expect(
        icuStayService.updateIcuStay('nonexistent', {}, 'user1', '127.0.0.1')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should not fail if audit log fails', async () => {
      const before = { id: '123', admission_id: '456' };
      const after = { id: '123', admission_id: '456', ended_at: new Date() };
      icuStayRepository.findById.mockResolvedValue(before);
      icuStayRepository.update.mockResolvedValue(after);
      createAuditLog.mockRejectedValue(new Error('Audit failed'));

      const result = await icuStayService.updateIcuStay('123', {}, 'user1', '127.0.0.1');

      expect(result).toEqual(after);
    });
  });

  describe('deleteIcuStay', () => {
    it('should delete ICU stay and audit log', async () => {
      const before = { id: '123', admission_id: '456' };
      icuStayRepository.findById.mockResolvedValue(before);
      icuStayRepository.softDelete.mockResolvedValue({});

      await icuStayService.deleteIcuStay('123', 'user1', '127.0.0.1');

      expect(icuStayRepository.softDelete).toHaveBeenCalledWith('123');
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: 'user1',
        action: 'DELETE',
        entity: 'icu_stay',
        entity_id: '123',
        diff: { before },
        ip_address: '127.0.0.1'
      });
    });

    it('should throw HttpError if ICU stay not found', async () => {
      icuStayRepository.findById.mockResolvedValue(null);

      await expect(
        icuStayService.deleteIcuStay('nonexistent', 'user1', '127.0.0.1')
      ).rejects.toThrow(HttpError);
      await expect(
        icuStayService.deleteIcuStay('nonexistent', 'user1', '127.0.0.1')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should not fail if audit log fails', async () => {
      const before = { id: '123', admission_id: '456' };
      icuStayRepository.findById.mockResolvedValue(before);
      icuStayRepository.softDelete.mockResolvedValue({});
      createAuditLog.mockRejectedValue(new Error('Audit failed'));

      await icuStayService.deleteIcuStay('123', 'user1', '127.0.0.1');

      expect(icuStayRepository.softDelete).toHaveBeenCalledWith('123');
    });
  });
});
