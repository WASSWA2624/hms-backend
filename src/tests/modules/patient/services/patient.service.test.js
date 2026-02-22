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

      expect(result.patients).toEqual([
        expect.objectContaining({
          id: '1',
          first_name: 'John'
        })
      ]);
      expect(result.pagination.total).toBe(1);
      expect(patientRepository.findMany).toHaveBeenCalled();
      expect(patientRepository.count).toHaveBeenCalled();
    });

    it('should build deep search clauses with multi-token AND semantics', async () => {
      patientRepository.findMany.mockResolvedValue([]);
      patientRepository.count.mockResolvedValue(0);

      await patientService.listPatients(
        { search: 'john guardian' },
        1,
        20,
        null,
        'asc',
        mockUserId,
        mockIpAddress
      );

      const whereClause = patientRepository.findMany.mock.calls[0][0];
      expect(whereClause.AND).toHaveLength(2);

      const firstTokenClause = whereClause.AND[0];
      const relationSearchClauses = firstTokenClause.OR.filter((entry) => entry && typeof entry === 'object');
      const contactSearch = relationSearchClauses.find((entry) => entry.contacts?.some);
      const identifierSearch = relationSearchClauses.find((entry) => entry.identifiers?.some);
      const guardianSearch = relationSearchClauses.find((entry) => entry.guardians?.some);
      const consentSearch = relationSearchClauses.find((entry) => entry.consents?.some);

      expect(contactSearch.contacts.some.deleted_at).toBeNull();
      expect(identifierSearch.identifiers.some.deleted_at).toBeNull();
      expect(guardianSearch.guardians.some.deleted_at).toBeNull();
      expect(consentSearch.consents.some.deleted_at).toBeNull();
      expect(contactSearch.contacts.some.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: { contains: 'john' } })
        ])
      );
    });

    it('should cap search token count at five terms', async () => {
      patientRepository.findMany.mockResolvedValue([]);
      patientRepository.count.mockResolvedValue(0);

      await patientService.listPatients(
        { search: 'one two three four five six seven' },
        1,
        20,
        null,
        'desc',
        mockUserId,
        mockIpAddress
      );

      const whereClause = patientRepository.findMany.mock.calls[0][0];
      expect(whereClause.AND).toHaveLength(5);
    });

    it('should include human-readable tenant/facility context in patient list payload', async () => {
      const mockPatients = [
        {
          id: '1',
          first_name: 'John',
          tenant: {
            human_friendly_id: 'TEN-0001',
            name: 'Alpha Tenant'
          },
          facility: {
            human_friendly_id: 'FAC-0001',
            name: 'Main Facility'
          }
        }
      ];
      patientRepository.findMany.mockResolvedValue(mockPatients);
      patientRepository.count.mockResolvedValue(1);

      const result = await patientService.listPatients({}, 1, 20, null, 'desc', mockUserId, mockIpAddress);

      expect(patientRepository.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Number),
        expect.any(Number),
        expect.any(Object),
        expect.objectContaining({
          tenant: expect.any(Object),
          facility: expect.any(Object)
        })
      );
      expect(result.patients[0]).toEqual(
        expect.objectContaining({
          tenant_context: {
            id: 'TEN-0001',
            label: 'Alpha Tenant'
          },
          facility_context: {
            id: 'FAC-0001',
            label: 'Main Facility'
          },
          tenant_human_friendly_id: 'TEN-0001',
          facility_human_friendly_id: 'FAC-0001'
        })
      );
      expect(result.patients[0].tenant).toBeUndefined();
      expect(result.patients[0].facility).toBeUndefined();
    });
  });

  describe('getPatientById', () => {
    it('should get patient by id with human-readable context', async () => {
      const mockPatient = {
        id: '123',
        first_name: 'John',
        tenant: {
          human_friendly_id: 'TEN-1001',
          name: 'Tenant One'
        },
        facility: {
          human_friendly_id: 'FAC-1001',
          name: 'City Facility'
        }
      };
      patientRepository.findById.mockResolvedValue(mockPatient);

      const result = await patientService.getPatientById('123', mockUserId, mockIpAddress);

      expect(result).toEqual(
        expect.objectContaining({
          id: '123',
          tenant_label: 'Tenant One',
          facility_label: 'City Facility',
          tenant_context: {
            id: 'TEN-1001',
            label: 'Tenant One'
          },
          facility_context: {
            id: 'FAC-1001',
            label: 'City Facility'
          }
        })
      );
      expect(patientRepository.findById).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          tenant: expect.any(Object),
          facility: expect.any(Object)
        })
      );
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

