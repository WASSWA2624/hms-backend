/**
 * Patient Allergy routes tests
 *
 * @module tests/modules/patient-allergy/routes
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

jest.mock('@controllers/patient-allergy/patient-allergy.controller', () => ({
  listPatientAllergies: jest.fn((req, res) => res.status(200).json({ success: true })),
  getPatientAllergyById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createPatientAllergy: jest.fn((req, res) => res.status(201).json({ success: true })),
  updatePatientAllergy: jest.fn((req, res) => res.status(200).json({ success: true })),
  deletePatientAllergy: jest.fn((req, res) => res.status(204).send())
}));

const patientAllergyController = require('@controllers/patient-allergy/patient-allergy.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');
const router = require('@modules/patient-allergy/routes/patient-allergy.routes');

describe('Patient Allergy Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/patient-allergies', router);
  });

  describe('GET /patient-allergies', () => {
    it('should be defined', async () => {
      const response = await request(app)
        .get('/patient-allergies')
        .expect(200);

      expect(patientAllergyController.listPatientAllergies).toHaveBeenCalled();
    });

    it('should apply authenticate middleware', async () => {
      await request(app).get('/patient-allergies');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validateRequest middleware', async () => {
      await request(app).get('/patient-allergies');

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('GET /patient-allergies/:id', () => {
    it('should be defined', async () => {
      const response = await request(app)
        .get('/patient-allergies/allergy-123')
        .expect(200);

      expect(patientAllergyController.getPatientAllergyById).toHaveBeenCalled();
    });

    it('should apply authenticate middleware', async () => {
      await request(app).get('/patient-allergies/allergy-123');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validateRequest middleware', async () => {
      await request(app).get('/patient-allergies/allergy-123');

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('POST /patient-allergies', () => {
    it('should be defined', async () => {
      const response = await request(app)
        .post('/patient-allergies')
        .send({})
        .expect(201);

      expect(patientAllergyController.createPatientAllergy).toHaveBeenCalled();
    });

    it('should apply authenticate middleware', async () => {
      await request(app).post('/patient-allergies').send({});

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validateRequest middleware', async () => {
      await request(app).post('/patient-allergies').send({});

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('PUT /patient-allergies/:id', () => {
    it('should be defined', async () => {
      const response = await request(app)
        .put('/patient-allergies/allergy-123')
        .send({})
        .expect(200);

      expect(patientAllergyController.updatePatientAllergy).toHaveBeenCalled();
    });

    it('should apply authenticate middleware', async () => {
      await request(app).put('/patient-allergies/allergy-123').send({});

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validateRequest middleware', async () => {
      await request(app).put('/patient-allergies/allergy-123').send({});

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('DELETE /patient-allergies/:id', () => {
    it('should be defined', async () => {
      const response = await request(app)
        .delete('/patient-allergies/allergy-123')
        .expect(204);

      expect(patientAllergyController.deletePatientAllergy).toHaveBeenCalled();
    });

    it('should apply authenticate middleware', async () => {
      await request(app).delete('/patient-allergies/allergy-123');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validateRequest middleware', async () => {
      await request(app).delete('/patient-allergies/allergy-123');

      expect(validateRequest).toHaveBeenCalled();
    });
  });
});
