/**
 * Lab test service tests
 *
 * @module tests/modules/lab-test/services
 * @description Tests for lab test service operations
 * Per testing.mdc: All services must be tested with mocked repositories
 */

const labTestService = require('@services/lab-test/lab-test.service');
const labTestRepository = require('@repositories/lab-test/lab-test.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/lab-test/lab-test.repository');
jest.mock('@lib/audit');

describe('Lab Test Service', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockIpAddress = '127.0.0.1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listLabTests', () => {
    it('should list lab tests with pagination successfully', async () => {
      const mockLabTests = [
        { id: '1', name: 'Complete Blood Count', code: 'CBC' },
        { id: '2', name: 'Hemoglobin', code: 'HGB' }
      ];

      labTestRepository.findMany.mockResolvedValue(mockLabTests);
      labTestRepository.count.mockResolvedValue(2);

      const result = await labTestService.listLabTests({}, 1, 20, 'created_at', 'desc', mockUserId, mockIpAddress);

      expect(result.labTests).toEqual(mockLabTests);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });
      expect(labTestRepository.findMany).toHaveBeenCalled();
      expect(labTestRepository.count).toHaveBeenCalled();
    });

    it('should apply filters correctly', async () => {
      labTestRepository.findMany.mockResolvedValue([]);
      labTestRepository.count.mockResolvedValue(0);

      const filters = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Blood',
        code: 'CBC'
      };

      await labTestService.listLabTests(filters, 1, 20, 'name', 'asc', mockUserId, mockIpAddress);

      expect(labTestRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: filters.tenant_id,
          name: { contains: 'Blood' },
          code: { contains: 'CBC' }
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should apply search filter correctly', async () => {
      labTestRepository.findMany.mockResolvedValue([]);
      labTestRepository.count.mockResolvedValue(0);

      const filters = { search: 'blood' };

      await labTestService.listLabTests(filters, 1, 20, 'name', 'asc', mockUserId, mockIpAddress);

      expect(labTestRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          OR: [
            { name: { contains: 'blood' } },
            { code: { contains: 'blood' } }
          ]
        }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });

    it('should calculate pagination metadata correctly', async () => {
      labTestRepository.findMany.mockResolvedValue([]);
      labTestRepository.count.mockResolvedValue(45);

      const result = await labTestService.listLabTests({}, 2, 20, 'created_at', 'desc', mockUserId, mockIpAddress);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true
      });
    });

    it('should throw HttpError when repository throws', async () => {
      labTestRepository.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        labTestService.listLabTests({}, 1, 20, 'created_at', 'desc', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('getLabTestById', () => {
    it('should get lab test by ID successfully', async () => {
      const mockLabTest = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Complete Blood Count',
        code: 'CBC'
      };

      labTestRepository.findById.mockResolvedValue(mockLabTest);

      const result = await labTestService.getLabTestById(
        '123e4567-e89b-12d3-a456-426614174000',
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(mockLabTest);
      expect(labTestRepository.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should throw HttpError when lab test not found', async () => {
      labTestRepository.findById.mockResolvedValue(null);

      await expect(
        labTestService.getLabTestById('123e4567-e89b-12d3-a456-426614174000', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError when repository throws', async () => {
      labTestRepository.findById.mockRejectedValue(new Error('Database error'));

      await expect(
        labTestService.getLabTestById('123e4567-e89b-12d3-a456-426614174000', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createLabTest', () => {
    it('should create lab test successfully and create audit log', async () => {
      const newLabTest = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Complete Blood Count',
        code: 'CBC'
      };

      const createdLabTest = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...newLabTest,
        created_at: new Date(),
        updated_at: new Date()
      };

      labTestRepository.create.mockResolvedValue(createdLabTest);
      createAuditLog.mockResolvedValue(undefined);

      const result = await labTestService.createLabTest(newLabTest, mockUserId, mockIpAddress);

      expect(result).toEqual(createdLabTest);
      expect(labTestRepository.create).toHaveBeenCalledWith(newLabTest);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: mockUserId,
        action: 'create',
        entity: 'lab_test',
        entity_id: createdLabTest.id,
        diff: { after: createdLabTest },
        ip: mockIpAddress
      });
    });

    it('should throw HttpError when repository throws', async () => {
      labTestRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(
        labTestService.createLabTest({ name: 'Test' }, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should propagate HttpError from repository', async () => {
      const httpError = new HttpError('errors.database.unique_field', 409, [{ field: 'code' }]);
      labTestRepository.create.mockRejectedValue(httpError);

      await expect(
        labTestService.createLabTest({ name: 'Test' }, mockUserId, mockIpAddress)
      ).rejects.toThrow(httpError);
    });
  });

  describe('updateLabTest', () => {
    it('should update lab test successfully and create audit log', async () => {
      const updateData = { name: 'Updated Lab Test' };
      const beforeLabTest = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Complete Blood Count',
        code: 'CBC'
      };
      const afterLabTest = {
        ...beforeLabTest,
        ...updateData,
        updated_at: new Date()
      };

      labTestRepository.findById.mockResolvedValue(beforeLabTest);
      labTestRepository.update.mockResolvedValue(afterLabTest);
      createAuditLog.mockResolvedValue(undefined);

      const result = await labTestService.updateLabTest(
        '123e4567-e89b-12d3-a456-426614174000',
        updateData,
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(afterLabTest);
      expect(labTestRepository.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
      expect(labTestRepository.update).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', updateData);
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: mockUserId,
        action: 'update',
        entity: 'lab_test',
        entity_id: afterLabTest.id,
        diff: { before: beforeLabTest, after: afterLabTest },
        ip: mockIpAddress
      });
    });

    it('should throw HttpError when lab test not found', async () => {
      labTestRepository.findById.mockResolvedValue(null);

      await expect(
        labTestService.updateLabTest(
          '123e4567-e89b-12d3-a456-426614174000',
          { name: 'Test' },
          mockUserId,
          mockIpAddress
        )
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError when repository throws', async () => {
      labTestRepository.findById.mockResolvedValue({ id: '1', name: 'Test' });
      labTestRepository.update.mockRejectedValue(new Error('Database error'));

      await expect(
        labTestService.updateLabTest(
          '123e4567-e89b-12d3-a456-426614174000',
          { name: 'Test' },
          mockUserId,
          mockIpAddress
        )
      ).rejects.toThrow(HttpError);
    });
  });

  describe('deleteLabTest', () => {
    it('should delete lab test successfully and create audit log', async () => {
      const labTest = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Complete Blood Count',
        code: 'CBC'
      };
      const deletedLabTest = {
        ...labTest,
        deleted_at: new Date()
      };

      labTestRepository.findById.mockResolvedValue(labTest);
      labTestRepository.softDelete.mockResolvedValue(deletedLabTest);
      createAuditLog.mockResolvedValue(undefined);

      const result = await labTestService.deleteLabTest(
        '123e4567-e89b-12d3-a456-426614174000',
        mockUserId,
        mockIpAddress
      );

      expect(result).toEqual(deletedLabTest);
      expect(labTestRepository.findById).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
      expect(labTestRepository.softDelete).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
      expect(createAuditLog).toHaveBeenCalledWith({
        user_id: mockUserId,
        action: 'delete',
        entity: 'lab_test',
        entity_id: deletedLabTest.id,
        diff: { before: labTest },
        ip: mockIpAddress
      });
    });

    it('should throw HttpError when lab test not found', async () => {
      labTestRepository.findById.mockResolvedValue(null);

      await expect(
        labTestService.deleteLabTest('123e4567-e89b-12d3-a456-426614174000', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });

    it('should throw HttpError when repository throws', async () => {
      labTestRepository.findById.mockResolvedValue({ id: '1', name: 'Test' });
      labTestRepository.softDelete.mockRejectedValue(new Error('Database error'));

      await expect(
        labTestService.deleteLabTest('123e4567-e89b-12d3-a456-426614174000', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });
});
