/**
 * Nurse roster routes
 *
 * @module modules/nurse-roster/routes
 * @description Nurse roster endpoints mounted at /api/v1/nurse-rosters
 * Per module-creation.mdc: Apply all required middlewares
 * Per api.mdc: All endpoints must follow REST conventions
 */

const express = require('express');
const router = express.Router();
const nurseRosterController = require('@controllers/nurse-roster/nurse-roster.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createNurseRosterSchema,
  updateNurseRosterSchema,
  publishNurseRosterSchema,
  nurseRosterIdParamsSchema,
  listNurseRostersQuerySchema
} = require('@validations/nurse-roster/nurse-roster.schema');

router.get(
  '/',
  authenticate(),
  validateRequest({ query: listNurseRostersQuerySchema }),
  nurseRosterController.listNurseRosters
);

router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: nurseRosterIdParamsSchema }),
  nurseRosterController.getNurseRosterById
);

router.post(
  '/',
  authenticate(),
  validateRequest({ body: createNurseRosterSchema }),
  nurseRosterController.createNurseRoster
);

router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: nurseRosterIdParamsSchema, body: updateNurseRosterSchema }),
  nurseRosterController.updateNurseRoster
);

router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: nurseRosterIdParamsSchema }),
  nurseRosterController.deleteNurseRoster
);

router.post(
  '/:id/publish',
  authenticate(),
  validateRequest({ params: nurseRosterIdParamsSchema, body: publishNurseRosterSchema }),
  nurseRosterController.publishNurseRoster
);

module.exports = router;
