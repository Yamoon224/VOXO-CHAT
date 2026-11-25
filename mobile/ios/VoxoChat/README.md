# VoxoChat (iOS)

SDK d'intégration [VOXO Chat](https://github.com/guijo225/voxo-chat) pour iOS (Swift,
SwiftUI) : l'assistant conversationnel de votre tenant, embarqué dans votre application,
avec reprise par un conseiller humain, pièces jointes et notation.

Le SDK consomme le même contrat public `/api/widget/*` que le widget web. Ce contrat fait
autorité et est décrit dans [`mobile/CONTRACT.md`](../../CONTRACT.md). L'API publique est
alignée sur le SDK Flutter, qui sert de référence.

> **Statut : non vérifié.** Ce SDK a été écrit sans chaîne Swift ni Xcode à disposition : il
> n'a **jamais été compilé ni exécuté**, et ses tests n'ont jamais tourné. Attendez-vous à
> quelques erreurs de compilation à corriger au premier build. Voir « Vérification » plus bas.

**Prérequis** : iOS 15+, Swift 5.9+, Xcode 15+.

## Installation

Le SDK vit dans le monorepo et se consomme depuis un clone du dépôt, comme paquet Swift
local. Dans Xcode : **File → Add Package Dependencies… → Add Local…** et choisissez le
dossier `mobile/ios/VoxoChat`. Ou, dans un `Package.swift` :

```swift
dependencies: [
    .package(path: "chemin/vers/voxo-chat/mobile/ios/VoxoChat"),
],
targets: [
    .target(name: "MonApp", dependencies: [.product(name: "VoxoChat", package: "VoxoChat")]),
]
```

La publication sur un registre est exclue (licence propriétaire, voir `LICENSE`).

## Démarrage

`apiUrl` et `tenantId` se trouvent dans l'onglet **Intégration** de votre dashboard VOXO. Le
`tenantId` n'est pas un secret — il est déjà public dans le `<script>` du widget web.

```swift
import VoxoChat

let config = try VoxoConfig(
    apiUrl: "https://votre-backend/api",
    tenantId: "00000000-0000-4000-8000-000000000000",
    // Facultatif : évite le formulaire de pré-chat si vous connaissez déjà votre utilisateur.
    user: VoxoUser(name: "Awa Diop", email: "awa@example.com")
)
let voxo = VoxoController(config: config)   // sur le thread principal
```

`VoxoConfig` lève une `VoxoException` (code `INVALID_CONFIG`, message en français) si l'URL ou
le tenant sont invalides.

Un `VoxoController` porte une conversation. Gardez-le vivant tant que l'utilisateur peut y
revenir (un `@StateObject` ou un conteneur d'injection) et appelez `dispose()` quand vous en
avez fini — c'est ce qui ferme le WebSocket. Il est isolé sur l'acteur principal.

### Langue (FR/EN)

Sans rien préciser, tout s'affiche en français. `VoxoConfig(…, locale: "en")` fixe la langue
de départ (`fr` | `en`, toute autre valeur retombe sur `fr`) ; `voxo.setLocale("en")` la change
en cours de conversation. La locale suit dans l'en-tête `Accept-Language` et dans
`metadata.locale` de chaque message, et le choix est persisté par tenant.
`VoxoOptions(showLanguageSwitcher: true)` affiche un sélecteur FR/EN dans l'en-tête.

### Identifiant d'application

Le SDK envoie le *bundle identifier* de votre application (`X-App-Id` en REST, `appId` sur le WebSocket) : il le détecte
seul. Le propriétaire du chatbot peut ainsi limiter les applications autorisées depuis son dashboard. C'est un
garde-fou contre l'usage involontaire, **pas** une authentification — l'en-tête est déclaratif. Pour forcer une autre
valeur : `VoxoConfig(…, appId: "com.exemple.app")`.

### Notifications push

Le SDK ne dépend pas d'APNs ni de Firebase : votre application obtient le jeton et le lui confie.

```swift
// AppDelegate
func application(_ app: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken data: Data) {
    let token = data.map { String(format: "%02x", $0) }.joined()
    Task { await voxo.registerPushToken(token, platform: .apns) }   // .fcm si vous passez par Firebase
}
// À la déconnexion de l'utilisateur : await voxo.unregisterPushToken()
```

Le jeton est lié à la conversation courante et relié automatiquement à chaque nouvelle session. Sans effet — et sans
erreur — si le propriétaire n'a pas activé les notifications mobiles. Le serveur n'envoie une notification que si
l'application n'a **pas** de connexion temps réel ouverte. L'app hôte reçoit la notification (`voxo.type ==
"voxo.agent_message"`, `voxo.sessionId`) ; un toucher ouvre `VoxoChatView`, qui recharge l'historique.

### Aperçu de saisie

Si le propriétaire l'a activé, et **uniquement** pendant qu'un conseiller a pris la conversation en charge, le texte en
cours de frappe est transmis à ce conseiller (jamais enregistré). L'UI fournie s'en charge ; avec votre propre champ,
appelez `voxo.notifyTyping(texte)` à chaque modification. Pour le désactiver côté application :
`VoxoOptions(enableLiveTyping: false)`.

### Historique des conversations

`VoxoChatView` propose, dans le menu ⋮ de l'en-tête, la liste des conversations terminées (30 jours, 30 au plus) et leur
relecture **en lecture seule** — la conversation active n'est pas modifiée. Pour une UI sur mesure :
`await voxo.history()` puis `try await voxo.archivedConversation(sessionId)`. Une conversation purgée côté serveur
donne `HISTORY_UNAVAILABLE`.

### UI prête à l'emploi

```swift
struct RootView: View {
    @State private var chatOpen = false
    let voxo: VoxoController

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            VotreApplication()
            VoxoLauncher(controller: voxo) { chatOpen = true }.padding()
        }
        .fullScreenCover(isPresented: $chatOpen) {
            VoxoChatView(controller: voxo, onClose: { chatOpen = false })
        }
    }
}
```

`VoxoChatView` démarre le controller (`start()` est idempotent) et le marque ouvert pendant
son affichage ; il ne le libère jamais, il ne lui appartient pas. Avant l'arrivée de la
configuration distante, le `VoxoLauncher` garde la couleur par défaut.

### Votre propre interface

Le core ne dépend ni de SwiftUI ni de Combine. Tout l'état passe par `VoxoUiState` :

```swift
await voxo.start()                       // idempotent

voxo.observe { state in                  // rappelé à chaque changement (et tout de suite)
    state.messages        // fil trié
    state.connectivity    // .connecting | .available | .unavailable
    state.handoff.label(for: state.locale)
    state.lastError       // à acquitter avec voxo.clearError()
}
for await state in voxo.stateStream { … }   // variante AsyncSequence

await voxo.sendMessage("Bonjour")
await voxo.retry(messageId)
await voxo.submitFeedback(message, .up)
_ = await voxo.endConversation(rating: 5, comment: "Parfait")
await voxo.startNewSession()
voxo.setOpen(true)                       // l'inactivité ne court que s'il est ouvert
```

Les pièces jointes passent par `voxo.attachments.addAll([cheminLocal])` (des chemins de
fichiers : l'UI fournie copie les fichiers choisis dans le cache avant de les confier à la
file) et `voxo.attachments.remove(localId)`.

## Thème

Par défaut, le thème vient de la configuration du tenant : couleur d'accent, nom, avatar,
message d'accueil et fonctionnalités activées sont ceux que le propriétaire du chatbot a
définis dans son dashboard, et le mode sombre du système est suivi tant qu'il n'en a pas
imposé un. Pour l'imposer :

```swift
var theme = VoxoTheme.fromConfig(voxo.state.chatbot, systemDark: true)
theme.cornerRadius = 20
VoxoChatView(controller: voxo, theme: theme)
```

## Permissions

Le sélecteur de documents (`fileImporter`) ne demande aucune autorisation. Pour les pièces
jointes, rien d'autre n'est requis dans `Info.plist`.

## Développement local

Un backend VOXO lancé sur votre machine est servi en HTTP simple. Le simulateur iOS partage le
réseau du Mac et joint `localhost` directement, mais **App Transport Security** bloque le HTTP
en clair : ajoutez une exception `NSAllowsLocalNetworking` (ou `NSExceptionDomains` pour
`localhost`) dans l'`Info.plist` d'un build de **debug** uniquement — jamais en production.

## Ce que le SDK fait pour vous

- Session persistée (`UserDefaults`) et restaurée au redémarrage ; archivée au-delà de
  30 minutes d'inactivité
- Statut de livraison par message, et renvoi d'un message en échec **sans** re-téléverser ses
  pièces jointes ni risquer un doublon côté serveur (`clientMessageId` stable)
- WebSocket (`URLSessionWebSocketTask`) avec reconnexion en backoff exponentiel
- Compression des images avant envoi (2 048 px, JPEG qualité 0,82 : ImageIO ne sait pas écrire
  le WebP, c'est le repli prévu par le contrat), validation des formats et des tailles avant
  tout appel réseau
- Rate limiting client aligné sur le serveur, relances puis clôture automatique après inactivité
- Messages d'erreur FR/EN — ceux du SDK via `VoxoI18n`, ceux du backend relayés tels quels

## Limites imposées par le serveur

| Règle | Valeur |
| --- | --- |
| Longueur d'un message | 2 000 caractères |
| Pièces jointes par message | 3 |
| Taille d'un fichier | 10 Mo |
| Messages par minute | 15 |

Le rate limit serveur est indexé sur l'adresse IP : derrière un NAT opérateur, un `429` peut
survenir sans que vous ayez atteint la limite. Le SDK le traite comme une condition transitoire
et ne renvoie jamais automatiquement.

## Vérification

Le **core** (dossiers `Core/` et `Models/`, ainsi que la logique pure de `UI/` : markdown,
couleurs, dates) n'utilise que Foundation ; l'UI SwiftUI est entièrement sous
`#if canImport(SwiftUI)`. Les tests se lancent donc sans plateforme Apple :

```bash
swift test
```

Sur Mac, vérifiez aussi la couche SwiftUI : ouvrez le paquet dans Xcode, compilez pour un
simulateur iOS 15+, puis lancez l'écran sur un backend de test.

## Limites connues

- Non compilé ni testé à ce jour (voir « Statut »).
- Les icônes de l'UI sont des glyphes Unicode (👍 📎 ★), cohérents avec le SDK Android.
- Pas d'application d'exemple pour l'instant.

## Licence

Logiciel propriétaire, tous droits réservés — voir [`LICENSE`](LICENSE). Son usage est réservé
aux clients VOXO Chat dans le cadre de leur contrat ; la publication sur un registre public est
exclue.
