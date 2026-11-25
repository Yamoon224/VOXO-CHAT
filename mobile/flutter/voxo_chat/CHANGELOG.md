# Changelog

## 0.2.0

- `VoxoConfig.appId` : identifiant de l'application hôte, envoyé en `X-App-Id`
  (REST) et `appId` (WebSocket) quand il est renseigné. À fournir par
  l'application (par exemple via `package_info_plus`), sans nouvelle dépendance
- Notifications push : `VoxoPushPlatform` (`fcm`, `apns`),
  `VoxoController.registerPushToken` / `unregisterPushToken`, jeton persisté par
  tenant et relié à chaque session ; `PUSH_NOT_ENABLED` coupe les tentatives en
  silence, toute autre panne est avalée. Le SDK ne dépend ni de Firebase ni d'APNs
- Aperçu de saisie : `VoxoFeatures.liveTypingPreview`,
  `VoxoOptions.enableLiveTyping`, `VoxoController.notifyTyping` ; trame montante
  `typing` (500 caractères, une par 200 ms, dernière valeur garantie), réservée à
  la reprise humaine. Le composeur fourni l'appelle à chaque modification
- Historique archivé en lecture seule : `VoxoController.archivedConversation` →
  `VoxoArchivedView`, erreur `HISTORY_UNAVAILABLE` sur 404 ; bouton historique et
  transcription dans `VoxoChatView`
- i18n : clés `historyTitle`, `historyTooltip`, `noHistory`, `historyUnavailable`,
  `backLabel` (FR/EN)

## 0.1.0

Première version du SDK Flutter, consommant le contrat public `/api/widget/*`
décrit dans `mobile/CONTRACT.md`.

### Core (utilisable sans l'UI fournie)

- `VoxoController` — état observable de la conversation : envoi, réception,
  statut de livraison, renvoi d'un message en échec sans re-téléverser ses
  pièces jointes
- Configuration distante via `GET /widget/config` (thème, nom, message
  d'accueil, fonctionnalités activées) et suggestions de démarrage via
  `GET /widget/quick-replies`
- WebSocket de conversation avec reconnexion en backoff exponentiel plafonné à
  15 s, messages de conseiller et statut de reprise humaine
- Pièces jointes : compression des images (2 048 px, WebP), validation alignée
  sur `shared/file-rules.mjs`, envoi via `POST /widget/upload`
- Notation de fin de conversation et pouce haut/bas par message
- Session persistée et restaurée au redémarrage, archivée au-delà de 30 minutes
  d'inactivité ; relances puis clôture automatique
- Rate limiting client en miroir du serveur, et messages d'erreur en français
  relayés tels quels depuis le backend

### UI

- `VoxoChatView` — écran de chat complet
- `VoxoLauncher` — bulle flottante et ouverture en plein écran
- Thème dérivé de la couleur d'accent du tenant, clair et sombre, surchargeable
- Rendu Markdown restreint au même sous-ensemble que le widget web, avec
  filtrage des schémas d'URL
