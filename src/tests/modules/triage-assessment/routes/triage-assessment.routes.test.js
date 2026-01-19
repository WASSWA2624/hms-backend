/**
 * Triage assessment routes tests
 *
 * @module tests/modules/triage-assessment/routes
 * @description Tests for triage assessment route definitions
 */

const request = require('supertest');
const express = require('express');
const triageAssessmentRoutes = require('../../../../modules/triage-assessment/routes/triage-assessment.routes');
const triageAssessmentController = require('../../../../modules/triage-assessment/controllers/triage-assessment.controller');
const { validate } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('../../../../modules/triage-assessment/controllers/triage-assessment.controller');
jest.mock('@middlewares/validate.middleware');

describe('Triage Assessment Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    validate.mockImplementation(() => (req, res, next) => next());
    
    app.use('/triage-assessments', triageAssessmentRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /triage-assessments', () => {
    it('should be defined and call controller', async () => {
      triageAssessmentController.listTriageAssessments.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/triage-assessments');

      expect(triageAssessmentController.listTriageAssessments).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('GET /triage-assessments/:id', () => {
    it('should be defined and call controller', async () => {
      triageAssessmentController.getTriageAssessmentById.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/triage-assessments/test-id');

      expect(triageAssessmentController.getTriageAssessmentById).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('POST /triage-assessments', () => {
    it('should be defined and call controller', async () => {
      triageAssessmentController.createTriageAssessment.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      const response = await request(app)
        .post('/triage-assessments')
        .send({
          emergency_case_id: 'case-id',
          triage_level: 'URGENT'
        });

      expect(triageAssessmentController.createTriageAssessment).toHaveBeenCalled();
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /triage-assessments/:id', () => {
    it('should be defined and call controller', async () => {
      triageAssessmentController.updateTriageAssessment.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .put('/triage-assessments/test-id')
        .send({ triage_level: 'IMMEDIATE' });

      expect(triageAssessmentController.updateTriageAssessment).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /triage-assessments/:id', () => {
    it('should be defined and call controller', async () => {
      triageAssessmentController.deleteTriageAssessment.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app).delete('/triage-assessments/test-id');

      expect(triageAssessmentController.deleteTriageAssessment).toHaveBeenCalled();
      expect(response.status).toBe(204);
    });
  });
});
