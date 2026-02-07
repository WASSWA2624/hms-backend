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

router.get('/', authenticate(), validateRequest({ query: listRosterDayOffsQuerySchema }), rosterDayOffController.list);
router.get('/:id', authenticate(), validateRequest({ params: rosterDayOffIdParamsSchema }), rosterDayOffController.getById);
router.post('/', authenticate(), validateRequest({ body: createRosterDayOffSchema }), rosterDayOffController.create);
router.put('/:id', authenticate(), validateRequest({ params: rosterDayOffIdParamsSchema, body: updateRosterDayOffSchema }), rosterDayOffController.update);
router.delete('/:id', authenticate(), validateRequest({ params: rosterDayOffIdParamsSchema }), rosterDayOffController.remove);

module.exports = router;
