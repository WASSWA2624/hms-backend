/**
 * Ambulance Dispatch routes tests
 *
 * @module tests/modules/ambulance-dispatch/routes
 * Per testing.mdc: Test route definitions and middleware
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

jest.mock('@controllers/ambulance-dispatch/ambulance-dispatch.controller', () => ({
  listAmbulanceDispatches: jest.fn((req, res) => res.status(200).json({ success: true })),
  getAmbulanceDispatchById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createAmbulanceDispatch: jest.fn((req, res) => res.status(201).json({ success: true })),
  updateAmbulanceDispatch: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteAmbulanceDispatch: jest.fn((req, res) => res.status(204).send())
}));

const ambulanceDispatchRoutes = require('@modules/ambulance-dispatch/routes/ambulance-dispatch.routes');

const app = express();
app.use(express.json());
app.use('/ambulance-dispatches', ambulanceDispatchRoutes);

describe('Ambulance Dispatch Routes', () => {
  describe('GET /ambulance-dispatches', () => {
    it('should return 200 for list dispatches', async () => {
      const response = await request(app)
        .get('/ambulance-dispatches')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /ambulance-dispatches/:id', () => {
    it('should return 200 for get dispatch by ID', async () => {
      const response = await request(app)
        .get('/ambulance-dispatches/123e4567-e89b-12d3-a456-426614174000')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /ambulance-dispatches', () => {
    it('should return 201 for create dispatch', async () => {
      const response = await request(app)
        .post('/ambulance-dispatches')
        .send({
          ambulance_id: '123e4567-e89b-12d3-a456-426614174000',
          emergency_case_id: '123e4567-e89b-12d3-a456-426614174001',
          status: 'DISPATCHED'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /ambulance-dispatches/:id', () => {
    it('should return 200 for update dispatch', async () => {
      const response = await request(app)
        .put('/ambulance-dispatches/123e4567-e89b-12d3-a456-426614174000')
        .send({ status: 'ON_SCENE' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /ambulance-dispatches/:id', () => {
    it('should return 204 for delete dispatch', async () => {
      await request(app)
        .delete('/ambulance-dispatches/123e4567-e89b-12d3-a456-426614174000')
        .expect(204);
    });
  });
});
