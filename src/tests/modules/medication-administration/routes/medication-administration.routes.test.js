/**
 * Medication administration routes tests
 *
 * @module tests/modules/medication-administration/routes
 * Per testing.mdc: Test route configuration and middleware application
 */

const express = require('express');
const request = require('supertest');

jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123' };
    next();
  })
}));

jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

jest.mock('@controllers/medication-administration/medication-administration.controller', () => ({
  listMedicationAdministrations: jest.fn((req, res) => res.status(200).json({ data: [] })),
  getMedicationAdministrationById: jest.fn((req, res) => res.status(200).json({ data: {} })),
  createMedicationAdministration: jest.fn((req, res) => res.status(201).json({ data: {} })),
  updateMedicationAdministration: jest.fn((req, res) => res.status(200).json({ data: {} })),
  deleteMedicationAdministration: jest.fn((req, res) => res.status(204).send())
}));

const medicationAdministrationRoutes = require('@routes/medication-administration/medication-administration.routes');
const { authenticate } = require('@middlewares/auth.middleware');

const app = express();
app.use(express.json());
app.use('/medication-administrations', medicationAdministrationRoutes);

describe('Medication Administration Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /medication-administrations', () => {
    it('should call authenticate middleware', async () => {
      await request(app).get('/medication-administrations');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/medication-administrations');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /medication-administrations/:id', () => {
    it('should return 200 status', async () => {
      const response = await request(app).get('/medication-administrations/med-123');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /medication-administrations', () => {
    it('should return 201 status', async () => {
      const response = await request(app).post('/medication-administrations').send({});
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /medication-administrations/:id', () => {
    it('should return 200 status', async () => {
      const response = await request(app).put('/medication-administrations/med-123').send({});
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /medication-administrations/:id', () => {
    it('should return 204 status', async () => {
      const response = await request(app).delete('/medication-administrations/med-123');
      expect(response.status).toBe(204);
    });
  });
});
