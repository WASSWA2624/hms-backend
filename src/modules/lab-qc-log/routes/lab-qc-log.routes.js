/**
 * Lab QC log routes
 */

const express = require('express');
const router = express.Router();
const labQcLogController = require('@controllers/lab-qc-log/lab-qc-log.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createLabQcLogSchema,
  updateLabQcLogSchema,
  labQcLogIdParamsSchema,
  listLabQcLogsQuerySchema
} = require('@validations/lab-qc-log/lab-qc-log.schema');

router.get(
  '/',  validateRequest({ query: listLabQcLogsQuerySchema }),

  authenticate(),
  labQcLogController.listLabQcLogs
);

router.get(
  '/:id',  validateRequest({ params: labQcLogIdParamsSchema }),

  authenticate(),
  labQcLogController.getLabQcLogById
);

router.post(
  '/',  validateRequest({ body: createLabQcLogSchema }),

  authenticate(),
  labQcLogController.createLabQcLog
);

router.put(
  '/:id',  validateRequest({ params: labQcLogIdParamsSchema, body: updateLabQcLogSchema }),

  authenticate(),
  labQcLogController.updateLabQcLog
);

router.delete(
  '/:id',  validateRequest({ params: labQcLogIdParamsSchema }),

  authenticate(),
  labQcLogController.deleteLabQcLog
);

module.exports = router;
