/**
 * Nursing note routes tests
 *
 * @module tests/modules/nursing-note/routes
 * Per testing.mdc: Test route configuration and middleware application
 */

const express = require('express');
const request = require('supertest');

// Mock middlewares and controller
jest.mock('@middlewares/auth.middleware', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123' };
    next();
  })
}));

jest.mock('@middlewares/validate.middleware', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

jest.mock('@controllers/nursing-note/nursing-note.controller', () => ({
  listNursingNotes: jest.fn((req, res) => res.status(200).json({ data: [] })),
  getNursingNoteById: jest.fn((req, res) => res.status(200).json({ data: {} })),
  createNursingNote: jest.fn((req, res) => res.status(201).json({ data: {} })),
  updateNursingNote: jest.fn((req, res) => res.status(200).json({ data: {} })),
  deleteNursingNote: jest.fn((req, res) => res.status(204).send())
}));

const nursingNoteRoutes = require('@routes/nursing-note/nursing-note.routes');
const { authenticate } = require('@middlewares/auth.middleware');
const { validateRequest } = require('@middlewares/validate.middleware');

const app = express();
app.use(express.json());
app.use('/nursing-notes', nursingNoteRoutes);

describe('Nursing Note Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /nursing-notes', () => {
    it('should call authenticate middleware', async () => {
      await request(app).get('/nursing-notes');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should call validateRequest middleware', async () => {
      await request(app).get('/nursing-notes');
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/nursing-notes');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /nursing-notes/:id', () => {
    it('should call authenticate middleware', async () => {
      await request(app).get('/nursing-notes/note-123');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should call validateRequest middleware', async () => {
      await request(app).get('/nursing-notes/note-123');
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).get('/nursing-notes/note-123');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /nursing-notes', () => {
    it('should call authenticate middleware', async () => {
      await request(app).post('/nursing-notes').send({});
      expect(authenticate).toHaveBeenCalled();
    });

    it('should call validateRequest middleware', async () => {
      await request(app).post('/nursing-notes').send({});
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 201 status', async () => {
      const response = await request(app).post('/nursing-notes').send({});
      expect(response.status).toBe(201);
    });
  });

  describe('PUT /nursing-notes/:id', () => {
    it('should call authenticate middleware', async () => {
      await request(app).put('/nursing-notes/note-123').send({});
      expect(authenticate).toHaveBeenCalled();
    });

    it('should call validateRequest middleware', async () => {
      await request(app).put('/nursing-notes/note-123').send({});
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 200 status', async () => {
      const response = await request(app).put('/nursing-notes/note-123').send({});
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /nursing-notes/:id', () => {
    it('should call authenticate middleware', async () => {
      await request(app).delete('/nursing-notes/note-123');
      expect(authenticate).toHaveBeenCalled();
    });

    it('should call validateRequest middleware', async () => {
      await request(app).delete('/nursing-notes/note-123');
      expect(validateRequest).toHaveBeenCalled();
    });

    it('should return 204 status', async () => {
      const response = await request(app).delete('/nursing-notes/note-123');
      expect(response.status).toBe(204);
    });
  });
});
