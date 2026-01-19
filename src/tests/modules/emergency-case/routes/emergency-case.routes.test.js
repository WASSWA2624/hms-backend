/**
 * Emergency case routes tests
 *
 * @module tests/modules/emergency-case/routes
 * @description Tests for emergency case route definitions
 */

const request = require('supertest');
const express = require('express');
const emergencyCaseRoutes = require('../../../../modules/emergency-case/routes/emergency-case.routes');
const emergencyCaseController = require('../../../../modules/emergency-case/controllers/emergency-case.controller');
const { validate } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('../../../../modules/emergency-case/controllers/emergency-case.controller');
jest.mock('@middlewares/validate.middleware');

describe('Emergency Case Routes', () => {
  let app;

  beforeAll(() => {
    // Setup express app with routes
    app = express();
    app.use(express.json());
    
    // Mock validate middleware to pass through
    validate.mockImplementation(() => (req, res, next) => next());
    
    app.use('/emergency-cases', emergencyCaseRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /emergency-cases', () => {
    it('should be defined and call controller', async () => {
      emergencyCaseController.listEmergencyCases.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/emergency-cases');

      expect(emergencyCaseController.listEmergencyCases).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should apply validation middleware', async () => {
      emergencyCaseController.listEmergencyCases.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      await request(app).get('/emergency-cases');

      expect(validate).toHaveBeenCalled();
    });
  });

  describe('GET /emergency-cases/:id', () => {
    it('should be defined and call controller', async () => {
      emergencyCaseController.getEmergencyCaseById.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/emergency-cases/test-id');

      expect(emergencyCaseController.getEmergencyCaseById).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('POST /emergency-cases', () => {
    it('should be defined and call controller', async () => {
      emergencyCaseController.createEmergencyCase.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      const response = await request(app)
        .post('/emergency-cases')
        .send({
          tenant_id: 'tenant-id',
          patient_id: 'patient-id',
          severity: 'HIGH',
          status: 'PENDING'
        });

      expect(emergencyCaseController.createEmergencyCase).toHaveBeenCalled();
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /emergency-cases/:id', () => {
    it('should be defined and call controller', async () => {
      emergencyCaseController.updateEmergencyCase.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .put('/emergency-cases/test-id')
        .send({ status: 'IN_PROGRESS' });

      expect(emergencyCaseController.updateEmergencyCase).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /emergency-cases/:id', () => {
    it('should be defined and call controller', async () => {
      emergencyCaseController.deleteEmergencyCase.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app).delete('/emergency-cases/test-id');

      expect(emergencyCaseController.deleteEmergencyCase).toHaveBeenCalled();
      expect(response.status).toBe(204);
    });
  });
});
