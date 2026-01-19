/**
 * Conversation routes tests
 *
 * @module tests/modules/conversation/routes
 * @description Tests for conversation routes
 * Per testing.mdc: Test route configuration, middleware application
 */

const express = require('express');
const request = require('supertest');
const conversationRoutes = require('@modules/conversation/routes/conversation.routes');
const conversationController = require('@controllers/conversation/conversation.controller');
const { validate } = require('@middlewares/validate.middleware');

// Mock dependencies
jest.mock('@controllers/conversation/conversation.controller');
jest.mock('@middlewares/validate.middleware', () => ({
  validate: jest.fn(() => (req, res, next) => next())
}));

describe('Conversation Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/conversations', conversationRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /conversations', () => {
    it('should call listConversations controller', async () => {
      conversationController.listConversations.mockImplementation((req, res) => 
        res.status(200).json({ success: true })
      );

      await request(app)
        .get('/conversations')
        .expect(200);

      expect(conversationController.listConversations).toHaveBeenCalled();
    });
  });

  describe('GET /conversations/:id', () => {
    it('should call getConversation controller', async () => {
      const conversationId = '550e8400-e29b-41d4-a716-446655440000';
      conversationController.getConversation.mockImplementation((req, res) => 
        res.status(200).json({ success: true })
      );

      await request(app)
        .get(`/conversations/${conversationId}`)
        .expect(200);

      expect(conversationController.getConversation).toHaveBeenCalled();
    });
  });

  describe('POST /conversations', () => {
    it('should call createConversation controller', async () => {
      conversationController.createConversation.mockImplementation((req, res) => 
        res.status(201).json({ success: true })
      );

      await request(app)
        .post('/conversations')
        .send({ tenant_id: '550e8400-e29b-41d4-a716-446655440000', subject: 'Test' })
        .expect(201);

      expect(conversationController.createConversation).toHaveBeenCalled();
    });
  });

  describe('PUT /conversations/:id', () => {
    it('should call updateConversation controller', async () => {
      const conversationId = '550e8400-e29b-41d4-a716-446655440000';
      conversationController.updateConversation.mockImplementation((req, res) => 
        res.status(200).json({ success: true })
      );

      await request(app)
        .put(`/conversations/${conversationId}`)
        .send({ subject: 'Updated' })
        .expect(200);

      expect(conversationController.updateConversation).toHaveBeenCalled();
    });
  });

  describe('DELETE /conversations/:id', () => {
    it('should call deleteConversation controller', async () => {
      const conversationId = '550e8400-e29b-41d4-a716-446655440000';
      conversationController.deleteConversation.mockImplementation((req, res) => 
        res.status(204).send()
      );

      await request(app)
        .delete(`/conversations/${conversationId}`)
        .expect(204);

      expect(conversationController.deleteConversation).toHaveBeenCalled();
    });
  });
});
