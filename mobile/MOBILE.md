# MOBILE SDK SYSTEM

## Rôle du document
- Ce document est la référence d'implémentation du volet mobile : les quatre SDK d'intégration
  embarqués dans les applications clientes (Flutter/Dart, React Native, Kotlin/Android,
  Swift/iOS).
- Il complète `CLAUDE.md` / `CODEX.md`.
- Toute feature mobile doit respecter ce document avant toute implémentation.
- En cas de doute, on suit cet ordre :
  - `CLAUDE.md` / `CODEX.md`
  - `mobile/CONTRACT.md` (le contrat API fait autorité, toujours)
  - `MOBILE.md`
  - le SDK Flutter, qui est la référence d'API publique pour les trois autres
  - les patterns déjà validés dans le repo

## Stack technique réelle
| Plateforme | Emplacement | Stack |
|---|---|---|
| Flutter/Dart | `mobile/flutter/voxo_chat/` | Flutter 3.41+, Dart 3.11+. `http`, `web_socket_channel`, `shared_preferences`, `file_picker`, `flutter_image_compress`. UI en widgets Flutter. |
| React Native | `mobile/react-native/voxo-chat-react-native/` | TypeScript strict, zéro dépendance runtime. `fetch` et `WebSocket` natifs. Core en TypeScript pur (store `subscribe`/`getSnapshot`), React branché par `useSyncExternalStore`. Capacités natives derrière des adaptateurs injectables. |
| Kotlin/Android | `mobile/android/voxo-chat-android/` | OkHttp (REST + WebSocket), kotlinx.serialization, Coroutines + `StateFlow`, DataStore. UI en Jetpack Compose. |
| Swift/iOS | `mobile/ios/VoxoChat/` | `URLSession` + `URLSessionWebSocketTask`, `Codable`, `async/await`, `UserDefaults`. UI en SwiftUI. |

**Flutter est le pilote** : il fige le nommage public, le cycle de vie, la gestion d'erreurs et
les événements. Les trois autres SDK transposent ce contrat à l'identique.

## Architecture : deux couches, toujours
Chaque SDK est découpé en deux couches qui ne se mélangent jamais :
- **Core** — REST, WebSocket, session, modèles, validation. **Aucune dépendance à l'UI.** Un
  intégrateur doit pouvoir construire son propre écran de chat en n'utilisant que le core.
- **UI** — l'écran de chat prêt à l'emploi, construit par-dessus le core. Il consomme l'état
  exposé par le core, il ne parle jamais au réseau directement.

## Règles de base à ne surtout pas négliger (Clean Code / SOLID)
- **Limite de taille stricte : 250 lignes maximum par fichier.** Le volet mobile est neuf : il n'y
  a aucune dette existante à invoquer, la règle s'applique sans exception.
- **Single Responsibility** : un fichier = un rôle. Le client REST ne gère pas la session, le
  store ne fait pas de réseau, le controller n'écrit pas de widget.
- **Fonctions courtes** (< 20 lignes visées), noms explicites en anglais.
- **Pas de code mort ou dupliqué** : un seul client API par SDK, un seul point de parsing
  d'enveloppe, une seule source de vérité pour les règles de fichiers.

## Règles absolues
- **`mobile/CONTRACT.md` fait autorité.** Aucun SDK ne « devine » un endpoint ni une forme de
  payload. Si le backend change, on met à jour `CONTRACT.md` **avant** les SDK.
- **Toute communication réseau passe par le client API du core**, jamais depuis l'UI, jamais
  depuis un helper ad hoc. Header `X-Tenant-ID` sur **chaque** requête REST.
- **Ne jamais poser `Content-Type` à la main sur un envoi multipart** : la bibliothèque HTTP doit
  écrire elle-même le `boundary`.
- **Les messages d'erreur destinés à l'utilisateur final sont en français**, et le champ `error`
  renvoyé par le serveur est **relayé tel quel** — il est déjà rédigé pour l'utilisateur. Un SDK
  ne rédige un message que pour ce que le serveur ne peut pas dire : perte de réseau, timeout
  local, validation avant envoi.
- **`clientMessageId` est un UUID v4 strict.** Le backend rejette tout le reste. C'est ce qui
  porte l'idempotence : ne jamais réutiliser un identifiant pour deux messages distincts, ni en
  changer lors d'un retry.
- **Le `sessionId` renvoyé par `POST /widget/message` peut différer de celui envoyé.** Il faut
  alors archiver l'ancienne session, adopter la nouvelle et **reconnecter le WebSocket**.
- **Aucun secret dans un SDK.** `apiUrl` et `tenantId` sont fournis par l'intégrateur à
  l'initialisation. Le `tenantId` n'est pas un secret ; rien d'autre ne doit y transiter.
- **Les limites client sont un miroir du serveur, pas une invention** : 2 000 caractères,
  3 pièces jointes, 10 Mo, 15 messages/minute. Toute révision se reporte dans `CONTRACT.md`.
- **Le WebSocket est descendant** : seule exception, la trame `typing` de l'aperçu de saisie, soumise
  à `features.liveTypingPreview` ET à une reprise humaine (voir `CONTRACT.md`). L'envoi d'un message
  passe toujours par REST.
- Un `404` sur `GET /widget/conversation/:sessionId` est le cas **normal** d'une session neuve :
  il se traite comme « pas d'historique », jamais comme une erreur affichée.
- Les règles de fichiers de chaque SDK sont un **miroir** de `shared/file-rules.mjs`. Tout
  changement se reporte des deux côtés, et l'en-tête du fichier miroir doit le dire.

## Ce qui ne s'applique PAS ici
- La règle « zéro dépendance runtime » et le budget de 70 Ko de `WIDGET.md` sont propres au bundle
  web, qui est servi en `<script>` public. Un SDK mobile est compilé dans l'application hôte : il
  peut prendre des dépendances, à condition qu'elles restent peu nombreuses et justifiées.
- Le widget web n'est **pas** embarqué dans une WebView. Les SDK sont natifs de bout en bout.

## Parité fonctionnelle attendue (v1)
Chaque SDK, sur les quatre plateformes, couvre :
- chat (envoi, réception, statut de livraison, retry d'un message en échec)
- configuration distante via `GET /widget/config` (thème, nom, message d'accueil, fonctionnalités)
- suggestions de démarrage via `GET /widget/quick-replies`
- temps réel : WebSocket, messages d'agent, statut de reprise humaine
- pièces jointes : sélection, compression d'image, upload, rendu des pièces reçues
- notation de fin de conversation (1-5 + commentaire) et pouce haut/bas par message
- identifiant d'application (`X-App-Id`), jeton de notification push (`registerPushToken`), aperçu de
  saisie vers le conseiller et relecture en lecture seule des conversations archivées (v1.1 — voir
  `CONTRACT.md`)
- clôture automatique après inactivité
- persistance de session, restauration au redémarrage, archivage local

## Où vit la documentation
Deux publics, deux documents, et surtout **pas de recopie de l'un dans l'autre** — c'est ce qui
les ferait diverger à la première évolution du SDK :
- **README du package** (`mobile/<plateforme>/.../README.md`) — référence développeur. Versionnée
  avec le code, lue dans l'IDE : API, thème, UI sur mesure, permissions, dépannage, tests.
- **`/dashboard/integration/<plateforme>`** (`frontend/src/app/dashboard/integration/…/page.js`) —
  destinée au **propriétaire du chatbot**, pas à son développeur : ce que le mobile change pour lui,
  ses identifiants déjà remplis, ce qu'il transmet à son équipe. Elle renvoie au README pour le
  reste. Chaque plateforme livrée obtient sa page sœur sous `/dashboard/integration/` ; les autres
  restent annoncées « Bientôt disponible » dans le menu, **sans code**, tant que leur SDK n'existe
  pas — même règle que `shared/integration-snippet-mobile.mjs`.

L'onglet Intégration ne porte que l'extrait à copier, plus un encart court vers ce guide — même
schéma que le guide WordPress. Un nouveau SDK ajoute une section à la page existante ; il ne crée
pas une page concurrente.

## Distribution
- Les SDK vivent dans le monorepo et se consomment en **dépendance Git**.
- Les métadonnées de package (version, `CHANGELOG.md`, `LICENSE`, `README.md`) sont en place dès
  le départ, pour que la publication ne soit qu'une formalité.
- La publication sur les registres (pub.dev, npm, Maven Central, SwiftPM/CocoaPods) est une
  action explicite, déclenchée séparément — jamais un effet de bord d'une tâche.
- **Statut des plateformes** : Flutter, React Native et Kotlin sont livrés et vérifiés. Swift/iOS
  (`mobile/ios/VoxoChat/`) est **écrit mais jamais compilé** (aucune chaîne Apple disponible lors de
  sa rédaction) : tant qu'il n'a pas été construit et testé sur Mac, il n'a ni extrait
  d'intégration ni page `/dashboard/integration/swift`, conformément à la règle ci-dessus.
- **Licence propriétaire** (`LICENSE` à la racine et dans chaque SDK) : les SDK ne se publient sur
  aucun registre public sans autorisation écrite du titulaire. Les métadonnées l'imposent
  (`publish_to: none` pour Flutter, `private` + `UNLICENSED` pour React Native).

## Checklist avant merge
- Aucun fichier de `mobile/` ne dépasse 250 lignes.
- Le core ne dépend d'aucun type d'UI ; l'UI ne fait aucun appel réseau.
- `X-Tenant-ID` présent sur chaque requête REST ; absent du WebSocket.
- Aucun secret en dur ; `apiUrl` et `tenantId` viennent de l'intégrateur.
- Messages utilisateur en français, `error` du serveur relayé tel quel.
- Les règles de fichiers restent synchronisées avec `shared/file-rules.mjs`.
- `mobile/CONTRACT.md` mis à jour si le contrat a bougé, **avant** le code.
- Tests unitaires du core ajoutés (parsing d'enveloppe, validation, rate limiter, backoff).
- Le contrat public du SDK Flutter n'est pas cassé, et les trois autres SDK restent alignés
  dessus.
