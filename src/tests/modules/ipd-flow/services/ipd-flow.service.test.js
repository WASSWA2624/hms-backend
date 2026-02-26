const { HttpError } = require('@lib/errors');

jest.mock('@repositories/ipd-flow/ipd-flow.repository');
jest.mock('@lib/audit');
jest.mock('@lib/websocket', () => ({
  emitToUser: jest.fn(),
  emitToUsers: jest.fn(),
  IPD_EVENTS: {
    IPD_FLOW_UPDATED: 'ipd.flow.updated',
  },
  ADMISSION_BED_EVENTS: {
    PATIENT_ADMITTED: 'admission.patient_admitted',
    PATIENT_TRANSFERRED: 'admission.patient_transferred',
    PATIENT_DISCHARGED: 'admission.patient_discharged',
    BED_ASSIGNMENT_CHANGED: 'admission.bed_assignment_changed',
  },
  NOTIFICATION_EVENTS: {
    NOTIFICATION_CREATED: 'notification.created',
  },
}));
jest.mock('@prisma/client', () => ({
  $transaction: jest.fn(),
  admission: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  tenant: {
    findFirst: jest.fn(),
  },
  facility: {
    findFirst: jest.fn(),
  },
  patient: {
    findFirst: jest.fn(),
  },
  encounter: {
    findFirst: jest.fn(),
  },
  bed: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  ward: {
    findFirst: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
  transfer_request: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  bed_assignment: {
    create: jest.fn(),
    update: jest.fn(),
  },
  ward_round: {
    create: jest.fn(),
  },
  nursing_note: {
    create: jest.fn(),
  },
  medication_administration: {
    create: jest.fn(),
  },
  discharge_summary: {
    create: jest.fn(),
    update: jest.fn(),
  },
  user_role: {
    findMany: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
}));

const ipdFlowRepository = require('@repositories/ipd-flow/ipd-flow.repository');
const prisma = require('@prisma/client');
const { createAuditLog } = require('@lib/audit');
const { emitToUsers } = require('@lib/websocket');
const ipdFlowService = require('@services/ipd-flow/ipd-flow.service');

const now = new Date('2026-02-01T10:00:00.000Z');

const buildActiveBedAssignment = () => ({
  id: 'ba-1',
  bed_id: 'bed-1',
  assigned_at: now,
  released_at: null,
  deleted_at: null,
  bed: {
    id: 'bed-1',
    human_friendly_id: 'BED0000001',
    label: 'Bed A1',
    status: 'OCCUPIED',
    ward_id: 'ward-1',
    room_id: null,
    ward: {
      id: 'ward-1',
      human_friendly_id: 'WRD0000001',
      name: 'Ward A',
      ward_type: 'GENERAL',
    },
    room: null,
  },
});

const buildAdmission = (overrides = {}) => ({
  id: 'adm-1',
  human_friendly_id: 'ADM0000001',
  tenant_id: 'tenant-1',
  facility_id: 'facility-1',
  patient_id: 'pat-1',
  encounter_id: null,
  status: 'ADMITTED',
  admitted_at: now,
  discharged_at: null,
  created_at: now,
  updated_at: now,
  tenant: {
    id: 'tenant-1',
    human_friendly_id: 'TEN0000001',
    name: 'Demo Tenant',
  },
  facility: {
    id: 'facility-1',
    human_friendly_id: 'FAC0000001',
    name: 'Main Facility',
    facility_type: 'HOSPITAL',
  },
  patient: {
    id: 'pat-1',
    human_friendly_id: 'PAT0000001',
    first_name: 'John',
    last_name: 'Doe',
    date_of_birth: null,
    gender: 'MALE',
    tenant_id: 'tenant-1',
    facility_id: 'facility-1',
  },
  encounter: null,
  bed_assignments: [],
  transfer_requests: [],
  discharge_summaries: [],
  ward_rounds: [],
  nursing_notes: [],
  medication_administrations: [],
  ...overrides,
});

describe('ipd-flow.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockResolvedValue({});
    prisma.user_role.findMany.mockResolvedValue([]);
    prisma.notification.create.mockImplementation(async ({ data }) => ({
      id: `notif-${data.user_id}`,
      tenant_id: data.tenant_id,
      user_id: data.user_id,
      notification_type: data.notification_type,
      priority: data.priority,
      title: data.title,
      message: data.message,
      read_at: null,
      created_at: now,
      updated_at: now,
    }));
  });

  it('rejects assigning an unavailable bed', async () => {
    const tx = {
      admission: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'adm-1' })
          .mockResolvedValueOnce(buildAdmission()),
      },
      bed: {
        findFirst: jest.fn().mockResolvedValue({ id: 'bed-1', status: 'OCCUPIED' }),
      },
    };

    prisma.$transaction.mockImplementation(async (callback) => callback(tx));

    await expect(ipdFlowService.assignBed('ADM0000001', { bed_id: 'BED0000001' }, {})).rejects.toMatchObject(
      {
        messageKey: 'errors.ipd_flow.bed_not_available',
      }
    );
  });

  it('rejects assigning a bed when active bed assignment already exists', async () => {
    const tx = {
      admission: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'adm-1' })
          .mockResolvedValueOnce(buildAdmission({ bed_assignments: [buildActiveBedAssignment()] })),
      },
    };

    prisma.$transaction.mockImplementation(async (callback) => callback(tx));

    await expect(ipdFlowService.assignBed('ADM0000001', { bed_id: 'BED0000001' }, {})).rejects.toMatchObject(
      {
        messageKey: 'errors.ipd_flow.active_bed_exists',
      }
    );
  });

  it('rejects invalid transfer transitions', async () => {
    const tx = {
      admission: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'adm-1' })
          .mockResolvedValueOnce(
            buildAdmission({
              transfer_requests: [
                {
                  id: 'tr-1',
                  status: 'REQUESTED',
                  requested_at: now,
                  deleted_at: null,
                },
              ],
            })
          ),
      },
    };

    prisma.$transaction.mockImplementation(async (callback) => callback(tx));

    await expect(ipdFlowService.updateTransfer('ADM0000001', { action: 'START' }, {})).rejects.toMatchObject({
      messageKey: 'errors.ipd_flow.invalid_transfer_transition',
    });
  });

  it('rejects transfer completion when destination bed is missing', async () => {
    const tx = {
      admission: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'adm-1' })
          .mockResolvedValueOnce(
            buildAdmission({
              bed_assignments: [buildActiveBedAssignment()],
              transfer_requests: [
                {
                  id: 'tr-1',
                  status: 'IN_PROGRESS',
                  requested_at: now,
                  deleted_at: null,
                },
              ],
            })
          ),
      },
    };

    prisma.$transaction.mockImplementation(async (callback) => callback(tx));

    await expect(ipdFlowService.updateTransfer('ADM0000001', { action: 'COMPLETE' }, {})).rejects.toMatchObject(
      {
        messageKey: 'errors.ipd_flow.transfer_destination_bed_required',
      }
    );
  });

  it('rejects discharge finalization while a transfer is still active', async () => {
    const tx = {
      admission: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'adm-1' })
          .mockResolvedValueOnce(
            buildAdmission({
              transfer_requests: [
                {
                  id: 'tr-1',
                  status: 'IN_PROGRESS',
                  requested_at: now,
                  deleted_at: null,
                },
              ],
            })
          ),
      },
    };

    prisma.$transaction.mockImplementation(async (callback) => callback(tx));

    await expect(ipdFlowService.finalizeDischarge('ADM0000001', { summary: 'Ready to go' }, {})).rejects.toMatchObject(
      {
        messageKey: 'errors.ipd_flow.transfer_must_be_resolved_before_discharge',
      }
    );
  });

  it('resolves admissions by human-friendly ID', async () => {
    prisma.admission.findFirst.mockResolvedValue({ id: 'adm-1' });
    ipdFlowRepository.findById.mockResolvedValue(buildAdmission());

    const result = await ipdFlowService.getIpdFlowById('adm0000001');

    expect(prisma.admission.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          human_friendly_id: 'ADM0000001',
        }),
      })
    );
    expect(result.admission.id).toBe('adm-1');
  });

  it('emits ipd.flow.updated and compatibility admission events on start', async () => {
    const tx = {
      tenant: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      facility: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      patient: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'pat-1',
          tenant_id: 'tenant-1',
          facility_id: 'facility-1',
        }),
      },
      encounter: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      admission: {
        create: jest.fn().mockResolvedValue({ id: 'adm-1' }),
      },
      bed: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'bed-1',
          status: 'AVAILABLE',
          ward_id: 'ward-1',
          tenant_id: 'tenant-1',
          facility_id: 'facility-1',
        }),
        update: jest.fn().mockResolvedValue({ id: 'bed-1' }),
      },
      bed_assignment: {
        create: jest.fn().mockResolvedValue({ id: 'ba-1' }),
      },
    };

    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    prisma.admission.findFirst.mockResolvedValue({ id: 'adm-1' });
    prisma.user_role.findMany.mockResolvedValue([{ user_id: 'actor-1' }, { user_id: 'nurse-2' }]);
    ipdFlowRepository.findById.mockResolvedValue(
      buildAdmission({
        bed_assignments: [buildActiveBedAssignment()],
      })
    );

    await ipdFlowService.startIpdFlow(
      {
        patient_id: 'PAT0000001',
        bed_id: 'BED0000001',
      },
      {
        user_id: 'actor-1',
        tenant_id: 'tenant-1',
        facility_id: 'facility-1',
      }
    );

    expect(emitToUsers).toHaveBeenCalledWith(
      ['nurse-2'],
      'ipd.flow.updated',
      expect.objectContaining({
        admission_id: 'adm-1',
        action: 'START',
        target_path: expect.stringContaining('/ipd?id='),
      })
    );

    const emittedEvents = emitToUsers.mock.calls.map((call) => call[1]);
    expect(emittedEvents).toContain('admission.patient_admitted');
    expect(emittedEvents).toContain('admission.bed_assignment_changed');
  });

  it('throws HttpError for missing flow', async () => {
    prisma.admission.findFirst.mockResolvedValue(null);
    await expect(ipdFlowService.getIpdFlowById('ADM404')).rejects.toBeInstanceOf(HttpError);
  });
});
