const { HttpError } = require('@lib/errors');

jest.mock('@repositories/lab-workspace/lab-workspace.repository');
jest.mock('@lib/audit', () => ({
  createAuditLog: jest.fn(),
}));
jest.mock('@lib/websocket', () => ({
  emitToUsers: jest.fn(),
  DIAGNOSTIC_EVENTS: {
    LAB_WORKFLOW_UPDATED: 'diagnostic.lab_workflow_updated',
    LAB_RESULT_READY: 'diagnostic.lab_result_ready',
    LAB_RESULT_UPDATED: 'diagnostic.lab_result_updated',
  },
}));
jest.mock('@prisma/client', () => ({
  user_role: {
    findMany: jest.fn(),
  },
}));
jest.mock('@services/lab-workspace/lab.shared', () => {
  const actual = jest.requireActual('@services/lab-workspace/lab.shared');
  return {
    ...actual,
    resolveModelIdOrThrow: jest.fn(),
    resolveModelRecordOrThrow: jest.fn(),
  };
});

const labWorkspaceRepository = require('@repositories/lab-workspace/lab-workspace.repository');
const { createAuditLog } = require('@lib/audit');
const { emitToUsers } = require('@lib/websocket');
const prisma = require('@prisma/client');
const {
  resolveModelIdOrThrow,
  resolveModelRecordOrThrow,
} = require('@services/lab-workspace/lab.shared');
const labWorkspaceService = require('@services/lab-workspace/lab-workspace.service');

const now = new Date('2026-02-27T09:15:00.000Z');

const buildBaseOrder = (overrides = {}) => ({
  id: 'order-internal-1',
  human_friendly_id: 'LAB0000001',
  status: 'ORDERED',
  ordered_at: now,
  created_at: now,
  updated_at: now,
  patient_id: 'patient-internal-1',
  encounter_id: 'encounter-internal-1',
  patient: {
    id: 'patient-internal-1',
    human_friendly_id: 'PAT0000001',
    tenant_id: 'tenant-internal-1',
    facility_id: 'facility-internal-1',
    first_name: 'Amina',
    last_name: 'Stone',
  },
  encounter: {
    id: 'encounter-internal-1',
    human_friendly_id: 'ENC0000001',
  },
  items: [],
  samples: [],
  ...overrides,
});

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

describe('lab-workspace.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createAuditLog.mockResolvedValue({});
    prisma.user_role.findMany.mockResolvedValue([
      { user_id: 'user-1' },
      { user_id: 'actor-1' },
      { user_id: 'user-2' },
    ]);
  });

  it('resolves legacy lab route identifiers to canonical /lab routes', async () => {
    resolveModelRecordOrThrow.mockResolvedValue({
      id: '46e0498d-c2be-4f1d-bc69-d6a72fd6fb85',
      human_friendly_id: 'LABRES0005',
    });

    const resolved = await labWorkspaceService.resolveLegacyRouteIdentifier(
      'lab-results',
      '46e0498d-c2be-4f1d-bc69-d6a72fd6fb85'
    );

    expect(resolved).toEqual({
      id: 'LABRES0005',
      resource: 'results',
      identifier: 'LABRES0005',
      route: '/lab/results/LABRES0005',
      matched_by: 'uuid',
    });
  });

  it('collectLabOrder emits lab workflow realtime update without blocking mutation', async () => {
    resolveModelIdOrThrow.mockResolvedValue('order-internal-1');

    const initialOrder = buildBaseOrder({
      status: 'ORDERED',
      items: [
        {
          id: 'item-internal-1',
          human_friendly_id: 'LIT0000001',
          status: 'ORDERED',
          created_at: now,
          updated_at: now,
          lab_test: {
            id: 'lab-test-internal-1',
            human_friendly_id: 'LBT0000001',
            name: 'CBC',
            code: 'CBC',
            unit: null,
          },
          results: [],
        },
      ],
      samples: [],
    });

    const refreshedOrder = buildBaseOrder({
      status: 'COLLECTED',
      items: [
        {
          id: 'item-internal-1',
          human_friendly_id: 'LIT0000001',
          status: 'COLLECTED',
          created_at: now,
          updated_at: now,
          lab_test: {
            id: 'lab-test-internal-1',
            human_friendly_id: 'LBT0000001',
            name: 'CBC',
            code: 'CBC',
            unit: null,
          },
          results: [],
        },
      ],
      samples: [
        {
          id: 'sample-internal-1',
          human_friendly_id: 'LSP0000001',
          status: 'COLLECTED',
          collected_at: now,
          received_at: null,
          created_at: now,
          updated_at: now,
        },
      ],
    });

    labWorkspaceRepository.withTransaction.mockImplementation(async (callback) =>
      callback({})
    );
    labWorkspaceRepository.txFindOrderById
      .mockResolvedValueOnce(initialOrder)
      .mockResolvedValueOnce(refreshedOrder);
    labWorkspaceRepository.txCreateSample.mockResolvedValue({
      id: 'sample-internal-1',
    });
    labWorkspaceRepository.txUpdateOrderItemsMany.mockResolvedValue({ count: 1 });
    labWorkspaceRepository.txUpdateOrder.mockResolvedValue({ id: 'order-internal-1' });

    const result = await labWorkspaceService.collectLabOrder(
      'LAB0000001',
      { notes: 'Collected at bedside' },
      'actor-1',
      '127.0.0.1'
    );

    expect(result?.workflow?.order?.id).toBe('LAB0000001');

    await flushAsync();

    expect(emitToUsers).toHaveBeenCalledWith(
      ['user-1', 'user-2'],
      'diagnostic.lab_workflow_updated',
      expect.objectContaining({
        action: 'COLLECT',
        order_id: 'LAB0000001',
      })
    );
  });

  it('releaseLabOrderItem emits workflow and compatibility result realtime events', async () => {
    resolveModelIdOrThrow.mockResolvedValue('order-item-internal-1');

    const releasedResultInternal = {
      id: 'result-internal-1',
      human_friendly_id: 'LRS0000001',
      status: 'CRITICAL',
      result_value: '12.8',
      result_unit: 'mg/dL',
      result_text: 'Critical potassium level',
      reported_at: now,
      created_at: now,
      updated_at: now,
      lab_order_item_id: 'order-item-internal-1',
    };

    const refreshedOrder = buildBaseOrder({
      status: 'COMPLETED',
      items: [
        {
          id: 'order-item-internal-1',
          human_friendly_id: 'LIT0000002',
          status: 'COMPLETED',
          created_at: now,
          updated_at: now,
          lab_test: {
            id: 'lab-test-internal-2',
            human_friendly_id: 'LBT0000002',
            name: 'Potassium',
            code: 'K',
            unit: 'mg/dL',
          },
          results: [releasedResultInternal],
        },
      ],
      samples: [],
    });

    labWorkspaceRepository.withTransaction.mockImplementation(async (callback) =>
      callback({})
    );
    labWorkspaceRepository.txFindOrderItemById.mockResolvedValue({
      id: 'order-item-internal-1',
      lab_order_id: 'order-internal-1',
      status: 'IN_PROCESS',
      lab_test: {
        id: 'lab-test-internal-2',
        unit: 'mg/dL',
      },
      lab_order: {
        id: 'order-internal-1',
        status: 'IN_PROCESS',
      },
    });
    labWorkspaceRepository.txFindFirstResult
      .mockResolvedValueOnce({
        id: 'result-internal-1',
        status: 'PENDING',
        result_value: null,
        result_unit: null,
        result_text: null,
        reported_at: null,
      })
      .mockResolvedValueOnce(null);
    labWorkspaceRepository.txUpdateResult.mockResolvedValue(releasedResultInternal);
    labWorkspaceRepository.txUpdateOrderItem.mockResolvedValue({
      id: 'order-item-internal-1',
    });
    labWorkspaceRepository.txCountOrderItems.mockResolvedValue(0);
    labWorkspaceRepository.txUpdateOrder.mockResolvedValue({ id: 'order-internal-1' });
    labWorkspaceRepository.txFindOrderById.mockResolvedValue(refreshedOrder);

    const result = await labWorkspaceService.releaseLabOrderItem(
      'LIT0000002',
      {
        status: 'CRITICAL',
        result_value: '12.8',
        result_unit: 'mg/dL',
        result_text: 'Critical potassium level',
      },
      'actor-1',
      '127.0.0.1'
    );

    expect(result?.released_result?.id).toBe('LRS0000001');

    await flushAsync();

    const emittedEvents = emitToUsers.mock.calls.map((call) => call[1]);
    expect(emittedEvents).toContain('diagnostic.lab_workflow_updated');
    expect(emittedEvents).toContain('diagnostic.lab_result_updated');
    expect(emittedEvents).toContain('diagnostic.lab_result_ready');

    const resultUpdatedPayload = emitToUsers.mock.calls.find(
      (call) => call[1] === 'diagnostic.lab_result_updated'
    )?.[2];
    expect(resultUpdatedPayload).toEqual(
      expect.objectContaining({
        result_id: 'LRS0000001',
        result_status: 'CRITICAL',
      })
    );
  });

  it('throws not found when legacy resource identifier is missing', async () => {
    await expect(
      labWorkspaceService.resolveLegacyRouteIdentifier('lab-results', '')
    ).rejects.toBeInstanceOf(HttpError);
  });
});
