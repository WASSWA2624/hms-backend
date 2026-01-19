/**
 * Emergency response routes tests
 *
 * @module tests/modules/emergency-response/routes
 * @description Tests for emergency response route definitions
 */

const request = require('supertest');
const express = require('express');
const emergencyResponseRoutes = require('../../../../modules/emergency-response/routes/emergency-response.routes');
const emergencyResponseController = require('../../../../modules/emergency-response/controllers/emergency-response.controller');
const { validate } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('../../../../modules/emergency-response/controllers/emergency-response.controller');
jest.mock('@middlewares/validate.middleware');

describe('Emergency Response Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    validate.mockImplementation(() => (req, res, next) => next());
    
    app.use('/emergency-responses', emergencyResponseRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /emergency-responses', () => {
    it('should be defined and call controller', async () => {
      emergencyResponseController.listEmergencyResponses.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/emergency-responses');

      expect(emergencyResponseController.listEmergencyResponses).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('GET /emergency-responses/:id', () => {
    it('should be defined and call controller', async () => {
      emergencyResponseController.getEmergencyResponseById.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/emergency-responses/test-id');

      expect(emergencyResponseController.getEmergencyResponseById).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('POST /emergency-responses', () => {
    it('should be defined and call controller', async () => {
      emergencyResponseController.createEmergencyResponse.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      const response = await request(app)
        .post('/emergency-responses')
        .send({
          emergency_case_id: 'case-id',
          notes: 'test notes'
        });

      expect(emergencyResponseController.createEmergencyResponse).toHaveBeenCalled();
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /emergency-responses/:id', () => {
    it('should be defined and call controller', async () => {
      emergencyResponseController.updateEmergencyResponse.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .put('/emergency-responses/test-id')
        .send({ notes: 'updated notes' });

      expect(emergencyResponseController.updateEmergencyResponse).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /emergency-responses/:id', () => {
    it('should be defined and call controller', async () => {
      emergencyResponseController.deleteEmergencyResponse.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app).delete('/emergency-responses/test-id');

      expect(emergencyResponseController.deleteEmergencyResponse).toHaveBeenCalled();
      expect(response.status).toBe(204);
    });
  });
});
