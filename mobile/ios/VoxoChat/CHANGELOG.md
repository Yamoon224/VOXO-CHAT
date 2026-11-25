# Changelog

## 0.2.0 (non vérifié)

Ajoute, comme sur Android, Flutter et React Native : identifiant d'application (`X-App-Id`, détecté), jeton de
notification push (`registerPushToken`), aperçu de saisie vers le conseiller (`enableLiveTyping`, `notifyTyping`) et
relecture en lecture seule des conversations archivées (`archivedConversation`, écran dédié). Actions secondaires de
l'en-tête regroupées dans un menu ⋮. Les messages de même `id` sont dédoublonnés.

**Toujours jamais compilée ni exécutée** (aucune chaîne Apple disponible lors de la rédaction).

## 0.1.0 (non vérifié)

Première version du SDK iOS (Swift, SwiftUI), consommant le contrat public `/api/widget/*`
décrit dans `mobile/CONTRACT.md`, avec la même API publique que le SDK Flutter.

**Rédigée sans chaîne Swift ni Xcode : jamais compilée ni exécutée.**

### Core (Foundation pur, utilisable sans l'UI fournie)

- `VoxoController` — état observable (`observe`, `stateStream`) : envoi, réception, statut de
  livraison, renvoi d'un message en échec sans re-téléverser ses pièces jointes
- Configuration distante via `GET /widget/config` (thème, nom, message d'accueil,
  fonctionnalités activées) et suggestions de démarrage via `GET /widget/quick-replies`
- WebSocket de conversation avec reconnexion en backoff exponentiel plafonné à 15 s, messages
  de conseiller et statut de reprise humaine
- Pièces jointes : compression des images (2 048 px, JPEG 0,82 — repli du contrat, ImageIO
  n'écrit pas le WebP), validation alignée sur `shared/file-rules.mjs`, envoi via
  `POST /widget/upload`
- Notation de fin de conversation et pouce haut/bas par message
- Session persistée (`UserDefaults`) et restaurée au redémarrage, archivée au-delà de 30
  minutes d'inactivité ; relances puis clôture automatique
- Rate limiting client en miroir du serveur ; messages d'erreur bilingues FR/EN, ceux du
  serveur relayés tels quels
- Stockage clé/valeur et compression d'image injectables (`VoxoKeyValueStore`,
  `VoxoImageCompressor`)

### UI (SwiftUI, iOS 15+)

- `VoxoChatView` — écran de chat complet
- `VoxoLauncher` — bouton flottant aux couleurs du chatbot
- Thème dérivé de la couleur d'accent du tenant, clair et sombre, surchargeable
- Rendu Markdown restreint au même sous-ensemble que le widget web, avec filtrage des schémas
  d'URL
