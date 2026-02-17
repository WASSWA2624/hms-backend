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
  '/',  validateRequest({ query: listNurseRostersQuerySchema }),

  authenticate(),
  nurseRosterController.listNurseRosters
);

router.get(
  '/:id',  validateRequest({ params: nurseRosterIdParamsSchema }),

  authenticate(),
  nurseRosterController.getNurseRosterById
);

router.post(
  '/',  validateRequest({ body: createNurseRosterSchema }),

  authenticate(),
  nurseRosterController.createNurseRoster
);

router.put(
  '/:id',  validateRequest({ params: nurseRosterIdParamsSchema, body: updateNurseRosterSchema }),

  authenticate(),
  nurseRosterController.updateNurseRoster
);

router.delete(
  '/:id',  validateRequest({ params: nurseRosterIdParamsSchema }),

  authenticate(),
  nurseRosterController.deleteNurseRoster
);

router.post(
  '/:id/publish',  validateRequest({ params: nurseRosterIdParamsSchema, body: publishNurseRosterSchema }),

  authenticate(),
  nurseRosterController.publishNurseRoster
);

module.exports = router;
