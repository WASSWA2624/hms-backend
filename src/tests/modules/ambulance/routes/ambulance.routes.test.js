/**
 * Ambulance routes tests
 *
 * @module tests/modules/ambulance/routes
 * Per testing.mdc: Test route definitions and middleware
 */

const express = require('express');
const request = require('supertest');

// Mock middleware
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123', tenant_id: 'tenant-123' };
    next();
  })
}));

// Mock controller
jest.mock('@controllers/ambulance/ambulance.controller', () => ({
  listAmbulances: jest.fn((req, res) => res.status(200).json({ success: true })),
  getAmbulanceById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createAmbulance: jest.fn((req, res) => res.status(201).json({ success: true })),
  updateAmbulance: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteAmbulance: jest.fn((req, res) => res.status(204).send())
}));

const ambulanceRoutes = require('@modules/ambulance/routes/ambulance.routes');

const app = express();
app.use(express.json());
app.use('/ambulances', ambulanceRoutes);

describe('Ambulance Routes', () => {
  describe('GET /ambulances', () => {
    it('should return 200 for list ambulances', async () => {
      const response = await request(app)
        .get('/ambulances')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /ambulances/:id', () => {
    it('should return 200 for get ambulance by ID', async () => {
      const response = await request(app)
        .get('/ambulances/123e4567-e89b-12d3-a456-426614174000')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /ambulances', () => {
    it('should return 201 for create ambulance', async () => {
      const response = await request(app)
        .post('/ambulances')
        .send({
          tenant_id: '123e4567-e89b-12d3-a456-426614174000',
          identifier: 'AMB-001',
          status: 'AVAILABLE'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /ambulances/:id', () => {
    it('should return 200 for update ambulance', async () => {
      const response = await request(app)
        .put('/ambulances/123e4567-e89b-12d3-a456-426614174000')
        .send({
          identifier: 'AMB-UPDATED'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /ambulances/:id', () => {
    it('should return 204 for delete ambulance', async () => {
      await request(app)
        .delete('/ambulances/123e4567-e89b-12d3-a456-426614174000')
        .expect(204);
    });
  });
});
