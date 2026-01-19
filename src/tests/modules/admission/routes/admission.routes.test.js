/**
 * Admission routes tests
 *
 * @module tests/modules/admission/routes
 * @description Tests for admission route endpoints
 */

const request = require('supertest');
const express = require('express');
const admissionRoutes = require('../../../../modules/admission/routes/admission.routes');
const admissionController = require('../../../../modules/admission/controllers/admission.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('../../../../modules/admission/controllers/admission.controller');
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-id' };
    next();
  })
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

describe('Admission Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/admissions', admissionRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/admissions', () => {
    it('should call listAdmissions controller', async () => {
      admissionController.listAdmissions.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      const response = await request(app).get('/api/v1/admissions');

      expect(admissionController.listAdmissions).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/admissions/:id', () => {
    it('should call getAdmissionById controller', async () => {
      admissionController.getAdmissionById.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: 'test-id' } });
      });

      const response = await request(app).get('/api/v1/admissions/test-id');

      expect(admissionController.getAdmissionById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/admissions', () => {
    it('should call createAdmission controller', async () => {
      admissionController.createAdmission.mockImplementation((req, res) => {
        res.status(201).json({ data: { id: 'new-id' } });
      });

      const admissionData = {
        tenant_id: 'tenant-id',
        patient_id: 'patient-id',
        status: 'ADMITTED'
      };

      const response = await request(app)
        .post('/api/v1/admissions')
        .send(admissionData);

      expect(admissionController.createAdmission).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/admissions/:id', () => {
    it('should call updateAdmission controller', async () => {
      admissionController.updateAdmission.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: 'test-id' } });
      });

      const updateData = { status: 'DISCHARGED' };

      const response = await request(app)
        .put('/api/v1/admissions/test-id')
        .send(updateData);

      expect(admissionController.updateAdmission).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/admissions/:id', () => {
    it('should call deleteAdmission controller', async () => {
      admissionController.deleteAdmission.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app).delete('/api/v1/admissions/test-id');

      expect(admissionController.deleteAdmission).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/admissions/:id/discharge', () => {
    it('should call dischargeAdmission controller', async () => {
      admissionController.dischargeAdmission.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: 'test-id', status: 'DISCHARGED' } });
      });

      const dischargeData = { discharged_at: '2026-01-20T10:00:00Z' };

      const response = await request(app)
        .post('/api/v1/admissions/test-id/discharge')
        .send(dischargeData);

      expect(admissionController.dischargeAdmission).toHaveBeenCalled();
    });
  });
});
