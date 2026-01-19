/**
 * Radiology Result routes tests
 *
 * @module tests/modules/radiology-result/routes
 * @description Integration tests for radiology result routes
 * Per testing.mdc: Test middleware application, validation, auth
 */

// Mock dependencies
jest.mock('@controllers/radiology-result/radiology-result.controller', () => ({
  listRadiologyResults: jest.fn(),
  getRadiologyResultById: jest.fn(),
  createRadiologyResult: jest.fn(),
  updateRadiologyResult: jest.fn(),
  deleteRadiologyResult: jest.fn()
}));
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => next())
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

const request = require('supertest');
const express = require('express');
const radiologyResultRoutes = require('@routes/radiology-result/radiology-result.routes');
const radiologyResultController = require('@controllers/radiology-result/radiology-result.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/radiology-results', radiologyResultRoutes);

describe('Radiology Result Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticate middleware to pass through
    authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { id: 'test-user-id' };
      next();
    });

    // Mock validateRequest middleware to pass through
    validateRequest.mockImplementation(() => (req, res, next) => next());

    // Mock controller methods
    radiologyResultController.listRadiologyResults.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    radiologyResultController.getRadiologyResultById.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    radiologyResultController.createRadiologyResult.mockImplementation((req, res) => {
      res.status(201).json({ success: true });
    });
    radiologyResultController.updateRadiologyResult.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    radiologyResultController.deleteRadiologyResult.mockImplementation((req, res) => {
      res.status(204).send();
    });
  });

  describe('GET /api/v1/radiology-results', () => {
    it('should list radiology results', async () => {
      const response = await request(app).get('/api/v1/radiology-results');

      expect(response.status).toBe(200);
      expect(radiologyResultController.listRadiologyResults).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get('/api/v1/radiology-results');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware', async () => {
      await request(app).get('/api/v1/radiology-results');

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.any(Object) })
      );
    });

    it('should accept query parameters', async () => {
      await request(app)
        .get('/api/v1/radiology-results')
        .query({
          page: '1',
          limit: '20',
          radiology_order_id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'DRAFT',
          search: 'findings'
        });

      expect(radiologyResultController.listRadiologyResults).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/radiology-results/:id', () => {
    const radiologyResultId = '550e8400-e29b-41d4-a716-446655440000';

    it('should get radiology result by ID', async () => {
      const response = await request(app).get(`/api/v1/radiology-results/${radiologyResultId}`);

      expect(response.status).toBe(200);
      expect(radiologyResultController.getRadiologyResultById).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).get(`/api/v1/radiology-results/${radiologyResultId}`);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for params', async () => {
      await request(app).get(`/api/v1/radiology-results/${radiologyResultId}`);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.any(Object) })
      );
    });
  });

  describe('POST /api/v1/radiology-results', () => {
    const radiologyResultData = {
      radiology_order_id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'DRAFT',
      report_text: 'Preliminary findings.',
      reported_at: '2026-01-19T14:30:00.000Z'
    };

    it('should create new radiology result', async () => {
      const response = await request(app)
        .post('/api/v1/radiology-results')
        .send(radiologyResultData);

      expect(response.status).toBe(201);
      expect(radiologyResultController.createRadiologyResult).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).post('/api/v1/radiology-results').send(radiologyResultData);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for body', async () => {
      await request(app).post('/api/v1/radiology-results').send(radiologyResultData);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.any(Object) })
      );
    });
  });

  describe('PUT /api/v1/radiology-results/:id', () => {
    const radiologyResultId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = {
      status: 'FINAL'
    };

    it('should update radiology result', async () => {
      const response = await request(app)
        .put(`/api/v1/radiology-results/${radiologyResultId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(radiologyResultController.updateRadiologyResult).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).put(`/api/v1/radiology-results/${radiologyResultId}`).send(updateData);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for params and body', async () => {
      await request(app).put(`/api/v1/radiology-results/${radiologyResultId}`).send(updateData);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.any(Object),
          body: expect.any(Object)
        })
      );
    });
  });

  describe('DELETE /api/v1/radiology-results/:id', () => {
    const radiologyResultId = '550e8400-e29b-41d4-a716-446655440000';

    it('should delete radiology result', async () => {
      const response = await request(app).delete(`/api/v1/radiology-results/${radiologyResultId}`);

      expect(response.status).toBe(204);
      expect(radiologyResultController.deleteRadiologyResult).toHaveBeenCalled();
    });

    it('should apply authentication middleware', async () => {
      await request(app).delete(`/api/v1/radiology-results/${radiologyResultId}`);

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validation middleware for params', async () => {
      await request(app).delete(`/api/v1/radiology-results/${radiologyResultId}`);

      expect(validateRequest).toHaveBeenCalledWith(
        expect.objectContaining({ params: expect.any(Object) })
      );
    });
  });

  describe('HTTP methods', () => {
    it('should not allow POST on /:id endpoint', async () => {
      const radiologyResultId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app).post(`/api/v1/radiology-results/${radiologyResultId}`);

      expect(response.status).toBe(404);
    });

    it('should not allow PATCH on / endpoint', async () => {
      const response = await request(app).patch('/api/v1/radiology-results');

      expect(response.status).toBe(404);
    });
  });
});
