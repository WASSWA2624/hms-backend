/**
 * Patient repository tests
 *
 * @module tests/modules/patient/repositories
 * @description Tests for patient repository operations
 * Per testing.mdc: Repository tests must mock Prisma client
 */

const patientRepository = require('@repositories/patient/patient.repository');
const prisma = require('@prisma/client');
const { HttpError } = require('@lib/errors');

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  patient: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
}));

describe('Patient Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find patient by id', async () => {
      const mockPatient = { id: '123', first_name: 'John', last_name: 'Doe' };
      prisma.patient.findFirst.mockResolvedValue(mockPatient);

      const result = await patientRepository.findById('123');
      expect(result).toEqual(mockPatient);
      expect(prisma.patient.findFirst).toHaveBeenCalledWith({
        where: { id: '123', deleted_at: null },
        include: {}
      });
    });

    it('should return null if patient not found', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);

      const result = await patientRepository.findById('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw HttpError on database error', async () => {
      prisma.patient.findFirst.mockRejectedValue(new Error('DB Error'));

      await expect(patientRepository.findById('123')).rejects.toThrow(HttpError);
    });
  });

  describe('findMany', () => {
    it('should find many patients with pagination', async () => {
      const mockPatients = [
        { id: '1', first_name: 'John', last_name: 'Doe' },
        { id: '2', first_name: 'Jane', last_name: 'Smith' }
      ];
      prisma.patient.findMany.mockResolvedValue(mockPatients);

      const result = await patientRepository.findMany({}, 0, 20);
      expect(result).toEqual(mockPatients);
      expect(prisma.patient.findMany).toHaveBeenCalled();
    });
  });

  describe('count', () => {
    it('should count patients', async () => {
      prisma.patient.count.mockResolvedValue(42);

      const result = await patientRepository.count({});
      expect(result).toBe(42);
    });
  });

  describe('create', () => {
    it('should create patient', async () => {
      const mockData = { tenant_id: '123', first_name: 'John', last_name: 'Doe' };
      const mockPatient = { id: '456', ...mockData };
      prisma.patient.create.mockResolvedValue(mockPatient);

      const result = await patientRepository.create(mockData);
      expect(result).toEqual(mockPatient);
    });

    it('should throw HttpError on unique constraint violation', async () => {
      const error = new Error('Unique constraint');
      error.code = 'P2002';
      error.meta = { target: ['email'] };
      prisma.patient.create.mockRejectedValue(error);

      await expect(patientRepository.create({})).rejects.toThrow(HttpError);
    });

    it('should throw HttpError on foreign key constraint violation', async () => {
      const error = new Error('Foreign key constraint');
      error.code = 'P2003';
      error.meta = { field_name: 'tenant_id' };
      prisma.patient.create.mockRejectedValue(error);

      await expect(patientRepository.create({})).rejects.toThrow(HttpError);
    });
  });

  describe('update', () => {
    it('should update patient', async () => {
      const mockPatient = { id: '123', first_name: 'Jane', last_name: 'Doe' };
      prisma.patient.update.mockResolvedValue(mockPatient);

      const result = await patientRepository.update('123', { first_name: 'Jane' });
      expect(result).toEqual(mockPatient);
    });

    it('should throw HttpError if patient not found', async () => {
      const error = new Error('Record not found');
      error.code = 'P2025';
      prisma.patient.update.mockRejectedValue(error);

      await expect(patientRepository.update('nonexistent', {})).rejects.toThrow(HttpError);
    });
  });

  describe('softDelete', () => {
    it('should soft delete patient', async () => {
      const mockPatient = { id: '123', deleted_at: new Date() };
      prisma.patient.update.mockResolvedValue(mockPatient);

      const result = await patientRepository.softDelete('123');
      expect(result).toEqual(mockPatient);
      expect(prisma.patient.update).toHaveBeenCalledWith({
        where: { id: '123' },
        data: { deleted_at: expect.any(Date) }
      });
    });

    it('should throw HttpError if patient not found', async () => {
      const error = new Error('Record not found');
      error.code = 'P2025';
      prisma.patient.update.mockRejectedValue(error);

      await expect(patientRepository.softDelete('nonexistent')).rejects.toThrow(HttpError);
    });
  });
});
