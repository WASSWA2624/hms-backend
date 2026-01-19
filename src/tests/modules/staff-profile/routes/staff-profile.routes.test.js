/**
 * Staff profile routes tests
 *
 * @module tests/modules/staff-profile/routes
 * @description Tests for staff profile route endpoints
 */

const request = require('supertest');
const express = require('express');
const staffProfileRoutes = require('../../../../modules/staff-profile/routes/staff-profile.routes');
const staffProfileController = require('../../../../modules/staff-profile/controllers/staff-profile.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('../../../../modules/staff-profile/controllers/staff-profile.controller');
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-id' };
    next();
  })
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

describe('Staff Profile Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/staff-profiles', staffProfileRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/staff-profiles', () => {
    it('should call listStaffProfiles controller', async () => {
      staffProfileController.listStaffProfiles.mockImplementation((req, res) => {
        res.status(200).json({ data: [] });
      });

      await request(app).get('/api/v1/staff-profiles');

      expect(staffProfileController.listStaffProfiles).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/staff-profiles/:id', () => {
    it('should call getStaffProfileById controller', async () => {
      staffProfileController.getStaffProfileById.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: 'test-id' } });
      });

      await request(app).get('/api/v1/staff-profiles/test-id');

      expect(staffProfileController.getStaffProfileById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/staff-profiles', () => {
    it('should call createStaffProfile controller', async () => {
      staffProfileController.createStaffProfile.mockImplementation((req, res) => {
        res.status(201).json({ data: { id: 'new-id' } });
      });

      await request(app)
        .post('/api/v1/staff-profiles')
        .send({ tenant_id: 'tenant-id', user_id: 'user-id' });

      expect(staffProfileController.createStaffProfile).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/staff-profiles/:id', () => {
    it('should call updateStaffProfile controller', async () => {
      staffProfileController.updateStaffProfile.mockImplementation((req, res) => {
        res.status(200).json({ data: { id: 'test-id' } });
      });

      await request(app)
        .put('/api/v1/staff-profiles/test-id')
        .send({ position: 'Senior Nurse' });

      expect(staffProfileController.updateStaffProfile).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/staff-profiles/:id', () => {
    it('should call deleteStaffProfile controller', async () => {
      staffProfileController.deleteStaffProfile.mockImplementation((req, res) => {
        res.status(204).send();
      });

      await request(app).delete('/api/v1/staff-profiles/test-id');

      expect(staffProfileController.deleteStaffProfile).toHaveBeenCalled();
    });
  });
});
