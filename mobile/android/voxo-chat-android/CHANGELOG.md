# Changelog

## 0.2.0

- **Identifiant d'application** : `X-App-Id` / `appId` (WebSocket), détecté automatiquement (`VoxoConfig.appId`).
- **Notifications push** : `registerPushToken` / `unregisterPushToken` (`VoxoPushPlatform`), jeton persisté et relié à
  chaque session ; aucune dépendance à Firebase.
- **Aperçu de saisie** vers le conseiller (`VoxoOptions.enableLiveTyping`, `notifyTyping`), limité à 200 ms par trame
  et aux seules prises en charge humaines autorisées par le propriétaire.
- **Historique** : relecture en lecture seule d'une conversation archivée (`archivedConversation`) et écran dédié ;
  actions secondaires de l'en-tête regroupées dans un menu ⋮.
- Liens du markdown en `LinkAnnotation` (accessibles) ; plus aucun avertissement de dépréciation.
- Correctif : un `id` de message répété (donnée serveur ou session restaurée) ne fait plus planter la liste.

## 0.1.0

Première version du SDK Android (Kotlin, Jetpack Compose), consommant le contrat
public `/api/widget/*` décrit dans `mobile/CONTRACT.md`, avec la même API publique
que le SDK Flutter.

### Core (utilisable sans l'UI fournie)

- `VoxoController` — état observable (`StateFlow<VoxoUiState>`) : envoi, réception,
  statut de livraison, renvoi d'un message en échec sans re-téléverser ses pièces
  jointes
- Configuration distante via `GET /widget/config` (thème, nom, message d'accueil,
  fonctionnalités activées) et suggestions de démarrage via
  `GET /widget/quick-replies`
- WebSocket de conversation (OkHttp) avec reconnexion en backoff exponentiel
  plafonné à 15 s, messages de conseiller et statut de reprise humaine
- Pièces jointes : compression des images (2 048 px, WebP), validation alignée sur
  `shared/file-rules.mjs`, envoi via `POST /widget/upload`
- Notation de fin de conversation et pouce haut/bas par message
- Session persistée (DataStore) et restaurée au redémarrage, archivée au-delà de
  30 minutes d'inactivité ; relances puis clôture automatique
- Rate limiting client en miroir du serveur ; messages d'erreur bilingues FR/EN,
  ceux du serveur relayés tels quels
- Stockage clé/valeur et compression d'image injectables (`VoxoKeyValueStore`,
  `VoxoImageCompressor`)

### UI (Jetpack Compose)

- `VoxoChatView` — écran de chat complet
- `VoxoLauncher` — bouton flottant aux couleurs du chatbot
- Thème dérivé de la couleur d'accent du tenant, clair et sombre, surchargeable
- Rendu Markdown restreint au même sous-ensemble que le widget web, avec filtrage
  des schémas d'URL
