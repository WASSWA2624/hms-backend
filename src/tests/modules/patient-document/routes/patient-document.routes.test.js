/**
 * Patient Document routes tests
 *
 * @module tests/modules/patient-document/routes
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

jest.mock('@controllers/patient-document/patient-document.controller', () => ({
  listPatientDocuments: jest.fn((req, res) => res.status(200).json({ success: true })),
  getPatientDocumentById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createPatientDocument: jest.fn((req, res) => res.status(201).json({ success: true })),
  updatePatientDocument: jest.fn((req, res) => res.status(200).json({ success: true })),
  deletePatientDocument: jest.fn((req, res) => res.status(204).send())
}));

const patientDocumentController = require('@controllers/patient-document/patient-document.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');
const router = require('@modules/patient-document/routes/patient-document.routes');

describe('Patient Document Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/patient-documents', router);
  });

  describe('GET /patient-documents', () => {
    it('should be defined', async () => {
      const response = await request(app)
        .get('/patient-documents')
        .expect(200);

      expect(patientDocumentController.listPatientDocuments).toHaveBeenCalled();
    });

    it('should apply authenticate middleware', async () => {
      await request(app).get('/patient-documents');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validateRequest middleware', async () => {
      await request(app).get('/patient-documents');

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('GET /patient-documents/:id', () => {
    it('should be defined', async () => {
      const response = await request(app)
        .get('/patient-documents/doc-123')
        .expect(200);

      expect(patientDocumentController.getPatientDocumentById).toHaveBeenCalled();
    });

    it('should apply authenticate middleware', async () => {
      await request(app).get('/patient-documents/doc-123');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validateRequest middleware', async () => {
      await request(app).get('/patient-documents/doc-123');

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('POST /patient-documents', () => {
    it('should be defined', async () => {
      const response = await request(app)
        .post('/patient-documents')
        .send({})
        .expect(201);

      expect(patientDocumentController.createPatientDocument).toHaveBeenCalled();
    });

    it('should apply authenticate middleware', async () => {
      await request(app).post('/patient-documents').send({});

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validateRequest middleware', async () => {
      await request(app).post('/patient-documents').send({});

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('PUT /patient-documents/:id', () => {
    it('should be defined', async () => {
      const response = await request(app)
        .put('/patient-documents/doc-123')
        .send({})
        .expect(200);

      expect(patientDocumentController.updatePatientDocument).toHaveBeenCalled();
    });

    it('should apply authenticate middleware', async () => {
      await request(app).put('/patient-documents/doc-123').send({});

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validateRequest middleware', async () => {
      await request(app).put('/patient-documents/doc-123').send({});

      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('DELETE /patient-documents/:id', () => {
    it('should be defined', async () => {
      const response = await request(app)
        .delete('/patient-documents/doc-123')
        .expect(204);

      expect(patientDocumentController.deletePatientDocument).toHaveBeenCalled();
    });

    it('should apply authenticate middleware', async () => {
      await request(app).delete('/patient-documents/doc-123');

      expect(authenticate).toHaveBeenCalled();
    });

    it('should apply validateRequest middleware', async () => {
      await request(app).delete('/patient-documents/doc-123');

      expect(validateRequest).toHaveBeenCalled();
    });
  });
});
