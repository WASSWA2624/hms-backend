/**
 * Post-op note routes tests
 *
 * @module tests/modules/post-op-note/routes
 * @description Tests for Post-op note API endpoints
 * Per testing.mdc: Route tests must validate HTTP methods, status codes, and response format
 */

const request = require('supertest');
const express = require('express');
const postOpNoteRoutes = require('@routes/post-op-note/post-op-note.routes');
const postOpNoteController = require('@controllers/post-op-note/post-op-note.controller');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('@controllers/post-op-note/post-op-note.controller');
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123' };
    next();
  })
}));
jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/v1/post-op-notes', postOpNoteRoutes);

describe('Post-op note Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/post-op-notes', () => {
    it('should call listpostOpNotes controller', async () => {
      postOpNoteController.listpostOpNotes.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get('/api/v1/post-op-notes');

      expect(response.status).toBe(200);
      expect(postOpNoteController.listpostOpNotes).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/post-op-notes/:id', () => {
    const postOpNoteId = '550e8400-e29b-41d4-a716-446655440000';

    it('should call getpostOpNoteById controller', async () => {
      postOpNoteController.getpostOpNoteById.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app).get(`/api/v1/post-op-notes/${postOpNoteId}`);

      expect(response.status).toBe(200);
      expect(postOpNoteController.getpostOpNoteById).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/post-op-notes', () => {
    const createData = {
      encounter_id: '550e8400-e29b-41d4-a716-446655440001',
      scheduled_at: '2026-01-20T10:00:00.000Z',
      status: 'SCHEDULED'
    };

    it('should call createpostOpNote controller', async () => {
      postOpNoteController.createpostOpNote.mockImplementation((req, res) => {
        res.status(201).json({ success: true });
      });

      const response = await request(app)
        .post('/api/v1/post-op-notes')
        .send(createData);

      expect(response.status).toBe(201);
      expect(postOpNoteController.createpostOpNote).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/post-op-notes/:id', () => {
    const postOpNoteId = '550e8400-e29b-41d4-a716-446655440000';
    const updateData = {
      status: 'IN_PROGRESS'
    };

    it('should call updatepostOpNote controller', async () => {
      postOpNoteController.updatepostOpNote.mockImplementation((req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .put(`/api/v1/post-op-notes/${postOpNoteId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(postOpNoteController.updatepostOpNote).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/post-op-notes/:id', () => {
    const postOpNoteId = '550e8400-e29b-41d4-a716-446655440000';

    it('should call deletepostOpNote controller', async () => {
      postOpNoteController.deletepostOpNote.mockImplementation((req, res) => {
        res.status(204).send();
      });

      const response = await request(app).delete(`/api/v1/post-op-notes/${postOpNoteId}`);

      expect(response.status).toBe(204);
      expect(postOpNoteController.deletepostOpNote).toHaveBeenCalled();
    });
  });
});
