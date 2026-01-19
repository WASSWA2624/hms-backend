/**
 * Patient service tests
 *
 * @module tests/modules/patient/services
 * @description Tests for patient service business logic
 * Per testing.mdc: Service tests must mock repository and audit functions
 */

const patientService = require('@services/patient/patient.service');
const patientRepository = require('@repositories/patient/patient.repository');
const { createAuditLog } = require('@lib/audit');
const { HttpError } = require('@lib/errors');

// Mock dependencies
jest.mock('@repositories/patient/patient.repository');
jest.mock('@lib/audit');

describe('Patient Service', () => {
  const mockUserId = 'user-123';
  const mockIpAddress = '127.0.0.1';

  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockReturnValue(Promise.resolve());
  });

  describe('listPatients', () => {
    it('should list patients with pagination', async () => {
      const mockPatients = [{ id: '1', first_name: 'John' }];
      patientRepository.findMany.mockResolvedValue(mockPatients);
      patientRepository.count.mockResolvedValue(1);

      const result = await patientService.listPatients({}, 1, 20, 'created_at', 'desc', mockUserId, mockIpAddress);

      expect(result.patients).toEqual(mockPatients);
      expect(result.pagination.total).toBe(1);
      expect(patientRepository.findMany).toHaveBeenCalled();
      expect(patientRepository.count).toHaveBeenCalled();
    });

    it('should handle search filters', async () => {
      patientRepository.findMany.mockResolvedValue([]);
      patientRepository.count.mockResolvedValue(0);

      await patientService.listPatients({ search: 'John' }, 1, 20, null, 'asc', mockUserId, mockIpAddress);

      expect(patientRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ OR: expect.any(Array) }),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('getPatientById', () => {
    it('should get patient by id', async () => {
      const mockPatient = { id: '123', first_name: 'John' };
      patientRepository.findById.mockResolvedValue(mockPatient);

      const result = await patientService.getPatientById('123', mockUserId, mockIpAddress);

      expect(result).toEqual(mockPatient);
      expect(patientRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should throw HttpError if patient not found', async () => {
      patientRepository.findById.mockResolvedValue(null);

      await expect(
        patientService.getPatientById('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('createPatient', () => {
    it('should create patient and log audit', async () => {
      const mockData = { tenant_id: '123', first_name: 'John', last_name: 'Doe' };
      const mockPatient = { id: '456', ...mockData };
      patientRepository.create.mockResolvedValue(mockPatient);

      const result = await patientService.createPatient(mockData, mockUserId, mockIpAddress);

      expect(result).toEqual(mockPatient);
      expect(patientRepository.create).toHaveBeenCalledWith(mockData);
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockUserId,
        action: 'CREATE',
        entity: 'patient'
      }));
    });
  });

  describe('updatePatient', () => {
    it('should update patient and log audit', async () => {
      const mockBefore = { id: '123', first_name: 'John' };
      const mockAfter = { id: '123', first_name: 'Jane' };
      patientRepository.findById.mockResolvedValue(mockBefore);
      patientRepository.update.mockResolvedValue(mockAfter);

      const result = await patientService.updatePatient('123', { first_name: 'Jane' }, mockUserId, mockIpAddress);

      expect(result).toEqual(mockAfter);
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'UPDATE',
        diff: { before: mockBefore, after: mockAfter }
      }));
    });

    it('should throw HttpError if patient not found', async () => {
      patientRepository.findById.mockResolvedValue(null);

      await expect(
        patientService.updatePatient('nonexistent', {}, mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('deletePatient', () => {
    it('should soft delete patient and log audit', async () => {
      const mockPatient = { id: '123', first_name: 'John' };
      patientRepository.findById.mockResolvedValue(mockPatient);
      patientRepository.softDelete.mockResolvedValue({ ...mockPatient, deleted_at: new Date() });

      await patientService.deletePatient('123', mockUserId, mockIpAddress);

      expect(patientRepository.softDelete).toHaveBeenCalledWith('123');
      expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'DELETE',
        entity: 'patient'
      }));
    });

    it('should throw HttpError if patient not found', async () => {
      patientRepository.findById.mockResolvedValue(null);

      await expect(
        patientService.deletePatient('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });
});
