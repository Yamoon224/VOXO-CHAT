jest.mock('../models', () => ({ Conversation: {}, ConversationAlert: {}, User: {} }));
jest.mock('./emailService', () => ({}));

const { detectReason, canOfferForMessage } = require('./conversationHandoffService');

describe('conversationHandoffService.detectReason', () => {
  test('escalates explicit human and order requests', () => {
    expect(detectReason('Je veux parler à un conseiller')).toBe('conseiller');
    expect(detectReason('Je souhaite passer commande')).toBe('commande');
  });

  test('does not escalate social messages', () => {
    expect(detectReason('Bonjour, merci !')).toBeNull();
  });

  test('escalates uncovered business questions cautiously', () => {
    expect(detectReason('Avez-vous ce modèle ?', { sources: [] })).toBe('limite_ia');
    expect(detectReason('Bonjour', { sources: [] })).toBeNull();
  });

  test('does not offer another handoff for an unrelated topic while waiting', () => {
    const conversation = { handoffStatus: 'waiting', metadata: { handoffTopics: [{ terms: ['ordinateur', 'dell'] }] } };
    expect(canOfferForMessage(conversation, 'Quels meubles vendez-vous ?')).toBe(false);
    expect(canOfferForMessage(conversation, 'Avez-vous un ordinateur Dell ?')).toBe(true);
  });
});
