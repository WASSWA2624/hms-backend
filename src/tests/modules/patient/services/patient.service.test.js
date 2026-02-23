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
const patientDocumentService = require('@services/patient-document/patient-document.service');

// Mock dependencies
jest.mock('@repositories/patient/patient.repository');
jest.mock('@lib/audit');
jest.mock('@services/patient-document/patient-document.service', () => ({
  listPatientDocuments: jest.fn()
}));

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
      const appointmentSearch = relationSearchClauses.find((entry) => entry.appointments?.some);

      expect(contactSearch.contacts.some.deleted_at).toBeNull();
      expect(identifierSearch.identifiers.some.deleted_at).toBeNull();
      expect(guardianSearch.guardians.some.deleted_at).toBeNull();
      expect(consentSearch.consents.some.deleted_at).toBeNull();
      expect(appointmentSearch.appointments.some.deleted_at).toBeNull();
      expect(contactSearch.contacts.some.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: { contains: 'john' } })
        ])
      );
    });

    it('should build comprehensive combination filters for patient fields and date ranges', async () => {
      patientRepository.findMany.mockResolvedValue([]);
      patientRepository.count.mockResolvedValue(0);

      await patientService.listPatients(
        {
          patient_id: 'PAT-0200',
          first_name: 'Jan',
          last_name: 'Do',
          date_of_birth: '1990-01-02',
          gender: 'FEMALE',
          contact: '+256700000010',
          appointment_status: 'CONFIRMED',
          created_from: '2026-01-01',
          created_to: '2026-01-31',
          appointment_from: '2026-02-01',
          appointment_to: '2026-02-28',
        },
        1,
        20,
        'created_at',
        'desc',
        mockUserId,
        mockIpAddress
      );

      const whereClause = patientRepository.findMany.mock.calls[0][0];
      expect(whereClause.human_friendly_id).toEqual({ contains: 'PAT-0200' });
      expect(whereClause.first_name).toEqual({ contains: 'Jan' });
      expect(whereClause.last_name).toEqual({ contains: 'Do' });
      expect(whereClause.gender).toBe('FEMALE');
      expect(whereClause.date_of_birth.gte).toBeInstanceOf(Date);
      expect(whereClause.date_of_birth.lte).toBeInstanceOf(Date);
      expect(whereClause.created_at.gte).toBeInstanceOf(Date);
      expect(whereClause.created_at.lte).toBeInstanceOf(Date);
      expect(whereClause.contacts).toEqual(
        expect.objectContaining({
          some: expect.objectContaining({
            deleted_at: null,
          }),
        })
      );
      expect(whereClause.appointments).toEqual(
        expect.objectContaining({
          some: expect.objectContaining({
            deleted_at: null,
            status: 'CONFIRMED',
            scheduled_start: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
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

      const scope = {
        tenant_id: '550e8400-e29b-41d4-a716-446655440020',
        facility_id: '550e8400-e29b-41d4-a716-446655440021'
      };
      const result = await patientService.getPatientById('PAT0000001', mockUserId, mockIpAddress, scope);

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
        'PAT0000001',
        expect.objectContaining({
          tenant: expect.any(Object),
          facility: expect.any(Object)
        }),
        scope
      );
    });

    it('should throw HttpError if patient not found', async () => {
      patientRepository.findById.mockResolvedValue(null);

      await expect(
        patientService.getPatientById('nonexistent', mockUserId, mockIpAddress)
      ).rejects.toThrow(HttpError);
    });
  });

  describe('getPatientDocuments', () => {
    it('should resolve route identifier to canonical patient UUID before listing documents', async () => {
      patientRepository.findById.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440030' });
      patientDocumentService.listPatientDocuments.mockResolvedValue({
        items: [{ id: 'doc-1' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false }
      });

      const result = await patientService.getPatientDocuments(
        'PAT0000001',
        1,
        20,
        'created_at',
        'desc',
        { facility_id: '550e8400-e29b-41d4-a716-446655440021' }
      );

      expect(patientRepository.findById).toHaveBeenCalledWith(
        'PAT0000001',
        {},
        { facility_id: '550e8400-e29b-41d4-a716-446655440021' }
      );
      expect(patientDocumentService.listPatientDocuments).toHaveBeenCalledWith(
        { patient_id: '550e8400-e29b-41d4-a716-446655440030' },
        1,
        20,
        'created_at',
        'desc'
      );
      expect(result.patientDocuments).toEqual([{ id: 'doc-1' }]);
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

      expect(patientRepository.softDelete).toHaveBeenCalledWith('123', {});
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
