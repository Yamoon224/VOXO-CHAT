# voxo-chat-android

SDK d'intégration [VOXO Chat](https://github.com/guijo225/voxo-chat) pour Android
(Kotlin, Jetpack Compose) : l'assistant conversationnel de votre tenant, embarqué
dans votre application, avec reprise par un conseiller humain, pièces jointes et
notation.

Le SDK consomme le même contrat public `/api/widget/*` que le widget web. Ce contrat
fait autorité et est décrit dans [`mobile/CONTRACT.md`](../../CONTRACT.md). L'API
publique est alignée sur le SDK Flutter, qui sert de référence.

**Prérequis** : `minSdk 26`, Kotlin 2.x, Jetpack Compose (Material 3).

## Installation

Le SDK vit dans le monorepo et se consomme depuis un clone du dépôt. Dans le
`settings.gradle.kts` de votre application :

```kotlin
include(":voxo-chat")
project(":voxo-chat").projectDir =
    file("chemin/vers/voxo-chat/mobile/android/voxo-chat-android/voxo-chat")
```

puis dans le `build.gradle.kts` du module :

```kotlin
dependencies {
    implementation(project(":voxo-chat"))
}
```

Votre projet doit déclarer les plugins `org.jetbrains.kotlin.plugin.compose` et
`org.jetbrains.kotlin.plugin.serialization` à la même version de Kotlin que le SDK
(2.2.20) — voir [`build.gradle.kts`](build.gradle.kts). La publication sur Maven
Central est une action explicite et séparée : elle n'a pas encore eu lieu.

## Démarrage

`apiUrl` et `tenantId` se trouvent dans l'onglet **Intégration** de votre dashboard
VOXO. Le `tenantId` n'est pas un secret — il est déjà public dans le `<script>` du
widget web.

```kotlin
val voxo = VoxoController(
    context = applicationContext,
    config = VoxoConfig(
        apiUrl = "https://votre-backend/api",
        tenantId = "00000000-0000-4000-8000-000000000000",
        // Facultatif : évite le formulaire de pré-chat si vous connaissez déjà
        // votre utilisateur.
        user = VoxoUser(name = "Awa Diop", email = "awa@example.com"),
    ),
)
```

`VoxoConfig` lève une `VoxoException` (code `INVALID_CONFIG`, message en français)
si l'URL ou le tenant sont invalides : construisez-le dans un `try`, ou validez la
saisie en amont.

Un `VoxoController` porte une conversation. Gardez-le vivant tant que l'utilisateur
peut y revenir (typiquement dans un `ViewModel` ou un conteneur d'injection) et
appelez `dispose()` quand vous en avez fini — c'est ce qui ferme le WebSocket.
Appelez-le depuis le **thread principal**.

### Langue (FR/EN)

Sans rien préciser, tout s'affiche en français. `VoxoConfig(locale = "en")` fixe la
langue de départ (`fr` | `en`, toute autre valeur retombe sur `fr`) ;
`voxo.setLocale("en")` la change en cours de conversation. La locale suit dans
l'en-tête `Accept-Language` et dans `metadata.locale` de chaque message, et le choix
est persisté par tenant. `VoxoOptions(showLanguageSwitcher = true)` affiche un
sélecteur FR/EN dans l'en-tête de `VoxoChatView`.

### Identifiant d'application

Le SDK envoie le *package name* de votre application (`X-App-Id` en REST, `appId` sur le WebSocket) : il le détecte
seul. Le propriétaire du chatbot peut ainsi limiter les applications autorisées depuis son dashboard. C'est un
garde-fou contre l'usage involontaire, **pas** une authentification — l'en-tête est déclaratif. Pour forcer une
autre valeur : `VoxoConfig(…, appId = "com.exemple.app")`.

### Notifications push

Le SDK ne dépend pas de Firebase : votre application obtient le jeton FCM et le lui confie.

```kotlin
FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
    scope.launch { voxo.registerPushToken(token, VoxoPushPlatform.FCM) }
}
// À chaque renouvellement de jeton : FirebaseMessagingService.onNewToken → registerPushToken(...)
// À la déconnexion de l'utilisateur : voxo.unregisterPushToken()
```

Le jeton est lié à la conversation courante et relié automatiquement à chaque nouvelle session. Sans effet — et sans
erreur — si le propriétaire n'a pas activé les notifications mobiles. Le serveur n'envoie une notification que si
l'application n'a **pas** de connexion temps réel ouverte. Votre `FirebaseMessagingService` affiche la notification
(titre = nom du conseiller, `data["type"] == "voxo.agent_message"`, `data["sessionId"]`) ; un toucher ouvre
`VoxoChatView`, qui recharge l'historique.

### Aperçu de saisie

Si le propriétaire l'a activé, et **uniquement** pendant qu'un conseiller a pris la conversation en charge, le texte en
cours de frappe est transmis à ce conseiller (jamais enregistré). L'UI fournie s'en charge ; avec votre propre champ,
appelez `voxo.notifyTyping(texte)` à chaque modification. Pour le désactiver côté application :
`VoxoOptions(enableLiveTyping = false)`.

### Historique des conversations

`VoxoChatView` propose, dans le menu ⋮ de l'en-tête, la liste des conversations terminées (30 jours, 30 au plus) et leur
relecture **en lecture seule** — la conversation active n'est pas modifiée. Pour une UI sur mesure :
`voxo.history()` puis `voxo.archivedConversation(sessionId)`. Une conversation purgée côté serveur donne
`HISTORY_UNAVAILABLE`.

### UI prête à l'emploi

```kotlin
// Écran complet : à vous de choisir où l'afficher (destination, dialogue, onglet…)
VoxoChatView(controller = voxo, onClose = { /* retour */ })

// Bouton flottant aux couleurs du chatbot
VoxoLauncher(controller = voxo, onClick = { showChat = true })
```

`VoxoChatView` démarre le controller (`init()` est idempotent) et le marque ouvert
pendant son affichage ; il ne le libère jamais, il ne lui appartient pas. Avant
l'arrivée de la configuration distante, le `VoxoLauncher` garde la couleur par
défaut : le thème du tenant s'applique dès la première ouverture du chat.

### Votre propre interface

Le core ne dépend d'aucune UI. Tout l'état passe par un `StateFlow<VoxoUiState>` :

```kotlin
voxo.init()                       // suspend, idempotent

val ui by voxo.state.collectAsStateWithLifecycle()
ui.messages        // fil trié
ui.connectivity    // CONNECTING | AVAILABLE | UNAVAILABLE
ui.handoff.labelFor(ui.locale)    // sous-titre de reprise humaine, localisé
ui.lastError       // message affichable ; acquittez avec voxo.clearError()

voxo.sendMessage("Bonjour")                  // suspend
voxo.retry(messageId)                        // renvoi d'un message en échec
voxo.submitFeedback(message, VoxoFeedback.UP)
voxo.endConversation(rating = 5, comment = "Parfait")
voxo.startNewSession()
voxo.setOpen(true)                           // l'inactivité ne court que s'il est ouvert
```

Les pièces jointes passent par `voxo.attachments.addAll(listOf(cheminLocal))` (des
chemins de fichiers, pas des `content://` : l'UI fournie les copie dans le cache avant
de les confier à la file) et `voxo.attachments.remove(localId)`.

## Thème

Par défaut, le thème vient de la configuration du tenant : couleur d'accent, nom,
avatar, message d'accueil et fonctionnalités activées sont ceux que le propriétaire du
chatbot a définis dans son dashboard, et le mode sombre du système est suivi tant
qu'il n'en a pas imposé un. Pour l'imposer :

```kotlin
val state by voxo.state.collectAsStateWithLifecycle()
VoxoChatView(
    controller = voxo,
    theme = VoxoTheme.fromConfig(state.chatbot, systemDark = true),
)
```

## Permissions natives

Le SDK déclare `INTERNET`. Le sélecteur de documents Android (`OpenMultipleDocuments`)
ne demande aucune permission de stockage : rien d'autre à déclarer.

## Développement local

Un backend VOXO lancé sur votre machine est servi en HTTP simple :

- **Émulateur Android** : `localhost` désigne l'émulateur. Utilisez `10.0.2.2` —
  `http://10.0.2.2:3000/api`.
- **HTTP en clair** : bloqué depuis Android 9. Ajoutez
  `android:usesCleartextTraffic="true"` dans le manifeste d'un build de **debug**
  uniquement (`src/debug/AndroidManifest.xml`) — jamais dans le manifeste principal.

## Ce que le SDK fait pour vous

- Session persistée (Jetpack DataStore) et restaurée au redémarrage ; archivée
  au-delà de 30 minutes d'inactivité
- Statut de livraison par message, et renvoi d'un message en échec **sans**
  re-téléverser ses pièces jointes ni risquer un doublon côté serveur
  (`clientMessageId` stable)
- WebSocket avec reconnexion en backoff exponentiel, pour recevoir la réponse d'un
  conseiller
- Compression des images avant envoi (2 048 px, WebP), validation des formats et
  des tailles avant tout appel réseau
- Rate limiting client aligné sur le serveur, relances puis clôture automatique après
  inactivité
- Messages d'erreur FR/EN — ceux du SDK via `VoxoI18n`, ceux du backend relayés tels
  quels

## Limites imposées par le serveur

| Règle | Valeur |
| --- | --- |
| Longueur d'un message | 2 000 caractères |
| Pièces jointes par message | 3 |
| Taille d'un fichier | 10 Mo |
| Messages par minute | 15 |

Le rate limit serveur est indexé sur l'adresse IP : derrière un NAT opérateur, un
`429` peut survenir sans que vous ayez atteint la limite. Le SDK le traite comme une
condition transitoire et ne renvoie jamais automatiquement.

## Tests

```bash
./gradlew :voxo-chat:testDebugUnitTest
```

## Exemple

[`example/`](example/) est une application minimale qui demande `apiUrl` et
`tenantId`, puis ouvre le chat :

```bash
./gradlew :example:installDebug
adb shell am start -n chat.voxo.example/.MainActivity --es tenantId <uuid>
```

## Limites connues

- Les icônes de l'UI sont des glyphes Unicode (👍 📎 ★), pour ne pas imposer
  `material-icons-extended` à votre application.

## Licence

Logiciel propriétaire, tous droits réservés — voir [`LICENSE`](LICENSE). Son usage est réservé aux clients VOXO Chat dans le cadre de leur contrat ; la publication sur un registre public est exclue.
