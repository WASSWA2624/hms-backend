/**
 * License routes tests
 *
 * @module tests/modules/license/routes
 * Per testing.mdc: Test all route configurations
 */

const express = require('express');
const request = require('supertest');

jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123', tenant_id: 'tenant-123' };
    next();
  })
}));

jest.mock('@controllers/license/license.controller', () => ({
  listLicenses: jest.fn((req, res) => res.status(200).json({ data: [] })),
  getLicenseById: jest.fn((req, res) => res.status(200).json({ data: {} })),
  createLicense: jest.fn((req, res) => res.status(201).json({ data: {} })),
  updateLicense: jest.fn((req, res) => res.status(200).json({ data: {} })),
  deleteLicense: jest.fn((req, res) => res.status(204).send())
}));

const licenseController = require('@controllers/license/license.controller');
const licenseRoutes = require('@routes/license/license.routes');

describe('License Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/licenses', licenseRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/licenses', () => {
    it('should call listLicenses controller', async () => {
      await request(app).get('/api/v1/licenses').expect(200);
      expect(licenseController.listLicenses).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/licenses/:id', () => {
    it('should call getLicenseById controller', async () => {
      await request(app)
        .get('/api/v1/licenses/123e4567-e89b-12d3-a456-426614174000')
        .expect(200);
      expect(licenseController.getLicenseById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/licenses', () => {
    it('should call createLicense controller', async () => {
      const data = {
        tenant_id: '123e4567-e89b-12d3-a456-426614174000',
        license_type: 'PER_USER',
        status: 'ACTIVE'
      };
      await request(app).post('/api/v1/licenses').send(data).expect(201);
      expect(licenseController.createLicense).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/licenses/:id', () => {
    it('should call updateLicense controller', async () => {
      await request(app)
        .put('/api/v1/licenses/123e4567-e89b-12d3-a456-426614174000')
        .send({ status: 'CANCELLED' })
        .expect(200);
      expect(licenseController.updateLicense).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/licenses/:id', () => {
    it('should call deleteLicense controller', async () => {
      await request(app)
        .delete('/api/v1/licenses/123e4567-e89b-12d3-a456-426614174000')
        .expect(204);
      expect(licenseController.deleteLicense).toHaveBeenCalled();
    });
  });
});
