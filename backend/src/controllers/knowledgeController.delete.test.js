jest.mock('../models', () => ({
  sequelize: { transaction: jest.fn() },
  KnowledgeBase: { findOne: jest.fn() },
  KnowledgeChunk: { destroy: jest.fn() },
  CrawlJob: {},
  User: {},
}));

const { sequelize, KnowledgeBase, KnowledgeChunk } = require('../models');
const { deleteKnowledge } = require('./knowledgeController');

describe('knowledgeController.deleteKnowledge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(async (callback) => callback({ id: 'transaction' }));
  });

  test('permanently deletes the tenant-scoped document and its chunks', async () => {
    const knowledgeItem = { id: 'knowledge-1', destroy: jest.fn().mockResolvedValue(1) };
    KnowledgeBase.findOne.mockResolvedValue(knowledgeItem);
    KnowledgeChunk.destroy.mockResolvedValue(2);
    const req = { params: { id: 'knowledge-1' }, tenant: { id: 'tenant-1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await deleteKnowledge(req, res, next);

    expect(KnowledgeBase.findOne).toHaveBeenCalledWith({
      where: { id: 'knowledge-1', tenantId: 'tenant-1' },
    });
    expect(KnowledgeChunk.destroy).toHaveBeenCalledWith({
      where: { knowledgeBaseId: 'knowledge-1', tenantId: 'tenant-1' },
      transaction: { id: 'transaction' },
    });
    expect(knowledgeItem.destroy).toHaveBeenCalledWith({ transaction: { id: 'transaction' } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns not found for a document outside the current tenant', async () => {
    KnowledgeBase.findOne.mockResolvedValue(null);
    const req = { params: { id: 'knowledge-other' }, tenant: { id: 'tenant-1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await deleteKnowledge(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    expect(KnowledgeChunk.destroy).not.toHaveBeenCalled();
  });
});
