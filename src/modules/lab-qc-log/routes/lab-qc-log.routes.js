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
  '/',
  authenticate(),
  validateRequest({ query: listLabQcLogsQuerySchema }),
  labQcLogController.listLabQcLogs
);

router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: labQcLogIdParamsSchema }),
  labQcLogController.getLabQcLogById
);

router.post(
  '/',
  authenticate(),
  validateRequest({ body: createLabQcLogSchema }),
  labQcLogController.createLabQcLog
);

router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: labQcLogIdParamsSchema, body: updateLabQcLogSchema }),
  labQcLogController.updateLabQcLog
);

router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: labQcLogIdParamsSchema }),
  labQcLogController.deleteLabQcLog
);

module.exports = router;
