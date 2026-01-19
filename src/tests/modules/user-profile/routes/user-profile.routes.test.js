/**
 * User profile routes tests
 *
 * @module tests/modules/user-profile/routes
 * @description Integration tests for user profile routes
 * Per testing.mdc: Test middleware application, validation, auth
 */

const request = require('supertest');
const express = require('express');
const userProfileRoutes = require('@routes/user-profile/user-profile.routes');
const userProfileController = require('@controllers/user-profile/user-profile.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/user-profiles', userProfileRoutes);

// Mock dependencies
jest.mock('@controllers/user-profile/user-profile.controller');
jest.mock('@middlewares/auth.middleware');
jest.mock('@middlewares/validate.middleware');

describe('User Profile Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { id: 'test-user-id' };
      next();
    });

    validateRequest.mockImplementation(() => (req, res, next) => next());

    userProfileController.listUserProfiles.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    userProfileController.getUserProfileById.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    userProfileController.createUserProfile.mockImplementation((req, res) => {
      res.status(201).json({ success: true });
    });
    userProfileController.updateUserProfile.mockImplementation((req, res) => {
      res.status(200).json({ success: true });
    });
    userProfileController.deleteUserProfile.mockImplementation((req, res) => {
      res.status(204).send();
    });
  });

  describe('GET /api/v1/user-profiles', () => {
    it('should list user profiles', async () => {
      const response = await request(app).get('/api/v1/user-profiles');

      expect(response.status).toBe(200);
      expect(userProfileController.listUserProfiles).toHaveBeenCalled();
    });

    it('should apply authentication and validation middlewares', async () => {
      await request(app).get('/api/v1/user-profiles');

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should accept query parameters', async () => {
      await request(app)
        .get('/api/v1/user-profiles')
        .query({
          user_id: '550e8400-e29b-41d4-a716-446655440000',
          gender: 'MALE',
          search: 'john'
        });

      expect(userProfileController.listUserProfiles).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/user-profiles/:id', () => {
    const profileId = '550e8400-e29b-41d4-a716-446655440000';

    it('should get user profile by ID', async () => {
      const response = await request(app).get(`/api/v1/user-profiles/${profileId}`);

      expect(response.status).toBe(200);
      expect(userProfileController.getUserProfileById).toHaveBeenCalled();
    });

    it('should apply middlewares', async () => {
      await request(app).get(`/api/v1/user-profiles/${profileId}`);

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/user-profiles', () => {
    const profileData = {
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      first_name: 'John',
      last_name: 'Doe'
    };

    it('should create new user profile', async () => {
      const response = await request(app)
        .post('/api/v1/user-profiles')
        .send(profileData);

      expect(response.status).toBe(201);
      expect(userProfileController.createUserProfile).toHaveBeenCalled();
    });

    it('should apply middlewares', async () => {
      await request(app).post('/api/v1/user-profiles').send(profileData);

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/user-profiles/:id', () => {
    const profileId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = { first_name: 'Jane' };

    it('should update user profile', async () => {
      const response = await request(app)
        .put(`/api/v1/user-profiles/${profileId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(userProfileController.updateUserProfile).toHaveBeenCalled();
    });

    it('should apply middlewares', async () => {
      await request(app).put(`/api/v1/user-profiles/${profileId}`).send(updateData);

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/user-profiles/:id', () => {
    const profileId = '550e8400-e29b-41d4-a716-446655440000';

    it('should delete user profile', async () => {
      const response = await request(app).delete(`/api/v1/user-profiles/${profileId}`);

      expect(response.status).toBe(204);
      expect(userProfileController.deleteUserProfile).toHaveBeenCalled();
    });

    it('should apply middlewares', async () => {
      await request(app).delete(`/api/v1/user-profiles/${profileId}`);

      expect(authenticate).toHaveBeenCalled();
      expect(validateRequest).toHaveBeenCalled();
    });
  });
});
