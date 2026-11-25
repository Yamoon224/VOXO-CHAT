const service = require('./mediaResponsePolicyService');

describe('mediaResponsePolicyService', () => {
  test('détecte le refus contradictoire observé dans le widget', () => {
    expect(service.hasFalseVisionRefusal(
      "Je ne peux pas identifier ou analyser des images. Cependant, il semble s'agir d'un APK."
    )).toBe(true);
  });

  test('ne confond pas une réponse hors périmètre avec une erreur image', () => {
    expect(service.hasFalseVisionRefusal(
      "Cette image ne semble pas liée aux activités de Voxo. Je peux renseigner sur le support."
    )).toBe(false);
  });

  // Les trois formulations relevées dans les captures Telegram du 12/08.
  test.each([
    'Je ne peux pas répondre directement aux messages vocaux. Si vous avez une question…',
    'Je ne peux pas traiter le contenu des messages vocaux. Si vous avez une question…',
    'Je ne peux pas traiter les messages vocaux. Si vous avez une question spécifique…',
  ])('détecte le refus vocal : %s', (response) => {
    expect(service.hasFalseVoiceRefusal(response)).toBe(true);
  });

  test('ne confond pas une réponse utile avec un refus vocal', () => {
    expect(service.hasFalseVoiceRefusal(
      'Le PC Lenovo V15 est à 285 000 FCFA. Souhaitez-vous passer commande ?'
    )).toBe(false);
  });

  test('correctionFor ne cible que le média concerné', () => {
    const voiceRefusal = 'Je ne peux pas traiter les messages vocaux.';

    expect(service.correctionFor({ response: voiceRefusal, mediaType: 'voice' }))
      .toContain('déjà été transcrit');
    expect(service.correctionFor({ response: voiceRefusal, mediaType: 'image' })).toBeNull();
    expect(service.correctionFor({ response: 'Réponse utile.', mediaType: 'voice' })).toBeNull();
    expect(service.correctionFor({
      response: "Je ne peux pas analyser des images.",
      visionUsed: true,
    })).toContain("l'image est lisible");
  });
});
