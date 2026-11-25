const mockCreate = jest.fn();
const sharp = require('sharp');

jest.mock('openai', () => jest.fn().mockImplementation(() => ({
  chat: { completions: { create: mockCreate } },
})));
jest.mock('../config/config', () => ({
  openai: { apiKey: 'test-openrouter-key', model: 'test-model' },
  app: { frontendUrl: 'http://localhost:3001' },
}));
jest.mock('../models', () => ({
  KnowledgeBase: { findAll: jest.fn() },
}));
jest.mock('./ragService', () => ({
  defaultTopK: 5,
  minSimilarity: 0.35,
  search: jest.fn(),
}));

const { KnowledgeBase } = require('../models');
const ragService = require('./ragService');
const { OpenAIService } = require('./openaiService');

const systemPromptOfLastCall = () => mockCreate.mock.calls[0][0].messages[0].content;

describe('OpenAIService.generateChatResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    KnowledgeBase.findAll.mockResolvedValue([{ title: 'Support' }]);
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Réponse générée' } }],
      usage: { total_tokens: 42 },
    });
  });

  test('un message purement social ne déclenche aucune recherche RAG', async () => {
    const service = new OpenAIService();

    const result = await service.generateChatResponse('tenant-a', 'Bonjour !', [], {}, 'Voxo SA');

    expect(ragService.search).not.toHaveBeenCalled();
    // Aucune source parasite ne doit être attachée à une simple salutation.
    expect(result.sources).toEqual([]);
    expect(systemPromptOfLastCall()).toContain('applique la branche 1');
  });

  test('un message social récupère quand même des sujets pour rebondir', async () => {
    const service = new OpenAIService();

    await service.generateChatResponse('tenant-a', 'merci !', [], {}, 'Voxo SA');

    expect(KnowledgeBase.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: 'tenant-a', isActive: true },
    }));
    expect(systemPromptOfLastCall()).toContain('- Support');
  });

  test('une vraie question déclenche la recherche RAG et remonte ses sources', async () => {
    ragService.search.mockResolvedValue([{
      similarity: 0.82,
      item: { id: 'k1', title: 'Tarifs', content: 'Le plan Pro coute 29 euros.' },
    }]);
    const service = new OpenAIService();

    const result = await service.generateChatResponse(
      'tenant-a',
      'Quels sont vos tarifs ?',
      [],
      {},
      'Voxo SA'
    );

    expect(ragService.search).toHaveBeenCalledWith('tenant-a', 'Quels sont vos tarifs ?', 5);
    expect(result.sources).toMatchObject([{ title: 'Tarifs', similarity: 0.82 }]);

    const prompt = systemPromptOfLastCall();
    expect(prompt).toContain('29 euros');
    expect(prompt).not.toContain('applique la branche 1');
  });

  test('un message mixte reste traité comme une question métier', async () => {
    ragService.search.mockResolvedValue([]);
    const service = new OpenAIService();

    await service.generateChatResponse(
      'tenant-a',
      'Bonjour, quels sont vos tarifs ?',
      [],
      {},
      'Voxo SA'
    );

    expect(ragService.search).toHaveBeenCalled();
    expect(systemPromptOfLastCall()).not.toContain('applique la branche 1');
  });

  test('le ton du tenant est propagé jusqu\'au prompt', async () => {
    const service = new OpenAIService();

    await service.generateChatResponse(
      'tenant-a',
      'Bonjour !',
      [],
      { chatbot: { name: 'Voxo', tone: 'direct' } },
      'Voxo SA'
    );

    expect(systemPromptOfLastCall()).toContain('direct, concis et factuel');
  });
});

describe('OpenAIService image responses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    KnowledgeBase.findAll.mockResolvedValue([{ title: 'Support' }]);
    ragService.search.mockResolvedValue([]);
  });

  async function imageBuffer() {
    return sharp({
      create: { width: 20, height: 20, channels: 3, background: 'white' },
    }).png().toBuffer();
  }

  test('régénère un faux refus et garde OCR séparé pour une image lisible', async () => {
    mockCreate
      .mockResolvedValueOnce({
        choices: [{ message: { content: "Je ne peux pas analyser cette image." } }],
        usage: { total_tokens: 10 },
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'Cette image est hors du périmètre de Voxo.' } }],
        usage: { total_tokens: 12 },
      });
    const service = new OpenAIService();

    const result = await service.generateChatResponse(
      'tenant-a',
      'Test image',
      [],
      {},
      'Voxo SA',
      { attachmentContext: 'Erreur APK détectée', images: [await imageBuffer()] }
    );

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      response: 'Cette image est hors du périmètre de Voxo.',
      model: 'openai/gpt-4o-mini',
      tokensUsed: 22,
      usedVision: true,
    });
    const firstRequest = mockCreate.mock.calls[0][0];
    expect(firstRequest.messages[0].content).toContain('CONTENU FOURNI PAR LE VISITEUR');
    expect(firstRequest.messages[0].content).toContain("erreurs d'OCR");
    expect(firstRequest.messages.some(message => Array.isArray(message.content))).toBe(true);
  });

  test('propage une panne vision comme erreur réessayable', async () => {
    mockCreate.mockRejectedValueOnce(new Error('provider unavailable'));
    const service = new OpenAIService();

    await expect(service.generateChatResponse(
      'tenant-a',
      'Analyse',
      [],
      {},
      'Voxo SA',
      { images: [await imageBuffer()] }
    )).rejects.toMatchObject({ code: 'VISION_SERVICE_UNAVAILABLE', statusCode: 503 });
  });
});

describe('OpenAIService.generateSuggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Quels sont vos tarifs ?\nQuels sont vos tarifs ?\n- Comment souscrire ?' } }],
    });
  });

  test('uses the assistant response and the sources, then normalizes and deduplicates suggestions', async () => {
    const service = new OpenAIService();
    const suggestions = await service.generateSuggestions({
      response: 'Le plan Pro coûte 29 euros.',
      sources: [{ title: 'Tarifs', snippet: 'Le plan Pro coûte 29 euros.' }],
    });

    expect(suggestions).toEqual(['Quels sont vos tarifs ?', 'Comment souscrire ?']);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({ content: expect.stringContaining('Le plan Pro coûte 29 euros.') }),
      ]),
    }));
  });

  test('does not call the model when no source was used', async () => {
    const service = new OpenAIService();
    await expect(service.generateSuggestions({ response: 'Bonjour !', sources: [] })).resolves.toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
