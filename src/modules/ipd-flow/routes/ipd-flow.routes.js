/**
 * IPD flow routes
 */

const express = require('express');
const router = express.Router();
const ipdFlowController = require('@controllers/ipd-flow/ipd-flow.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate, authorize } = require('@middlewares/auth.middleware');
const { ROLES } = require('@config/roles');
const {
  listIpdFlowsQuerySchema,
  getIpdFlowQuerySchema,
  resolveLegacyRouteParamsSchema,
  admissionIdParamsSchema,
  startIpdFlowSchema,
  assignBedSchema,
  releaseBedSchema,
  requestTransferSchema,
  updateTransferSchema,
  addWardRoundSchema,
  addNursingNoteSchema,
  addMedicationAdministrationSchema,
  planDischargeSchema,
  finalizeDischargeSchema,
  startIcuStaySchema,
  endIcuStaySchema,
  addIcuObservationSchema,
  addCriticalAlertSchema,
  resolveCriticalAlertSchema,
} = require('@validations/ipd-flow/ipd-flow.schema');

const IPD_ALLOWED_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.TENANT_ADMIN,
  ROLES.FACILITY_ADMIN,
  ROLES.DOCTOR,
  ROLES.NURSE,
];

router.get(
  '/',
  validateRequest({ query: listIpdFlowsQuerySchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.listIpdFlows
);

router.get(
  '/resolve-legacy/:resource/:id',
  validateRequest({ params: resolveLegacyRouteParamsSchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.resolveLegacyRoute
);

router.get(
  '/:id',
  validateRequest({ params: admissionIdParamsSchema, query: getIpdFlowQuerySchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.getIpdFlowById
);

router.post(
  '/start',
  validateRequest({ body: startIpdFlowSchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.startIpdFlow
);

router.post(
  '/:id/assign-bed',
  validateRequest({ params: admissionIdParamsSchema, body: assignBedSchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.assignBed
);

router.post(
  '/:id/release-bed',
  validateRequest({ params: admissionIdParamsSchema, body: releaseBedSchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.releaseBed
);

router.post(
  '/:id/request-transfer',
  validateRequest({ params: admissionIdParamsSchema, body: requestTransferSchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.requestTransfer
);

router.post(
  '/:id/update-transfer',
  validateRequest({ params: admissionIdParamsSchema, body: updateTransferSchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.updateTransfer
);

router.post(
  '/:id/add-ward-round',
  validateRequest({ params: admissionIdParamsSchema, body: addWardRoundSchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.addWardRound
);

router.post(
  '/:id/add-nursing-note',
  validateRequest({ params: admissionIdParamsSchema, body: addNursingNoteSchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.addNursingNote
);

router.post(
  '/:id/add-medication-administration',
  validateRequest({ params: admissionIdParamsSchema, body: addMedicationAdministrationSchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.addMedicationAdministration
);

router.post(
  '/:id/plan-discharge',
  validateRequest({ params: admissionIdParamsSchema, body: planDischargeSchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.planDischarge
);

router.post(
  '/:id/finalize-discharge',
  validateRequest({ params: admissionIdParamsSchema, body: finalizeDischargeSchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.finalizeDischarge
);

router.post(
  '/:id/start-icu-stay',
  validateRequest({ params: admissionIdParamsSchema, body: startIcuStaySchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.startIcuStay
);

router.post(
  '/:id/end-icu-stay',
  validateRequest({ params: admissionIdParamsSchema, body: endIcuStaySchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.endIcuStay
);

router.post(
  '/:id/add-icu-observation',
  validateRequest({ params: admissionIdParamsSchema, body: addIcuObservationSchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.addIcuObservation
);

router.post(
  '/:id/add-critical-alert',
  validateRequest({ params: admissionIdParamsSchema, body: addCriticalAlertSchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.addCriticalAlert
);

router.post(
  '/:id/resolve-critical-alert',
  validateRequest({ params: admissionIdParamsSchema, body: resolveCriticalAlertSchema }),
  authenticate(),
  authorize(IPD_ALLOWED_ROLES, 'role'),
  ipdFlowController.resolveCriticalAlert
);

module.exports = router;
