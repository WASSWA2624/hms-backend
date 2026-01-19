/**
 * Template Variable routes tests
 */

const request = require('supertest');
const express = require('express');
const templateVariableRoutes = require('@modules/template-variable/routes/template-variable.routes');
const templateVariableController = require('@modules/template-variable/controllers/template-variable.controller');

jest.mock('@modules/template-variable/controllers/template-variable.controller');
jest.mock('@middlewares/validate.middleware', () => ({
  validate: () => (req, res, next) => next()
}));

describe('Template Variable Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/template-variables', templateVariableRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/template-variables', () => {
    it('should call listTemplateVariables', async () => {
      templateVariableController.listTemplateVariables.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });
      const response = await request(app).get('/api/v1/template-variables');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/template-variables/:id', () => {
    it('should call getTemplateVariable', async () => {
      templateVariableController.getTemplateVariable.mockImplementation((req, res) => {
        res.status(200).json({ data: {} });
      });
      const response = await request(app).get('/api/v1/template-variables/123e4567-e89b-12d3-a456-426614174000');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/template-variables', () => {
    it('should call createTemplateVariable', async () => {
      templateVariableController.createTemplateVariable.mockImplementation((req, res) => {
        res.status(201).json({ data: {} });
      });
      const response = await request(app).post('/api/v1/template-variables').send({
        template_id: '123e4567-e89b-12d3-a456-426614174000',
        key: 'test_key'
      });
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/v1/template-variables/:id', () => {
    it('should call updateTemplateVariable', async () => {
      templateVariableController.updateTemplateVariable.mockImplementation((req, res) => {
        res.status(200).json({ data: {} });
      });
      const response = await request(app).put('/api/v1/template-variables/123e4567-e89b-12d3-a456-426614174000').send({ key: 'new' });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/template-variables/:id', () => {
    it('should call deleteTemplateVariable', async () => {
      templateVariableController.deleteTemplateVariable.mockImplementation((req, res) => {
        res.status(204).send();
      });
      const response = await request(app).delete('/api/v1/template-variables/123e4567-e89b-12d3-a456-426614174000');
      expect(response.status).toBe(204);
    });
  });
});
