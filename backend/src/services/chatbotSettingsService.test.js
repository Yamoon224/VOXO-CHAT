jest.mock('./openaiService', () => ({ validateOwnerSuggestions: jest.fn() }));
jest.mock('../models', () => ({ KnowledgeBase: { findAll: jest.fn() } }));
jest.mock('./ragService', () => ({ minSimilarity: 0.35, defaultTopK: 5 }));
jest.mock('./tenantFeatureFlags', () => ({ computeTenantFeatures: jest.fn() }));

const openaiService = require('./openaiService');
const chatbotSettingsService = require('./chatbotSettingsService');
const { computeTenantFeatures } = require('./tenantFeatureFlags');

const makeTenant = (chatbot = {}) => ({
  id: 'tenant-a',
  settings: { chatbot, features: { analytics: true } },
  update: jest.fn().mockResolvedValue(undefined),
});

const savedSettings = (tenant) => tenant.update.mock.calls[0][0].settings;

describe('chatbotSettingsService.update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    openaiService.validateOwnerSuggestions.mockResolvedValue({ isValid: true });
    computeTenantFeatures.mockResolvedValue({ customAiInstructions: true });
  });

  describe('ton', () => {
    test.each(['chaleureux', 'professionnel', 'direct', 'enthousiaste'])(
      'accepte le ton %s',
      async (tone) => {
        const tenant = makeTenant({ name: 'Voxo' });

        const result = await chatbotSettingsService.update(tenant, { tone });

        expect(result.chatbot.tone).toBe(tone);
        expect(savedSettings(tenant).chatbot.tone).toBe(tone);
      }
    );

    test('rejette un ton hors whitelist', async () => {
      const tenant = makeTenant();

      await expect(chatbotSettingsService.update(tenant, { tone: 'sarcastique' }))
        .rejects.toMatchObject({ statusCode: 400, message: 'Ton du chatbot invalide' });
      expect(tenant.update).not.toHaveBeenCalled();
    });

    test('laisse le ton existant intact quand il n\'est pas transmis', async () => {
      const tenant = makeTenant({ name: 'Voxo', tone: 'direct' });

      const result = await chatbotSettingsService.update(tenant, { name: 'Nouvel Assistant' });

      expect(result.chatbot).toMatchObject({ name: 'Nouvel Assistant', tone: 'direct' });
    });
  });

  describe('validation', () => {
    test.each([
      [{ name: 'x'.repeat(101) }, 'Nom du chatbot invalide'],
      [{ welcomeMessage: 'x'.repeat(501) }, "Message d'accueil trop long"],
      [{ theme: { primaryColor: 'bleu' } }, 'Couleur primaire invalide'],
      [{ theme: { position: 'middle' } }, 'Position invalide'],
    ])('rejette %o', async (body, message) => {
      await expect(chatbotSettingsService.update(makeTenant(), body))
        .rejects.toMatchObject({ statusCode: 400, message });
    });

    test('rejette plus de 5 suggestions', async () => {
      const initialQuestions = Array.from({ length: 6 }, (_, i) => `Question ${i}`);

      await expect(chatbotSettingsService.update(makeTenant(), { initialQuestions }))
        .rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('suggestions d\'accueil', () => {
    test('remonte un warning non bloquant quand la base ne les couvre pas', async () => {
      openaiService.validateOwnerSuggestions.mockResolvedValue({
        isValid: false,
        reason: 'Aucun tarif documenté',
      });
      const tenant = makeTenant();

      const result = await chatbotSettingsService.update(tenant, {
        initialQuestions: ['Quels sont vos tarifs ?'],
      });

      expect(result.warnings).toEqual([{
        code: 'INITIAL_QUESTIONS_NOT_COVERED',
        message: 'Aucun tarif documenté',
      }]);
      // Le warning ne doit pas empêcher la sauvegarde.
      expect(tenant.update).toHaveBeenCalled();
    });

    test('n\'appelle pas l\'IA si les suggestions sont inchangées', async () => {
      const tenant = makeTenant({ initialQuestions: ['Vos horaires ?'] });

      await chatbotSettingsService.update(tenant, { initialQuestions: ['Vos horaires ?'] });

      expect(openaiService.validateOwnerSuggestions).not.toHaveBeenCalled();
    });
  });

  test('préserve les sections de settings hors chatbot', async () => {
    const tenant = makeTenant({ name: 'Voxo' });

    await chatbotSettingsService.update(tenant, { tone: 'direct' });

    expect(savedSettings(tenant).features).toEqual({ analytics: true });
  });

  test('enregistre l’activation des pièces jointes sans perdre les autres options', async () => {
    const tenant = makeTenant({
      options: { features: { messageFeedback: false, attachments: false } },
    });

    const result = await chatbotSettingsService.update(tenant, {
      options: { features: { attachments: true } },
    });

    expect(result.chatbot.options.features).toEqual({
      messageFeedback: false,
      attachments: true,
    });
  });

  test('enregistre les instructions IA quand le forfait les autorise', async () => {
    const tenant = makeTenant({ name: 'Voxo' });
    const result = await chatbotSettingsService.update(tenant, { customInstructions: 'Adopte un ton rassurant.' });

    expect(result.chatbot.customInstructions).toBe('Adopte un ton rassurant.');
    expect(savedSettings(tenant).chatbot.customInstructions).toBe('Adopte un ton rassurant.');
  });

  test('refuse les instructions IA hors forfait', async () => {
    computeTenantFeatures.mockResolvedValue({ customAiInstructions: false });

    await expect(chatbotSettingsService.update(makeTenant(), { customInstructions: 'Texte' }))
      .rejects.toMatchObject({ statusCode: 403, code: 'PLAN_FEATURE_REQUIRED' });
  });
});
