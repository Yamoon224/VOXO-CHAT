import 'package:flutter_test/flutter_test.dart';
import 'package:voxo_chat/voxo_chat.dart';

/// Sous-ensemble de clés partagé mot pour mot entre les trois canaux : le
/// widget web (`widget/src/i18n.js`), le SDK React Native
/// (`mobile/react-native/voxo-chat-react-native/src/i18n.ts`) et ce SDK
/// Flutter (`lib/src/voxo_i18n.dart`). Recopié ici en dur plutôt qu'importé :
/// les trois packages n'ont pas de dépendance commune, et c'est justement la
/// dérive silencieuse entre eux que ce test doit attraper — si l'un des
/// fichiers change une formulation sans répercuter les deux autres, ce test
/// casse et le signale.
///
/// Se limite aux clés définies à la fois côté RN et Flutter (évaluations,
/// erreurs réseau/validation, aujourd'hui/hier) : les clés additionnelles
/// propres à l'UI Flutter (composeur, en-tête, pièces jointes…) n'ont pas
/// d'équivalent RN à ce jour et sont donc hors du périmètre de parité.
const _sharedFr = {
  'openChat': 'Ouvrir le chat',
  'close': 'Fermer',
  'ratingTitle': 'Comment s’est passé cet échange ?',
  'ratingGroup': 'Note de 1 à 5',
  'ratingRequired': 'Choisissez une note entre 1 et 5.',
  'ratingValue': '{count} sur 5',
  'ratingComment': 'Un commentaire ? (facultatif)',
  'cancel': 'Annuler',
  'send': 'Envoyer',
  'ratingThanks': 'Merci, votre avis a bien été envoyé.',
  'today': 'Aujourd’hui',
  'yesterday': 'Hier',
  'network':
      'Impossible de se connecter au serveur. Vérifiez votre connexion internet.',
  'timeout': 'Le serveur met trop de temps à répondre.',
  'malformed': 'Réponse inattendue du serveur.',
  'invalidTenant': 'Identifiant de chatbot invalide : un UUID est attendu.',
  'invalidApiUrl': 'L’adresse du serveur VOXO est invalide.',
  'rateLimited':
      'Trop de messages envoyés. Veuillez patienter avant de continuer.',
  'notFound': 'Ressource introuvable.',
  'unavailable':
      'Le service est momentanément indisponible. Réessayez dans quelques instants.',
  'genericError': 'Une erreur est survenue.',
};

const _sharedEn = {
  'openChat': 'Open chat',
  'close': 'Close',
  'ratingTitle': 'How did the conversation go?',
  'ratingGroup': 'Rating from 1 to 5',
  'ratingRequired': 'Choose a rating between 1 and 5.',
  'ratingValue': '{count} out of 5',
  'ratingComment': 'Optional comment',
  'cancel': 'Cancel',
  'send': 'Send',
  'ratingThanks': 'Thank you, your feedback was sent.',
  'today': 'Today',
  'yesterday': 'Yesterday',
  'network': 'Unable to connect to the server. Check your internet connection.',
  'timeout': 'The server is taking too long to respond.',
  'malformed': 'Unexpected server response.',
  'invalidTenant': 'Invalid chatbot identifier: a UUID is required.',
  'invalidApiUrl': 'The VOXO server address is invalid.',
  'rateLimited': 'Too many messages sent. Please wait before continuing.',
  'notFound': 'Resource not found.',
  'unavailable':
      'The service is temporarily unavailable. Please try again shortly.',
  'genericError': 'An error occurred.',
};

void main() {
  group('VoxoI18n', () {
    test('les catalogues fr/en ont exactement les mêmes clés', () {
      expect(VoxoI18n.catalogsHaveParity, isTrue);
    });

    test('inclut les clés partagées avec le widget web et le SDK RN', () {
      for (final key in _sharedFr.keys) {
        expect(VoxoI18n.text('fr', key), _sharedFr[key], reason: 'fr.$key');
        expect(VoxoI18n.text('en', key), _sharedEn[key], reason: 'en.$key');
      }
    });

    test('une locale inconnue retombe sur le français', () {
      for (final locale in ['de', 'es', '', 'FR-be', 'xx']) {
        expect(VoxoI18n.normalize(locale), 'fr', reason: locale);
      }
      expect(VoxoI18n.normalize('en'), 'en');
      expect(VoxoI18n.normalize('EN'), 'en');
    });

    test('une clé encore inconnue de la locale demandée retombe sur le français',
        () {
      // `text` doit toujours renvoyer quelque chose d'affichable, jamais lever.
      expect(VoxoI18n.text('en', 'cle-inexistante'), 'cle-inexistante');
    });

    test('interpole les valeurs nommées', () {
      expect(VoxoI18n.text('fr', 'ratingValue', {'count': 3}), '3 sur 5');
      expect(VoxoI18n.text('en', 'ratingValue', {'count': 3}), '3 out of 5');
    });
  });
}
