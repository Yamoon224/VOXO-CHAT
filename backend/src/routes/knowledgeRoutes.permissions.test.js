const express = require('express');
const request = require('supertest');

const ok = (req, res) => res.status(200).json({ success: true });

const mockController = {
  getKnowledgeBase: jest.fn(ok), getKnowledgeItem: jest.fn(ok), createKnowledge: jest.fn(ok),
  createKnowledgeFromFile: jest.fn(ok), createKnowledgeFromUrl: jest.fn(ok), crawlSite: jest.fn(ok),
  getCrawlJob: jest.fn(ok), listCrawlJobs: jest.fn(ok), reprocessKnowledge: jest.fn(ok),
  updateKnowledge: jest.fn(ok), deleteKnowledge: jest.fn(ok), bulkImport: jest.fn(ok),
  searchKnowledge: jest.fn(ok), regenerateEmbeddings: jest.fn(ok), getKnowledgeStats: jest.fn(ok),
  getProcessingCapabilities: jest.fn(ok), previewFileProcessing: jest.fn(ok),
  getProcessingHealth: jest.fn(ok),
};

jest.mock('../controllers/knowledgeController', () => mockController);
jest.mock('../services/quotaService', () => ({ assertCanCreateDocuments: jest.fn() }));

// L'acteur est décrit par deux en-têtes : son rôle et une éventuelle surcharge.
// Le vrai requirePermission tourne, c'est lui qu'on met à l'épreuve.
jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, res, next) => {
    const override = req.get('x-test-knowledge');
    req.user = {
      role: req.get('x-test-role') || 'owner',
      permissionOverrides: override ? { knowledge: override } : {},
    };
    next();
  },
}));

const knowledgeRoutes = require('./knowledgeRoutes');
const { errorHandler } = require('../middleware/errorMiddleware');

describe('knowledge routes permissions', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/knowledge', knowledgeRoutes);
  app.use(errorHandler);

  const as = (role, knowledge) => (req) => {
    req.set('x-test-role', role);
    if (knowledge) req.set('x-test-knowledge', knowledge);
    return req;
  };

  beforeEach(() => jest.clearAllMocks());

  describe('write operations', () => {
    test.each(['owner', 'admin'])('allows %s by role preset', async (role) => {
      const response = await as(role)(request(app).delete('/api/knowledge/knowledge-1'));

      expect(response.status).toBe(200);
      expect(mockController.deleteKnowledge).toHaveBeenCalled();
    });

    test('rejects a standard user, who only reads by default', async () => {
      const response = await as('user')(request(app).delete('/api/knowledge/knowledge-1'));

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('PERMISSION_DENIED');
      expect(mockController.deleteKnowledge).not.toHaveBeenCalled();
    });

    // Le cœur de la fonctionnalité : le rôle ne décide plus seul.
    test('allows a standard user granted knowledge write', async () => {
      const response = await as('user', 'write')(request(app).delete('/api/knowledge/knowledge-1'));

      expect(response.status).toBe(200);
      expect(mockController.deleteKnowledge).toHaveBeenCalled();
    });

    test('closes the update hole that had no role check at all', async () => {
      const response = await as('user')(request(app).put('/api/knowledge/knowledge-1').send({}));

      expect(response.status).toBe(403);
      expect(mockController.updateKnowledge).not.toHaveBeenCalled();
    });
  });

  describe('read operations', () => {
    test('allows a standard user to consult the base', async () => {
      const response = await as('user')(request(app).get('/api/knowledge/knowledge-1'));

      expect(response.status).toBe(200);
      expect(mockController.getKnowledgeItem).toHaveBeenCalled();
    });

    test('rejects a member whose knowledge access was cut off', async () => {
      const response = await as('user', 'none')(request(app).get('/api/knowledge/knowledge-1'));

      expect(response.status).toBe(403);
      expect(mockController.getKnowledgeItem).not.toHaveBeenCalled();
    });
  });

  // Non-régression du découpage en sous-routeurs : `/:id` ne doit capturer
  // aucune des routes littérales déclarées avant lui.
  describe('route ordering after the split', () => {
    test('does not let /:id swallow /search', async () => {
      await as('user')(request(app).get('/api/knowledge/search?q=test'));

      expect(mockController.searchKnowledge).toHaveBeenCalled();
      expect(mockController.getKnowledgeItem).not.toHaveBeenCalled();
    });

    test('does not let /:id swallow /stats or /crawl-jobs', async () => {
      await as('user')(request(app).get('/api/knowledge/stats'));
      await as('user')(request(app).get('/api/knowledge/crawl-jobs'));

      expect(mockController.getKnowledgeStats).toHaveBeenCalled();
      expect(mockController.listCrawlJobs).toHaveBeenCalled();
      expect(mockController.getKnowledgeItem).not.toHaveBeenCalled();
    });
  });
});
