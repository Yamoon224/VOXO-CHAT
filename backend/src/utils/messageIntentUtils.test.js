const { detectSocialIntent, MAX_SOCIAL_LENGTH } = require('./messageIntentUtils');

describe('detectSocialIntent', () => {
  describe('messages purement sociaux', () => {
    test.each([
      ['Bonjour !', 'greeting'],
      ['Salut', 'greeting'],
      ['merci beaucoup 🙂', 'thanks'],
      ['Au revoir', 'goodbye'],
      ['Bonne journée', 'goodbye'],
      ['ça va ?', 'smalltalk'],
      ['Comment allez-vous ?', 'smalltalk'],
      ['ok', 'smalltalk'],
      ['Tu es un robot ?', 'identity'],
    ])('%s → isPureSocial avec le type %s', (message, expectedType) => {
      expect(detectSocialIntent(message)).toEqual({
        type: expectedType,
        isPureSocial: true,
      });
    });

    test('un message sans aucune lettre (emoji seul) est social', () => {
      expect(detectSocialIntent('🙂')).toEqual({ type: 'smalltalk', isPureSocial: true });
    });

    test('la catégorie la plus engageante gagne quand plusieurs cohabitent', () => {
      // « merci » (thanks) et « revoir » (goodbye) : goodbye est prioritaire.
      expect(detectSocialIntent('merci et au revoir')).toEqual({
        type: 'goodbye',
        isPureSocial: true,
      });
    });
  });

  describe('messages qui doivent atteindre le RAG', () => {
    test.each([
      // Cas mixte : le plus important, une vraie question précédée d'une salutation.
      'Bonjour, quels sont vos tarifs ?',
      // Piège : commence par un mot social mais reste une demande métier.
      "Merci de m'envoyer la grille tarifaire",
      // Mérite une réponse issue de la base de connaissances, pas une réponse générique.
      'qui êtes-vous ?',
      'Quelle est la capitale du Pérou ?',
      'Comment vous contacter ?',
    ])('%s → isPureSocial false', (message) => {
      expect(detectSocialIntent(message)).toEqual({ type: null, isPureSocial: false });
    });

    test.each([null, undefined, '', '   '])('un message vide (%s) n\'est jamais social', (message) => {
      expect(detectSocialIntent(message).isPureSocial).toBe(false);
    });

    test('un message plus long que la limite est écarté même s\'il est social', () => {
      const message = `Bonjour ${'a'.repeat(MAX_SOCIAL_LENGTH)}`;

      expect(message.length).toBeGreaterThan(MAX_SOCIAL_LENGTH);
      expect(detectSocialIntent(message).isPureSocial).toBe(false);
    });

    test('des mots neutres sans mot social ne suffisent pas', () => {
      expect(detectSocialIntent("c'est pour vous")).toEqual({ type: null, isPureSocial: false });
    });
  });
});
