/**
 * Patient Medical History routes tests
 *
 * @module tests/modules/patient-medical-history/routes
 * Per testing.mdc: Test route configuration
 */

const express = require('express');
const request = require('supertest');

// Mock middleware and controllers before requiring routes
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123', tenant_id: 'tenant-123' };
    next();
  })
}));

jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

jest.mock('@lib/async', () => ({
  asyncHandler: jest.fn((fn) => fn)
}));

jest.mock('@controllers/patient-medical-history/patient-medical-history.controller', () => ({
  listPatientMedicalHistories: jest.fn((req, res) => res.status(200).json({ success: true })),
  getPatientMedicalHistoryById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createPatientMedicalHistory: jest.fn((req, res) => res.status(201).json({ success: true })),
  updatePatientMedicalHistory: jest.fn((req, res) => res.status(200).json({ success: true })),
  deletePatientMedicalHistory: jest.fn((req, res) => res.status(204).send())
}));

const patientMedicalHistoryController = require('@controllers/patient-medical-history/patient-medical-history.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');
const router = require('@modules/patient-medical-history/routes/patient-medical-history.routes');

describe('Patient Medical History Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/patient-medical-histories', router);
  });

  describe('GET /patient-medical-histories', () => {
    it('should be defined', async () => {
      const response = await request(app)
        .get('/patient-medical-histories')
        .expect(200);

      expect(patientMedicalHistoryController.listPatientMedicalHistories).toHaveBeenCalled();
    });

    it('should apply authenticate middleware', async () => {
      await request(app).get('/patient-medical-histories');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validateRequest middleware', async () => {
      await request(app).get('/patient-medical-histories');

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('GET /patient-medical-histories/:id', () => {
    it('should be defined', async () => {
      const response = await request(app)
        .get('/patient-medical-histories/history-123')
        .expect(200);

      expect(patientMedicalHistoryController.getPatientMedicalHistoryById).toHaveBeenCalled();
    });

    it('should apply authenticate middleware', async () => {
      await request(app).get('/patient-medical-histories/history-123');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validateRequest middleware', async () => {
      await request(app).get('/patient-medical-histories/history-123');

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('POST /patient-medical-histories', () => {
    it('should be defined', async () => {
      const response = await request(app)
        .post('/patient-medical-histories')
        .send({})
        .expect(201);

      expect(patientMedicalHistoryController.createPatientMedicalHistory).toHaveBeenCalled();
    });

    it('should apply authenticate middleware', async () => {
      await request(app).post('/patient-medical-histories').send({});

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validateRequest middleware', async () => {
      await request(app).post('/patient-medical-histories').send({});

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('PUT /patient-medical-histories/:id', () => {
    it('should be defined', async () => {
      const response = await request(app)
        .put('/patient-medical-histories/history-123')
        .send({})
        .expect(200);

      expect(patientMedicalHistoryController.updatePatientMedicalHistory).toHaveBeenCalled();
    });

    it('should apply authenticate middleware', async () => {
      await request(app).put('/patient-medical-histories/history-123').send({});

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validateRequest middleware', async () => {
      await request(app).put('/patient-medical-histories/history-123').send({});

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('DELETE /patient-medical-histories/:id', () => {
    it('should be defined', async () => {
      const response = await request(app)
        .delete('/patient-medical-histories/history-123')
        .expect(204);

      expect(patientMedicalHistoryController.deletePatientMedicalHistory).toHaveBeenCalled();
    });

    it('should apply authenticate middleware', async () => {
      await request(app).delete('/patient-medical-histories/history-123');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validateRequest middleware', async () => {
      await request(app).delete('/patient-medical-histories/history-123');

      expect(validateRequest).toHaveBeenCalled();
    });
  });
});
