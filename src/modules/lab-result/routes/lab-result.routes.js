/**
 * Lab result routes
 */

const express = require('express');
const router = express.Router();
const labResultController = require('@controllers/lab-result/lab-result.controller');
const { validateRequest } = require('@middlewares/validate.middleware');
const { authenticate } = require('@middlewares/auth.middleware');
const {
  createLabResultSchema,
  updateLabResultSchema,
  labResultIdParamsSchema,
  listLabResultsQuerySchema
} = require('@validations/lab-result/lab-result.schema');

/**
 * @route GET /api/v1/lab-results/
 */
router.get(
  '/',
  authenticate(),
  validateRequest({ query: listLabResultsQuerySchema }),
  labResultController.listLabResults
);

/**
 * @route GET /api/v1/lab-results/:id
 */
router.get(
  '/:id',
  authenticate(),
  validateRequest({ params: labResultIdParamsSchema }),
  labResultController.getLabResultById
);

/**
 * @route POST /api/v1/lab-results/
 */
router.post(
  '/',
  authenticate(),
  validateRequest({ body: createLabResultSchema }),
  labResultController.createLabResult
);

/**
 * @route PUT /api/v1/lab-results/:id
 */
router.put(
  '/:id',
  authenticate(),
  validateRequest({ params: labResultIdParamsSchema, body: updateLabResultSchema }),
  labResultController.updateLabResult
);

/**
 * @route DELETE /api/v1/lab-results/:id
 */
router.delete(
  '/:id',
  authenticate(),
  validateRequest({ params: labResultIdParamsSchema }),
  labResultController.deleteLabResult
);

module.exports = router;
