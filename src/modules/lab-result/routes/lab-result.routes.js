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
  '/',  validateRequest({ query: listLabResultsQuerySchema }),

  authenticate(),
  labResultController.listLabResults
);

/**
 * @route GET /api/v1/lab-results/:id
 */
router.get(
  '/:id',  validateRequest({ params: labResultIdParamsSchema }),

  authenticate(),
  labResultController.getLabResultById
);

/**
 * @route POST /api/v1/lab-results/
 */
router.post(
  '/',  validateRequest({ body: createLabResultSchema }),

  authenticate(),
  labResultController.createLabResult
);

/**
 * @route PUT /api/v1/lab-results/:id
 */
router.put(
  '/:id',  validateRequest({ params: labResultIdParamsSchema, body: updateLabResultSchema }),

  authenticate(),
  labResultController.updateLabResult
);

/**
 * @route DELETE /api/v1/lab-results/:id
 */
router.delete(
  '/:id',  validateRequest({ params: labResultIdParamsSchema }),

  authenticate(),
  labResultController.deleteLabResult
);

module.exports = router;
