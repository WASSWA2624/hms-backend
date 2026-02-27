const pharmacyWorkspaceService = require('@services/pharmacy-workspace/pharmacy-workspace.service');
const { asyncHandler } = require('@lib/async');
const { sendSuccess } = require('@lib/response');
const { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT } = require('@config/constants');

const getPharmacyWorkbench = asyncHandler(async (req, res) => {
  const {
    panel,
    status,
    from,
    to,
    patient_id,
    encounter_id,
    search,
    page = DEFAULT_PAGE,
    limit = DEFAULT_PAGE_LIMIT,
    sort_by,
    order = 'desc',
  } = req.query;

  const data = await pharmacyWorkspaceService.getPharmacyWorkbench(
    {
      panel,
      status,
      from,
      to,
      patient_id,
      encounter_id,
      search,
    },
    Number(page),
    Number(limit),
    sort_by,
    order
  );

  return sendSuccess(res, 200, 'messages.pharmacy_workspace.workbench.success', data);
});

const getPharmacyOrderWorkflow = asyncHandler(async (req, res) => {
  const data = await pharmacyWorkspaceService.getPharmacyOrderWorkflow(req.params.id);
  return sendSuccess(res, 200, 'messages.pharmacy_workspace.workflow.success', data);
});

const prepareDispense = asyncHandler(async (req, res) => {
  const data = await pharmacyWorkspaceService.prepareDispense(
    req.params.id,
    req.body,
    req.user?.id,
    req.user?.role,
    req.ip
  );
  return sendSuccess(res, 200, 'messages.pharmacy_workspace.prepare_dispense.success', data);
});

const attestDispense = asyncHandler(async (req, res) => {
  const data = await pharmacyWorkspaceService.attestDispense(
    req.params.id,
    req.body,
    req.user?.id,
    req.user?.role,
    req.ip
  );
  return sendSuccess(res, 200, 'messages.pharmacy_workspace.attest_dispense.success', data);
});

const cancelPharmacyOrder = asyncHandler(async (req, res) => {
  const data = await pharmacyWorkspaceService.cancelPharmacyOrder(
    req.params.id,
    req.body,
    req.user?.id,
    req.user?.role,
    req.ip
  );
  return sendSuccess(res, 200, 'messages.pharmacy_workspace.cancel.success', data);
});

const returnDispense = asyncHandler(async (req, res) => {
  const data = await pharmacyWorkspaceService.returnDispense(
    req.params.id,
    req.body,
    req.user?.id,
    req.user?.role,
    req.ip
  );
  return sendSuccess(res, 200, 'messages.pharmacy_workspace.return.success', data);
});

const getInventoryStock = asyncHandler(async (req, res) => {
  const {
    facility_id,
    inventory_item_id,
    low_stock_only,
    search,
    page = DEFAULT_PAGE,
    limit = DEFAULT_PAGE_LIMIT,
    sort_by,
    order = 'desc',
  } = req.query;

  const data = await pharmacyWorkspaceService.getInventoryStock(
    {
      facility_id,
      inventory_item_id,
      low_stock_only,
      search,
    },
    Number(page),
    Number(limit),
    sort_by,
    order
  );

  return sendSuccess(res, 200, 'messages.pharmacy_workspace.inventory.stock.success', data);
});

const adjustInventoryStock = asyncHandler(async (req, res) => {
  const data = await pharmacyWorkspaceService.adjustInventoryStock(
    req.body,
    req.user?.id,
    req.user?.role,
    req.ip
  );

  return sendSuccess(res, 200, 'messages.pharmacy_workspace.inventory.adjust.success', data);
});

const resolveLegacyRoute = asyncHandler(async (req, res) => {
  const data = await pharmacyWorkspaceService.resolveLegacyRouteIdentifier(
    req.params.resource,
    req.params.id
  );
  return sendSuccess(res, 200, 'messages.pharmacy_workspace.resolve_legacy.success', data);
});

module.exports = {
  getPharmacyWorkbench,
  getPharmacyOrderWorkflow,
  prepareDispense,
  attestDispense,
  cancelPharmacyOrder,
  returnDispense,
  getInventoryStock,
  adjustInventoryStock,
  resolveLegacyRoute,
};
