# CONTRAT API MOBILE

## Rôle du document
- Source de vérité unique des quatre SDK mobiles (Flutter, React Native, Kotlin, Swift).
- Décrit le contrat public `/api/widget/*` **tel qu'il est**, pas tel qu'on voudrait qu'il soit.
- Un SDK se transpose depuis ce document sans relire le backend. Si le backend change, ce
  document change **d'abord**, puis les SDK.
- Autorité : `backend/src/routes/widgetRoutes.js`, `widgetAttachmentRoutes.js`,
  `validators/widgetMessageValidator.js`, `services/conversationSocketService.js`.

## Base et authentification
- Base REST : `{apiUrl}` où `apiUrl` se termine par `/api` (ex. `https://api.voxo.chat/api`).
- **Header `X-Tenant-ID` obligatoire sur chaque requête REST**, UUID v4 strict. Absent → `400
  MISSING_TENANT_ID`. Mal formé → `400 INVALID_TENANT_ID`.
- Aucune autre authentification : ce sont des routes publiques. Ne jamais y envoyer de JWT.
- Les SDK acceptent `locale: fr|en`, détectent la langue de l'appareil par défaut et envoient `Accept-Language` sur chaque requête. `setLocale` change la langue des appels suivants.
- `showLanguageSwitcher` vaut `true` par défaut dans les interfaces fournies ; une UI hôte peut le masquer et piloter `setLocale` elle-même.
- Ne jamais poser d'en-tête `Origin` depuis un SDK natif (voir « Sécurité »).
- **Header `X-App-Id`** (identifiant d'application : *bundle identifier* iOS ou *package name* Android)
  sur chaque requête REST quand il est connu. Kotlin et Swift le détectent seuls ; Flutter et React
  Native le reçoivent de l'intégrateur (`appId` dans la config), qui peut aussi forcer la valeur
  ailleurs. Voir « Identifiant d'application » plus bas : ce n'est **pas** une authentification.

## Enveloppe de réponse
Succès :
```json
{ "success": true, "data": { }, "message": "…" }
```
Erreur :
```json
{ "success": false, "error": "…", "code": "…", "timestamp": "…" }
```
`error` est **déjà un message en français destiné à l'utilisateur final**. Un SDK le relaie tel
quel ; il ne fabrique un message que pour ce que le serveur ne peut pas dire (perte de réseau,
timeout local).

## Endpoints REST

### `POST /widget/message`
Requête :
```json
{
  "message": "Bonjour",            // ≤ 2000 car. ; vide accepté si attachmentIds non vide
  "sessionId": "<uuid>",
  "clientMessageId": "<uuid v4>",  // idempotence ; UUID v4 strict ou 400
  "userId": "user-<uuid>",
  "userName": "…", "userEmail": "…",
  "attachmentIds": ["<uuid v4>"],  // ≤ 3
  "metadata": { }                  // libre ; enrichi côté serveur
}
```
Réponse `data` : `sessionId`, `response`, `userMessageId`, `assistantMessageId`, `sources`,
`suggestions`, `conversationId`, `quota`, `metadata`.

> `sessionId` renvoyé peut **différer** de celui envoyé (le serveur a ouvert une nouvelle
> conversation). Le SDK doit alors archiver l'ancienne session et adopter la nouvelle — y compris
> reconnecter le WebSocket, qui est indexé sur le `sessionId`.

Erreurs : `INVALID_MESSAGE`, `MESSAGE_TOO_LONG`, `TOO_MANY_ATTACHMENTS`, `INVALID_ATTACHMENT_ID`,
`INVALID_CLIENT_MESSAGE_ID`, `RATE_LIMIT_EXCEEDED` (429), `QUOTA_EXCEEDED` (403).

### `POST /widget/upload`
Multipart, **un seul fichier**, champ `file`. Ne jamais poser `Content-Type` à la main : la
bibliothèque HTTP doit écrire elle-même le `boundary`.
Réponse `201`, `data` : `{ id, name, mimeType, size, category }`. `id` va ensuite dans
`attachmentIds` du message. Un fichier non consommé par un message est purgé au bout d'une heure.
Erreurs : `ATTACHMENTS_DISABLED` (403, le propriétaire a désactivé la fonctionnalité),
`RATE_LIMIT_EXCEEDED`.

### `GET /widget/conversation/:sessionId?limit&offset`
`limit` plafonné à 100 côté serveur. Réponse `data` : `sessionId`, `messages[]`, `totalMessages`,
`conversationStatus`, `handoffStatus`, `handoffReason`, `assignedAgent`, `endedAt`, `labels`,
`priority`, `metadata`.
`messages[]` : `{ id, role, content, timestamp, metadata, feedback, messageIndex, attachments? }`
- `role` ∈ `user` | `assistant` | `agent` (`internal_note` n'est jamais exposé au widget)
- `attachments[].url` est une **URL signée, à durée de vie limitée** — à ne pas mettre en cache
  durablement.

`404` si la conversation n'existe pas encore : cas **normal** pour une session neuve, à traiter
comme « pas d'historique », jamais comme une erreur affichée.

### `POST /widget/conversation/:sessionId/end`
`{ rating: 1..5|null, feedback: string ≤1000|null, sessionDuration, messageCount }`.
Erreurs : `INVALID_RATING`, `INVALID_FEEDBACK`.

### `POST /widget/conversation/:sessionId/timeout`
Clôture pour inactivité. Le motif est **imposé par la route**, le client ne le fournit pas.
Corps : `{ sessionDuration, messageCount }`.

### `POST /widget/conversation/:sessionId/message-feedback`
`{ messageId | messageIndex, value: "up" | "down" | null }` — `null` retire l'avis.
`messageId` est le **`serverId`** du message (`assistantMessageId`), pas l'identifiant local.
Erreurs : `MISSING_MESSAGE_TARGET`, `INVALID_FEEDBACK_VALUE`.

### `GET /widget/config`
Réponse `data` :
```jsonc
{
  "tenant": { "id", "name", "subscriptionPlan" },
  "chatbot": {
    "name", "welcomeMessage",
    "theme":    { "primaryColor", "textColor", "position" },
    "features": { "analytics", "customBranding", "autoResponseSuggestions" },
    "options": {
      "enableMarkdown": true,
      "ui": { "colorScheme"?, "avatarUrl"?, "launcherIconUrl"? },  // absents si non définis
      "features": { "messageFeedback", "conversationRating", "showTimestamps",
                    "showDeliveryStatus", "dateSeparators", "connectivityStatus",
                    "attachments", "liveTypingPreview" },
      "attachments": { "maxFiles": 3, "maxBytes": 10485760 }
    }
  }
}
```
`404 TENANT_NOT_FOUND` si le tenant est inactif. Les clés de `options.ui` sont **optionnelles** :
un SDK ne doit jamais présumer de leur présence.

### `GET /widget/quick-replies?category=greeting`
`data` : `{ suggestions: string[], category, tenant }`. Catégories : `greeting` (défaut),
`support`, `pricing`.

### `POST /widget/push-token`
Enregistre le jeton de notification de l'appareil pour **la session courante**.
```json
{ "sessionId": "<uuid>", "token": "<jeton FCM ou APNs>", "platform": "fcm" | "apns", "locale": "fr" | "en" }
```
Réponse `200`, `data` : `{ "registered": true }`. Un jeton n'est lié qu'à **une** session à la fois : le
réenregistrer avec un autre `sessionId` le déplace (le SDK le refait à chaque nouvelle session).
Erreurs : `INVALID_PUSH_TOKEN` (400), `PUSH_NOT_ENABLED` (403 : le propriétaire n'a pas configuré les
notifications mobiles — le SDK l'ignore sans rien afficher), `RATE_LIMIT_EXCEEDED`. Limite : 10 requêtes /
5 min / IP.

### `DELETE /widget/push-token`
`{ "token": "<jeton>" }` — oublie le jeton (déconnexion de l'utilisateur dans l'app hôte). Réponse `200`,
`data` : `{ "removed": true | false }`.

### `GET /widget/health`
`data.status === "healthy"`. Sert de sonde de connectivité, ~1 appel/minute maximum.

## WebSocket
```
wss://{host}/api/widget/conversation/{sessionId}/socket?tenantId={tenantId}
```
- URL dérivée de `apiUrl` en remplaçant `http`→`ws` / `https`→`wss`. `sessionId` et `tenantId`
  doivent être URL-encodés.
- **Pas de header `X-Tenant-ID`** ici : l'autorisation passe par le paramètre de requête.
- Paramètre facultatif `appId={identifiant d'application}` (URL-encodé), pour le même contrôle que `X-App-Id`.
- Échec d'autorisation = socket détruit sans handshake. Pas de message d'erreur applicatif.
- Le serveur envoie des `ping` de heartbeat ; les clients WS natifs y répondent seuls.

Événements reçus (JSON) :
| `type` | Charge | Action attendue |
|---|---|---|
| `conversation.sync` | `handoff` | Recharger l'historique via `GET /widget/conversation/:sessionId` |
| `message` | `message: { id, role, content, attachments }` | Si `role === "agent"` et `id` inconnu, ajouter le message |
| *(tout événement)* | `handoff: { status, assignedAgent }` | Mettre à jour le statut de reprise humaine |

`handoff.status` : `none` | `waiting` (« Un conseiller a été prévenu ») | `human` (« Vous échangez
avec {nom} »).

Le socket est **descendant**, à une seule exception : l'aperçu de saisie (ci-dessous). L'envoi d'un
message passe toujours par REST.

### Aperçu de saisie (`typing`) — seule trame montante

Quand le propriétaire a activé `options.features.liveTypingPreview` (désactivé par défaut) **et** que
`handoff.status === "human"`, le SDK envoie sur le socket :
```json
{ "type": "typing", "text": "début du message en cours de frappe" }
```
- `text` ≤ 500 caractères, une trame au plus toutes les **200 ms**, trame ≤ 2 048 octets. Une chaîne vide
  signale que le champ est vidé ou le message envoyé.
- Le serveur ignore en silence toute trame refusée (fonction inactive, pas de prise en charge humaine,
  cadence, taille) : aucun message d'erreur. Le texte n'est **jamais** enregistré ni journalisé ; il est
  relayé au seul conseiller.
- C'est une donnée personnelle sensible (le visiteur n'a pas encore envoyé ce texte) : le SDK ne l'envoie
  que dans ces deux conditions, jamais autrement, et l'application hôte peut le désactiver
  (`VoxoOptions.enableLiveTyping = false`).

Reconnexion : backoff exponentiel `min(1000 × 2^tentative, 15000)` ms. Abandonner si le
`sessionId` a changé depuis la programmation de la reconnexion.

## Limites à répliquer côté client
| Règle | Valeur | Source |
|---|---|---|
| Longueur d'un message | 2 000 caractères | `widgetMessageValidator.js` |
| Pièces jointes par message | 3 | `config/fileUploads.js` |
| Taille d'un fichier | 10 Mo (après compression) | `shared/file-rules.mjs` |
| Messages par minute | 15 | `widgetRoutes.js` |
| Requêtes par 5 min | 100 | `widgetRoutes.js` |
| Uploads par 5 min | 10 | `widgetAttachmentRoutes.js` |
| Timeout REST | 30 s (120 s pour l'upload) | `widget/src/api.js` |
| Rappel d'inactivité | 10 min, 3 rappels puis `/timeout` | `widget/src/widget.js` |
| Expiration de session locale | 30 min sans activité | `widget/src/widget.js` |
| Messages persistés | 50 derniers | `widget/src/widget.js` |
| Historique local conservé | 30 jours, 30 conversations | `widget/src/widget.js` |

Extensions acceptées (contexte `conversation`) : `.pdf .doc .docx .xlsx .txt .md` et
`.jpg .jpeg .png .webp .gif .bmp .tif .tiff`. Compression image avant envoi : 2 048 px sur le
plus grand côté, WebP qualité 0,82, repli JPEG. Le fichier d'origine est conservé si la
compression ne fait rien gagner.

## Séquences

**Démarrage**
```
restaurer session locale
  → GET /widget/config          (thème, nom, fonctionnalités)
  → si aucun message : GET /widget/quick-replies + message d'accueil local
  → ouvrir le WebSocket
  → à l'ouverture du socket : GET /widget/conversation/:sessionId (404 = session neuve, ignorer)
```

**Envoi**
```
valider (longueur, rate limit local, uploads terminés)
  → afficher le message en "sending" avec un clientMessageId UUID v4
  → POST /widget/message
  → si data.sessionId a changé : archiver l'ancienne, adopter la nouvelle, reconnecter le socket
  → passer le message en "answered", stocker serverId = userMessageId
  → ajouter la réponse si assistantMessageId n'est pas déjà présent
  → échec : passer en "failed", garder le texte et les pièces jointes pour le retry
```

**Pièce jointe**
```
choisir le fichier → compresser si image → valider → POST /widget/upload
  → conserver data.id → l'inclure dans attachmentIds du prochain message
```

**Clôture**
```
note 1-5 + commentaire → POST /widget/conversation/:sessionId/end
inactivité (3 rappels sans réponse) → POST /widget/conversation/:sessionId/timeout
puis : archiver localement, marquer la session terminée, en ouvrir une neuve au message suivant
```

## Notifications push

Le SDK **ne dépend pas** de Firebase ni d'APNs : c'est l'application hôte qui obtient le jeton auprès de
FCM/APNs et le confie au SDK (`registerPushToken(token, platform)`), puis affiche la notification. Les
identifiants d'envoi (compte de service FCM, clé APNs) appartiennent au propriétaire du chatbot, qui les
saisit dans son dashboard ; ils ne passent jamais par le SDK.

- **Déclencheur** : un message de conseiller (non interne) est ajouté à une conversation, **et aucun
  WebSocket n'est connecté** pour cette session sur l'instance qui le traite. Application ouverte, le
  socket suffit ; fermée, la notification part.
- **Contenu** — FCM : `notification: { title, body }` + `data`. APNs : `aps.alert` + `thread-id`. Le titre
  est le nom du conseiller (à défaut, celui du chatbot) ; le corps est le début du message (≤ 140
  caractères). La charge `data` / `voxo` porte :
```json
{ "type": "voxo.agent_message", "sessionId": "<uuid>", "messageId": "<id>" }
```
  À la réception d'un toucher, l'application hôte ouvre `VoxoChatView` ; le SDK recharge l'historique.
- **Hygiène** : le serveur supprime un jeton que FCM/APNs déclarent invalide (`UNREGISTERED`, `410`).
- **Confidentialité** : le début du message transite par Google/Apple. Le propriétaire peut le remplacer
  par un texte générique depuis son dashboard.

## Identifiant d'application

Pendant mobile de la liste de domaines autorisés. Le propriétaire déclare les identifiants de ses
applications (`com.exemple.app`, `fr.exemple.ios`) et peut **bloquer** les autres.

- Le SDK envoie `X-App-Id` (REST) / `appId` (WebSocket).
- Le contrôle ne s'applique qu'aux requêtes **sans `Origin`** (clients natifs) : le web reste régi par les
  domaines. Liste vide → rien n'est contrôlé. Mode observation (par défaut) → l'écart est journalisé, la
  requête passe. Mode blocage → `403 APP_NOT_ALLOWED` (message en français, relayé tel quel).
- Format : `^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$`, 50 entrées au plus.
- **Limite à connaître** : `X-App-Id` est déclaratif. N'importe quel client HTTP peut le forger : cela
  écarte l'usage involontaire (une autre app, un environnement de test mal configuré), **pas** un
  attaquant décidé. Une garantie réelle exige une attestation (Play Integrity, App Attest), non prévue ici.

## Conversations archivées

Le SDK conserve localement `{ sessionId, title, endedAt }` (30 jours, 30 conversations). Pour en afficher
une, il recharge **en lecture seule** `GET /widget/conversation/:sessionId`, sans toucher à la session
active : l'envoi reste lié à la session courante. Un `404` (purgée côté serveur) se présente comme
« Historique indisponible », jamais comme une erreur technique.

## Sécurité — ce que le mobile change

1. **`enforceDomains` ne protège pas le mobile.** `widgetOriginGuard` laisse passer toute requête
   **sans header `Origin`** ; un client HTTP natif n'en envoie pas. La restriction de domaines
   d'un tenant ne s'applique donc qu'au web. C'est cohérent (une application n'a pas de domaine)
   mais doit être connu : le `tenantId` seul suffit à parler à l'API depuis une app. Le pendant
   mobile est la liste d'identifiants d'application (voir « Identifiant d'application ») — un garde-fou
   contre l'usage involontaire, pas une authentification.
2. **Le rate limit est indexé sur l'IP.** Derrière un NAT opérateur, plusieurs utilisateurs
   partagent une IP et peuvent se bloquer mutuellement à 15 msg/min. Un SDK doit traiter un `429`
   comme une condition **transitoire** : message clair, pas de renvoi automatique en boucle.
3. Le `tenantId` n'est **pas** un secret — il est déjà public dans le `<script>` du widget web.
   Aucun autre secret ne doit figurer dans une application cliente.
