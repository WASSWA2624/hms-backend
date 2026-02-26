const ipdFlowController = require('@controllers/ipd-flow/ipd-flow.controller');
const ipdFlowService = require('@services/ipd-flow/ipd-flow.service');
const { sendSuccess, sendPaginated } = require('@lib/response');

jest.mock('@services/ipd-flow/ipd-flow.service');
jest.mock('@lib/response');

describe('ipd-flow.controller', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      query: {},
      params: {},
      body: {},
      user: {
        id: 'usr-1',
        tenant_id: 'tenant-1',
        facility_id: 'facility-1',
      },
      ip: '127.0.0.1',
      get: jest.fn(() => 'jest-agent'),
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  it('lists IPD flows and sends paginated response', async () => {
    ipdFlowService.listIpdFlows.mockResolvedValue({
      items: [{ admission: { id: 'adm-1' }, flow: { stage: 'ADMITTED_IN_BED' } }],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });
    req.query = { page: '1', limit: '20', stage: 'ADMITTED_IN_BED' };

    await ipdFlowController.listIpdFlows(req, res);

    expect(ipdFlowService.listIpdFlows).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'ADMITTED_IN_BED' }),
      1,
      20,
      'admitted_at',
      'desc'
    );
    expect(sendPaginated).toHaveBeenCalledWith(
      res,
      'messages.ipd_flow.list.success',
      expect.any(Array),
      expect.any(Object)
    );
  });

  it('gets IPD flow by id and sends success response', async () => {
    ipdFlowService.getIpdFlowById.mockResolvedValue({ admission: { id: 'adm-1' } });
    req.params.id = 'ADM0000001';

    await ipdFlowController.getIpdFlowById(req, res);

    expect(ipdFlowService.getIpdFlowById).toHaveBeenCalledWith('ADM0000001');
    expect(sendSuccess).toHaveBeenCalledWith(res, 200, 'messages.ipd_flow.get.success', expect.any(Object));
  });

  it('starts IPD flow with tenant fallback and propagates context', async () => {
    ipdFlowService.startIpdFlow.mockResolvedValue({ admission: { id: 'adm-1' } });
    req.body = { patient_id: 'PAT0001' };

    await ipdFlowController.startIpdFlow(req, res);

    expect(ipdFlowService.startIpdFlow).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: 'tenant-1', patient_id: 'PAT0001' }),
      {
        user_id: 'usr-1',
        tenant_id: 'tenant-1',
        facility_id: 'facility-1',
        ip_address: '127.0.0.1',
        user_agent: 'jest-agent',
      }
    );
    expect(sendSuccess).toHaveBeenCalledWith(res, 201, 'messages.ipd_flow.start.success', expect.any(Object));
  });

  it('delegates finalize discharge and returns 200', async () => {
    ipdFlowService.finalizeDischarge.mockResolvedValue({ admission: { id: 'adm-1' } });
    req.params.id = 'ADM0001';
    req.body = { summary: 'Recovered', discharged_at: new Date().toISOString() };

    await ipdFlowController.finalizeDischarge(req, res);

    expect(ipdFlowService.finalizeDischarge).toHaveBeenCalledWith('ADM0001', req.body, expect.any(Object));
    expect(sendSuccess).toHaveBeenCalledWith(
      res,
      200,
      'messages.ipd_flow.finalize_discharge.success',
      expect.any(Object)
    );
  });
});
