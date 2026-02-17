/**
 * Roster day off routes
 */
const express = require('express');
const router = express.Router();
const rosterDayOffController = require('@controllers/roster-day-off/roster-day-off.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createRosterDayOffSchema,
  updateRosterDayOffSchema,
  rosterDayOffIdParamsSchema,
  listRosterDayOffsQuerySchema
} = require('@validations/roster-day-off/roster-day-off.schema');

router.get('/', validateRequest({ query: listRosterDayOffsQuerySchema }), authenticate(), rosterDayOffController.list);
router.get('/:id', validateRequest({ params: rosterDayOffIdParamsSchema }), authenticate(), rosterDayOffController.getById);
router.post('/', validateRequest({ body: createRosterDayOffSchema }), authenticate(), rosterDayOffController.create);
router.put('/:id', validateRequest({ params: rosterDayOffIdParamsSchema, body: updateRosterDayOffSchema }), authenticate(), rosterDayOffController.update);
router.delete('/:id', validateRequest({ params: rosterDayOffIdParamsSchema }), authenticate(), rosterDayOffController.remove);

module.exports = router;

