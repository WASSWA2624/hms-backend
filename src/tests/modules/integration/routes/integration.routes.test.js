/**
 * Integration routes tests
 *
 * @module tests/modules/integration/routes
 * @description Tests for integration route endpoints
 */

const request = require('supertest');
const express = require('express');
const integrationRoutes = require('@modules/integration/routes/integration.routes');
const integrationController = require('@controllers/integration/integration.controller');
const { validate } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('@controllers/integration/integration.controller');
jest.mock('@middlewares/validate.middleware', () => ({
  validate: jest.fn(() => (req, res, next) => next())
}));
jest.mock('@lib/async', () => ({
  asyncHandler: jest.fn((fn) => fn)
}));

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/v1/integrations', integrationRoutes);

describe('Integration Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/integrations', () => {
    it('should call listIntegrations controller', async () => {
      integrationController.listIntegrations.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const response = await request(app)
        .get('/api/v1/integrations')
        .expect(200);

      expect(integrationController.listIntegrations).toHaveBeenCalled();
    });

    it('should accept query parameters', async () => {
      integrationController.listIntegrations.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const response = await request(app)
        .get('/api/v1/integrations?page=1&limit=20')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/v1/integrations/:id', () => {
    it('should call getIntegration controller', async () => {
      integrationController.getIntegration.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: req.params.id } });
      });

      const integrationId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .get(`/api/v1/integrations/${integrationId}`)
        .expect(200);

      expect(integrationController.getIntegration).toHaveBeenCalled();
    });

    it('should accept valid UUID parameter', async () => {
      integrationController.getIntegration.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: req.params.id } });
      });

      const response = await request(app)
        .get('/api/v1/integrations/123e4567-e89b-12d3-a456-426614174000')
        .expect(200);

      expect(response.body.data).toHaveProperty('id');
    });
  });

  describe('POST /api/v1/integrations', () => {
    it('should call createIntegration controller', async () => {
      integrationController.createIntegration.mockImplementation((req, res) => {
        res.status(201).json({ data: req.body });
      });

      const integrationData = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174000',
        integration_type: 'HL7',
        status: 'ACTIVE',
        name: 'Test Integration'
      };

      const response = await request(app)
        .post('/api/v1/integrations')
        .send(integrationData)
        .expect(201);

      expect(integrationController.createIntegration).toHaveBeenCalled();
    });

    it('should accept valid request body', async () => {
      integrationController.createIntegration.mockImplementation((req, res) => {
        res.status(201).json({ data: req.body });
      });

      const response = await request(app)
        .post('/api/v1/integrations')
        .send({
          tenant_id: '123e4567-e89b-12d3-a456-426614174000',
          integration_type: 'HL7',
          status: 'ACTIVE',
          name: 'Test'
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('name');
    });
  });

  describe('PUT /api/v1/integrations/:id', () => {
    it('should call updateIntegration controller', async () => {
      integrationController.updateIntegration.mockImplementation((req, res) => {
        res.status(200).json({ data: { ...req.body, id: req.params.id } });
      });

      const integrationId = '123e4567-e89b-12d3-a456-426614174000';
      const updateData = { name: 'Updated Integration' };

      const response = await request(app)
        .put(`/api/v1/integrations/${integrationId}`)
        .send(updateData)
        .expect(200);

      expect(integrationController.updateIntegration).toHaveBeenCalled();
    });

    it('should accept valid request body and parameters', async () => {
      integrationController.updateIntegration.mockImplementation((req, res) => {
        res.status(200).json({ data: { ...req.body, id: req.params.id } });
      });

      const response = await request(app)
        .put('/api/v1/integrations/123e4567-e89b-12d3-a456-426614174000')
        .send({ name: 'Updated' })
        .expect(200);

      expect(response.body.data).toHaveProperty('name');
    });
  });

  describe('DELETE /api/v1/integrations/:id', () => {
    it('should call deleteIntegration controller', async () => {
      integrationController.deleteIntegration.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const integrationId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app)
        .delete(`/api/v1/integrations/${integrationId}`)
        .expect(204);

      expect(integrationController.deleteIntegration).toHaveBeenCalled();
    });

    it('should accept valid UUID for delete', async () => {
      integrationController.deleteIntegration.mockImplementation((req, res) => {
        res.status(204).send();
      });

      await request(app)
        .delete('/api/v1/integrations/123e4567-e89b-12d3-a456-426614174000')
        .expect(204);

      expect(integrationController.deleteIntegration).toHaveBeenCalled();
    });
  });
});
