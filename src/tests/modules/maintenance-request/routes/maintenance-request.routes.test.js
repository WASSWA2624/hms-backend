/**
 * Maintenance request routes tests
 *
 * @module tests/modules/maintenance-request/routes
 * @description Tests for maintenance request API routes
 */

const request = require('supertest');
const express = require('express');
const maintenanceRequestRoutes = require('../../../../modules/maintenance-request/routes/maintenance-request.routes');
const maintenanceRequestController = require('../../../../modules/maintenance-request/controllers/maintenance-request.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('../../../../modules/maintenance-request/controllers/maintenance-request.controller');
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123' };
    next();
  })
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

describe('Maintenance Request Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/maintenance-requests', maintenanceRequestRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/maintenance-requests', () => {
    it('should call listMaintenanceRequests controller', async () => {
      maintenanceRequestController.listMaintenanceRequests.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/api/v1/maintenance-requests');

      expect(response.status).toBe(200);
      expect(maintenanceRequestController.listMaintenanceRequests).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/maintenance-requests/:id', () => {
    it('should call getMaintenanceRequestById controller', async () => {
      maintenanceRequestController.getMaintenanceRequestById.mockImplementation((req, res) => {
        res.status(200).json({ id: req.params.id });
      });

      const response = await request(app).get('/api/v1/maintenance-requests/123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(200);
      expect(maintenanceRequestController.getMaintenanceRequestById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/maintenance-requests', () => {
    it('should call createMaintenanceRequest controller', async () => {
      maintenanceRequestController.createMaintenanceRequest.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      const response = await request(app)
        .post('/api/v1/maintenance-requests')
        .send({ status: 'OPEN' });

      expect(response.status).toBe(201);
      expect(maintenanceRequestController.createMaintenanceRequest).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/maintenance-requests/:id', () => {
    it('should call updateMaintenanceRequest controller', async () => {
      maintenanceRequestController.updateMaintenanceRequest.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .put('/api/v1/maintenance-requests/123e4567-e89b-12d3-a456-426614174000')
        .send({ status: 'COMPLETED' });

      expect(response.status).toBe(200);
      expect(maintenanceRequestController.updateMaintenanceRequest).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/maintenance-requests/:id', () => {
    it('should call deleteMaintenanceRequest controller', async () => {
      maintenanceRequestController.deleteMaintenanceRequest.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app)
        .delete('/api/v1/maintenance-requests/123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(204);
      expect(maintenanceRequestController.deleteMaintenanceRequest).toHaveBeenCalled();
    });
  });
});
