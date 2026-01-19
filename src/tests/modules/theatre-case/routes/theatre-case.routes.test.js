/**
 * Theatre case routes tests
 *
 * @module tests/modules/theatre-case/routes
 * @description Tests for theatre case API endpoints
 * Per testing.mdc: Route tests must validate HTTP methods, status codes, and response format
 */

const request = require('supertest');
const express = require('express');
const theatreCaseRoutes = require('@routes/theatre-case/theatre-case.routes');
const theatreCaseController = require('@controllers/theatre-case/theatre-case.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('@controllers/theatre-case/theatre-case.controller');
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123' };
    next();
  })
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/v1/theatre-cases', theatreCaseRoutes);

describe('Theatre Case Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/theatre-cases', () => {
    it('should call listTheatreCases controller', async () => {
      theatreCaseController.listTheatreCases.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/api/v1/theatre-cases');

      expect(response.status).toBe(200);
      expect(theatreCaseController.listTheatreCases).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/theatre-cases/:id', () => {
    const theatreCaseId = '550e8400-e29b-41d4-a716-446655440000';

    it('should call getTheatreCaseById controller', async () => {
      theatreCaseController.getTheatreCaseById.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get(`/api/v1/theatre-cases/${theatreCaseId}`);

      expect(response.status).toBe(200);
      expect(theatreCaseController.getTheatreCaseById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/theatre-cases', () => {
    const createData = {
      encounter_id: '550e8400-e29b-41d4-a716-446655440001',
      scheduled_at: '2026-01-20T10:00:00.000Z',
      status: 'SCHEDULED'
    };

    it('should call createTheatreCase controller', async () => {
      theatreCaseController.createTheatreCase.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      const response = await request(app)
        .post('/api/v1/theatre-cases')
        .send(createData);

      expect(response.status).toBe(201);
      expect(theatreCaseController.createTheatreCase).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/theatre-cases/:id', () => {
    const theatreCaseId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = {
      status: 'IN_PROGRESS'
    };

    it('should call updateTheatreCase controller', async () => {
      theatreCaseController.updateTheatreCase.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .put(`/api/v1/theatre-cases/${theatreCaseId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(theatreCaseController.updateTheatreCase).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/theatre-cases/:id', () => {
    const theatreCaseId = '550e8400-e29b-41d4-a716-446655440000';

    it('should call deleteTheatreCase controller', async () => {
      theatreCaseController.deleteTheatreCase.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app).delete(`/api/v1/theatre-cases/${theatreCaseId}`);

      expect(response.status).toBe(204);
      expect(theatreCaseController.deleteTheatreCase).toHaveBeenCalled();
    });
  });
});
