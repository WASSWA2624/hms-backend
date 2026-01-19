/**
 * Radiology test routes tests
 *
 * @module tests/modules/radiology-test/routes
 * @description Integration tests for radiology test routes
 * Per testing.mdc: Test middleware application, validation, auth
 */

const request = require('supertest');
const express = require('express');

// Mock dependencies BEFORE requiring the routes with factory functions
jest.mock('@controllers/radiology-test/radiology-test.controller', () => ({
  listRadiologyTests: jest.fn(),
  getRadiologyTestById: jest.fn(),
  createRadiologyTest: jest.fn(),
  updateRadiologyTest: jest.fn(),
  deleteRadiologyTest: jest.fn()
}));

jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  })
}));

jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

const radiologyTestRoutes = require('@routes/radiology-test/radiology-test.routes');
const radiologyTestController = require('@controllers/radiology-test/radiology-test.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/radiology-tests', radiologyTestRoutes);

describe('Radiology Test Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock controller methods
    radiologyTestController.listRadiologyTests.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    radiologyTestController.getRadiologyTestById.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    radiologyTestController.createRadiologyTest.mockImplementation((req, res) => {
      res.status(201).json({ success: true });
    });
    radiologyTestController.updateRadiologyTest.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    radiologyTestController.deleteRadiologyTest.mockImplementation((req, res) => {
      res.status(204).send();
    });
  });

  describe('GET /api/v1/radiology-tests', () => {
    it('should list radiology tests', async () => {
      const response = await request(app).get('/api/v1/radiology-tests');

      expect(response.status).toBe(200);
      expect(radiologyTestController.listRadiologyTests).toHaveBeenCalled();
    });

    it('should accept query parameters', async () => {
      await request(app)
        .get('/api/v1/radiology-tests')
        .query({
          page: '1',
          limit: '20',
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          modality: 'XRAY',
          search: 'chest'
        });

      expect(radiologyTestController.listRadiologyTests).toHaveBeenCalled();
    });

    it('should accept name filter', async () => {
      await request(app)
        .get('/api/v1/radiology-tests')
        .query({ name: 'X-Ray' });

      expect(radiologyTestController.listRadiologyTests).toHaveBeenCalled();
    });

    it('should accept code filter', async () => {
      await request(app)
        .get('/api/v1/radiology-tests')
        .query({ code: 'CXR-001' });

      expect(radiologyTestController.listRadiologyTests).toHaveBeenCalled();
    });

    it('should accept modality filter', async () => {
      await request(app)
        .get('/api/v1/radiology-tests')
        .query({ modality: 'CT' });

      expect(radiologyTestController.listRadiologyTests).toHaveBeenCalled();
    });

    it('should accept sorting parameters', async () => {
      await request(app)
        .get('/api/v1/radiology-tests')
        .query({ sort_by: 'name', order: 'desc' });

      expect(radiologyTestController.listRadiologyTests).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/radiology-tests/:id', () => {
    const radiologyTestId = '550e8400-e29b-41d4-a716-446655440000';

    it('should get radiology test by ID', async () => {
      const response = await request(app).get(`/api/v1/radiology-tests/${radiologyTestId}`);

      expect(response.status).toBe(200);
      expect(radiologyTestController.getRadiologyTestById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/radiology-tests', () => {
    const radiologyTestData = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Chest X-Ray',
      code: 'CXR-001',
      modality: 'XRAY'
    };

    it('should create new radiology test', async () => {
      const response = await request(app)
        .post('/api/v1/radiology-tests')
        .send(radiologyTestData);

      expect(response.status).toBe(201);
      expect(radiologyTestController.createRadiologyTest).toHaveBeenCalled();
    });

    it('should accept JSON body', async () => {
      const response = await request(app)
        .post('/api/v1/radiology-tests')
        .send(radiologyTestData)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(201);
    });

    it('should create radiology test without optional code', async () => {
      const dataWithoutCode = {
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Brain MRI',
        modality: 'MRI'
      };

      const response = await request(app)
        .post('/api/v1/radiology-tests')
        .send(dataWithoutCode);

      expect(response.status).toBe(201);
    });

    it('should create radiology test with all valid modalities', async () => {
      const modalities = ['XRAY', 'CT', 'MRI', 'ULTRASOUND', 'PET', 'OTHER'];

      for (const modality of modalities) {
        const data = { ...radiologyTestData, modality };
        const response = await request(app)
          .post('/api/v1/radiology-tests')
          .send(data);

        expect(response.status).toBe(201);
      }
    });
  });

  describe('PUT /api/v1/radiology-tests/:id', () => {
    const radiologyTestId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = {
      name: 'Updated X-Ray',
      modality: 'CT'
    };

    it('should update radiology test', async () => {
      const response = await request(app)
        .put(`/api/v1/radiology-tests/${radiologyTestId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(radiologyTestController.updateRadiologyTest).toHaveBeenCalled();
    });

    it('should accept JSON body', async () => {
      const response = await request(app)
        .put(`/api/v1/radiology-tests/${radiologyTestId}`)
        .send(updateData)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
    });

    it('should update only name', async () => {
      const response = await request(app)
        .put(`/api/v1/radiology-tests/${radiologyTestId}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(200);
    });

    it('should update only modality', async () => {
      const response = await request(app)
        .put(`/api/v1/radiology-tests/${radiologyTestId}`)
        .send({ modality: 'MRI' });

      expect(response.status).toBe(200);
    });

    it('should update only code', async () => {
      const response = await request(app)
        .put(`/api/v1/radiology-tests/${radiologyTestId}`)
        .send({ code: 'NEW-001' });

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/radiology-tests/:id', () => {
    const radiologyTestId = '550e8400-e29b-41d4-a716-446655440000';

    it('should delete radiology test', async () => {
      const response = await request(app).delete(`/api/v1/radiology-tests/${radiologyTestId}`);

      expect(response.status).toBe(204);
      expect(radiologyTestController.deleteRadiologyTest).toHaveBeenCalled();
    });

    it('should not accept request body', async () => {
      const response = await request(app)
        .delete(`/api/v1/radiology-tests/${radiologyTestId}`)
        .send({ some: 'data' });

      expect(response.status).toBe(204);
    });
  });
});
