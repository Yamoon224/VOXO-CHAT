# Changelog

## 0.2.0

Alignement sur les nouveautés de `mobile/CONTRACT.md` (SDK Kotlin et Flutter).

- `appId` (option de la config) : envoyé en `X-App-Id` sur chaque requête REST et en
  paramètre `appId` du WebSocket, seulement s'il est renseigné. Pas de détection
  automatique : à fournir par l'application hôte. Aucune dépendance ajoutée.
- Notifications push : `client.registerPushToken(token, 'fcm' | 'apns')` et
  `client.unregisterPushToken()` (`POST` / `DELETE /widget/push-token`). Jeton persisté
  par tenant, relié à chaque nouvelle session ; `PUSH_NOT_ENABLED` coupe les tentatives
  en silence. Le SDK ne dépend ni de Firebase ni d'APNs.
- Aperçu de saisie : `features.liveTypingPreview` (côté propriétaire), option
  `enableLiveTyping` (défaut `true`), `client.notifyTyping(text)`, trame montante
  `{"type":"typing","text":…}` (500 caractères, une trame par 200 ms, envoi final
  garanti, uniquement pendant une reprise humaine). Le composer fourni l'appelle seul.
- Historique archivé en lecture seule : `client.archivedConversation(sessionId)` ;
  bouton historique dans l'en-tête de `VoxoChatView`, liste puis transcription.
  Conversation purgée (404) : erreur `HISTORY_UNAVAILABLE` (« Historique indisponible »).
- i18n : clés `historyTitle`, `historyTooltip`, `noHistory`, `historyUnavailable`,
  `backLabel` (FR et EN).

## 0.1.0

Première version du SDK React Native, consommant le contrat public `/api/widget/*`
décrit dans `mobile/CONTRACT.md`. Contrat public aligné sur le SDK Flutter.

### Core (TypeScript pur, sans React ni module natif)

- `VoxoClient` — état observable de la conversation : envoi, réception, statut de
  livraison, renvoi d'un message en échec sans re-téléverser ses pièces jointes
- Configuration distante via `GET /widget/config` et suggestions de démarrage via
  `GET /widget/quick-replies`
- WebSocket de conversation avec reconnexion en backoff exponentiel plafonné à 15 s,
  messages de conseiller et statut de reprise humaine
- Pièces jointes : compression des images (2 048 px, WebP), validation alignée sur
  `shared/file-rules.mjs`, envoi via `POST /widget/upload`
- Notation de fin de conversation et pouce haut/bas par message
- Session persistée et restaurée au redémarrage, archivée au-delà de 30 minutes
  d'inactivité ; relances puis clôture automatique
- Rate limiting client en miroir du serveur, et messages d'erreur en français
  relayés tels quels depuis le backend
- Capacités natives derrière des interfaces : stockage, sélecteur de fichiers,
  compression, ouverture de liens. Adaptateurs par défaut fournis, remplaçables.

### React et UI

- `VoxoProvider` — met le client à disposition et le branche sur `AppState` :
  reconnexion et resynchronisation au retour au premier plan
- `useVoxo` / `useVoxoSnapshot` — abonnement via `useSyncExternalStore`
- `VoxoChatView` — écran de chat complet ; `VoxoLauncher` — bulle flottante
- Thème dérivé de la couleur d'accent du tenant, clair et sombre, surchargeable
- Rendu Markdown restreint au même sous-ensemble que le widget web, avec filtrage
  des schémas d'URL

### Particularités React Native traitées

- Repli documenté quand `crypto.getRandomValues` est absent, la forme UUID v4 du
  `clientMessageId` étant exigée par le backend
- Construction d'URL sans `URL` ni `URLSearchParams`, incomplets sur la plateforme
- Multipart au format `{ uri, name, type }`, sans `Content-Type` posé à la main
- Inactivité mesurée sur l'horloge murale, les timers étant suspendus en arrière-plan
