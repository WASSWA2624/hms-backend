/**
 * Template routes tests
 *
 * @module tests/modules/template/routes
 * @description Tests for template route definitions
 */

const request = require('supertest');
const express = require('express');
const templateRoutes = require('@modules/template/routes/template.routes');
const templateController = require('@modules/template/controllers/template.controller');

// Mock dependencies
jest.mock('@modules/template/controllers/template.controller');
jest.mock('@middlewares/validate.middleware', () => ({
  validate: () => (req, res, next) => next()
}));

describe('Template Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/templates', templateRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/templates', () => {
    it('should call listTemplates controller', async () => {
      templateController.listTemplates.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const response = await request(app).get('/api/v1/templates');

      expect(templateController.listTemplates).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/templates/:id', () => {
    it('should call getTemplate controller', async () => {
      const templateId = '123e4567-e89b-12d3-a456-426614174000';
      templateController.getTemplate.mockImplementation((req, res) => {
        res.status(200).json({ data: {} });
      });

      const response = await request(app).get(`/api/v1/templates/${templateId}`);

      expect(templateController.getTemplate).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/templates', () => {
    it('should call createTemplate controller', async () => {
      templateController.createTemplate.mockImplementation((req, res) => {
        res.status(201).json({ data: {} });
      });

      const response = await request(app)
        .post('/api/v1/templates')
        .send({
          tenant_id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Template',
          channel: 'EMAIL',
          body: 'Template body'
        });

      expect(templateController.createTemplate).toHaveBeenCalled();
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/templates/:id', () => {
    it('should call updateTemplate controller', async () => {
      const templateId = '123e4567-e89b-12d3-a456-426614174000';
      templateController.updateTemplate.mockImplementation((req, res) => {
        res.status(200).json({ data: {} });
      });

      const response = await request(app)
        .put(`/api/v1/templates/${templateId}`)
        .send({ name: 'Updated Template' });

      expect(templateController.updateTemplate).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/templates/:id', () => {
    it('should call deleteTemplate controller', async () => {
      const templateId = '123e4567-e89b-12d3-a456-426614174000';
      templateController.deleteTemplate.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app).delete(`/api/v1/templates/${templateId}`);

      expect(templateController.deleteTemplate).toHaveBeenCalled();
      expect(response.status).toBe(204);
    });
  });
});
