/**
 * Ambulance Trip routes tests
 *
 * @module tests/modules/ambulance-trip/routes
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

jest.mock('@controllers/ambulance-trip/ambulance-trip.controller', () => ({
  listAmbulanceTrips: jest.fn((req, res) => res.status(200).json({ success: true })),
  getAmbulanceTripById: jest.fn((req, res) => res.status(200).json({ success: true })),
  createAmbulanceTrip: jest.fn((req, res) => res.status(201).json({ success: true })),
  updateAmbulanceTrip: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteAmbulanceTrip: jest.fn((req, res) => res.status(204).send())
}));

const ambulanceTripRoutes = require('@modules/ambulance-trip/routes/ambulance-trip.routes');

const app = express();
app.use(express.json());
app.use('/ambulance-trips', ambulanceTripRoutes);

describe('Ambulance Trip Routes', () => {
  describe('GET /ambulance-trips', () => {
    it('should return 200 for list trips', async () => {
      const response = await request(app)
        .get('/ambulance-trips')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /ambulance-trips/:id', () => {
    it('should return 200 for get trip by ID', async () => {
      const response = await request(app)
        .get('/ambulance-trips/123e4567-e89b-12d3-a456-426614174000')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /ambulance-trips', () => {
    it('should return 201 for create trip', async () => {
      const response = await request(app)
        .post('/ambulance-trips')
        .send({
          ambulance_id: '123e4567-e89b-12d3-a456-426614174000',
          emergency_case_id: '123e4567-e89b-12d3-a456-426614174001'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /ambulance-trips/:id', () => {
    it('should return 200 for update trip', async () => {
      const response = await request(app)
        .put('/ambulance-trips/123e4567-e89b-12d3-a456-426614174000')
        .send({ started_at: '2026-01-19T10:00:00Z' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /ambulance-trips/:id', () => {
    it('should return 204 for delete trip', async () => {
      await request(app)
        .delete('/ambulance-trips/123e4567-e89b-12d3-a456-426614174000')
        .expect(204);
    });
  });
});
