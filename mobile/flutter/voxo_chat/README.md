# voxo_chat

SDK d'intégration [VOXO Chat](https://github.com/guijo225/voxo-chat) pour Flutter :
l'assistant conversationnel de votre tenant, embarqué dans votre application, avec
reprise par un conseiller humain, pièces jointes et notation.

Le SDK consomme le même contrat public `/api/widget/*` que le widget web. Ce contrat
fait autorité et est décrit dans [`mobile/CONTRACT.md`](../../CONTRACT.md).

## Installation

```yaml
dependencies:
  voxo_chat:
    git:
      url: https://github.com/guijo225/voxo-chat.git
      path: mobile/flutter/voxo_chat
```

## Démarrage

`apiUrl` et `tenantId` se trouvent dans l'onglet **Intégration** de votre dashboard
VOXO. Le `tenantId` n'est pas un secret — il est déjà public dans le `<script>` du
widget web.

```dart
final voxo = VoxoController(
  config: VoxoConfig(
    apiUrl: 'https://votre-backend/api',
    tenantId: '00000000-0000-4000-8000-000000000000',
    // Facultatif : évite le formulaire de pré-chat si vous connaissez déjà
    // votre utilisateur.
    user: VoxoUser(name: 'Awa Diop', email: 'awa@example.com'),
  ),
);
```

Un `VoxoController` porte une conversation. Gardez-le vivant tant que
l'utilisateur peut y revenir, et appelez `dispose()` quand vous en avez fini —
c'est ce qui ferme le WebSocket.

### Identifiant d'application (`appId`)

Le propriétaire du chatbot peut restreindre l'accès aux applications qu'il a
déclarées (voir `mobile/CONTRACT.md`, « Identifiant d'application »). Le SDK envoie
`appId` en en-tête `X-App-Id` sur chaque requête REST et en paramètre `appId` du
WebSocket, **seulement s'il est renseigné**. Flutter ne le détecte pas seul (pas de
dépendance native ajoutée au SDK) : passez-le depuis votre application, par exemple
avec `package_info_plus` :

```dart
final info = await PackageInfo.fromPlatform();
final config = VoxoConfig(
  apiUrl: 'https://votre-backend/api',
  tenantId: '00000000-0000-4000-8000-000000000000',
  appId: info.packageName, // package name Android / bundle identifier iOS
);
```

Cette valeur est déclarative : ce n'est pas une authentification.

### Notifications push

Le SDK ne dépend ni de Firebase ni d'APNs. Votre application obtient le jeton et le
confie au SDK, qui le lie à la conversation courante (`POST /widget/push-token`),
le persiste par tenant, le relie à chaque nouvelle session et le renvoie après un
redémarrage. Si le propriétaire n'a pas activé les notifications, ou en cas de
panne, rien n'est affiché : le SDK réessaie à la session suivante.

```dart
// Côté application hôte, avec firebase_messaging.
final messaging = FirebaseMessaging.instance;
await messaging.requestPermission();

final token = await messaging.getToken();
if (token != null) {
  await voxo.registerPushToken(token, VoxoPushPlatform.fcm);
}
// Le jeton FCM change de temps en temps : confiez le nouveau.
messaging.onTokenRefresh.listen(
  (token) => voxo.registerPushToken(token, VoxoPushPlatform.fcm),
);

// À la déconnexion de l'utilisateur :
await voxo.unregisterPushToken();
```

Utilisez `VoxoPushPlatform.apns` si vous transmettez un jeton APNs brut.
L'affichage et le routage des notifications reçues restent de votre côté.

### Aperçu de saisie

Quand un conseiller a pris la main, il peut voir ce que l'utilisateur est en train
d'écrire. Rien ne part tant que ces trois conditions ne sont pas réunies :
`features.liveTypingPreview` activé par le propriétaire (désactivé par défaut),
reprise humaine en cours, et `VoxoOptions.enableLiveTyping` (vrai par défaut). Le
texte est plafonné à 500 caractères, une trame au plus toutes les 200 ms, et un
champ vidé efface l'aperçu. Envoyer un message l'efface aussi.

```dart
// Opt-out côté application : aucun aperçu, quoi que dise le propriétaire.
VoxoConfig(
  apiUrl: '…',
  tenantId: '…',
  options: const VoxoOptions(enableLiveTyping: false),
);
```

`VoxoChatView` appelle `voxo.notifyTyping(text)` à chaque modification du champ ;
une interface maison fait de même.

### Historique des conversations

`VoxoChatView` affiche un bouton historique dans son en-tête : liste des
conversations archivées sur l'appareil (30 jours), puis transcription en lecture
seule (sans zone de saisie, avis ni renvoi). La conversation active n'est jamais
modifiée. Avec une interface maison :

```dart
final items = await voxo.history();                  // titre, date, sessionId
final view = await voxo.archivedConversation(items.first.sessionId);
print(view.messages);  // List<VoxoMessage>
print(view.handoff);   // VoxoHandoff
```

Une conversation purgée côté serveur lève une `VoxoException` de code
`HISTORY_UNAVAILABLE` (statut 404, « Historique indisponible »), à afficher telle
quelle.

### Langue (FR/EN)

Le SDK est bilingue français/anglais. Sans rien préciser, tout s'affiche en
français — c'est le comportement historique, inchangé pour les intégrations
existantes.

```dart
final voxo = VoxoController(
  config: VoxoConfig(
    apiUrl: 'https://votre-backend/api',
    tenantId: '00000000-0000-4000-8000-000000000000',
    locale: 'en', // 'fr' | 'en' — toute autre valeur retombe sur 'fr'
    options: const VoxoOptions(showLanguageSwitcher: true),
  ),
);
```

- `VoxoConfig.locale` fixe la langue de départ (`'fr'` par défaut).
- `VoxoOptions.showLanguageSwitcher` affiche un sélecteur FR/EN dans l'en-tête
  de `VoxoChatView` (activé par défaut) ; passez `onLocaleChanged` vous-même si
  vous construisez votre propre interface.
- `voxo.setLocale('en')` change la langue en cours de conversation : l'UI se
  redessine immédiatement, la locale envoyée au serveur (en-tête
  `Accept-Language` et `metadata.locale` de chaque message) suit, et le choix
  est persisté par tenant via `shared_preferences` — il est donc restauré au
  prochain démarrage de l'application, y compris entre deux sessions de
  conversation.

Tous les textes affichés par le SDK (erreurs réseau et de validation, dates
« Aujourd'hui »/« Hier », notation de fin, indicateur de frappe, pièces
jointes, reprise humaine, relances d'inactivité…) passent par ce mécanisme —
voir `lib/src/voxo_i18n.dart`. Le sous-ensemble partagé avec le widget web et
le SDK React Native (évaluations, erreurs réseau, aujourd'hui/hier) est
couvert par un test de non-régression : `test/voxo_i18n_parity_test.dart`.

### UI prête à l'emploi

```dart
// Bulle flottante
Scaffold(
  floatingActionButton: VoxoLauncher(controller: voxo),
);

// Ou l'écran complet, où vous voulez
VoxoLauncher.open(context, voxo);
```

`VoxoChatView` s'utilise aussi directement, par exemple dans un onglet :

```dart
VoxoChatView(controller: voxo)
```

L'écran ne dispose jamais le controller : il ne lui appartient pas.

### Votre propre interface

Le controller est un `ChangeNotifier` : tout l'état passe par lui, sans rien devoir
à l'UI fournie.

```dart
await voxo.init();
voxo.addListener(() {
  print(voxo.messages);       // fil trié
  print(voxo.connectivity);   // connecting | available | unavailable
  print(voxo.handoff.label);                    // toujours en français
  print(voxo.handoff.labelFor(voxo.config.locale)); // dans la locale courante
});

await voxo.sendMessage('Bonjour');
await voxo.retry(messageId);                       // renvoi d'un message en échec
await voxo.submitFeedback(message, VoxoFeedback.up);
await voxo.endConversation(rating: 5, feedback: 'Parfait');
await voxo.startNewSession();
```

Les pièces jointes passent par `voxo.attachments` et
`VoxoChatActions.pickFiles(voxo)`.

## Thème

Par défaut, le thème vient de la configuration du tenant : couleur d'accent, nom,
message d'accueil et fonctionnalités activées sont ceux que le propriétaire du
chatbot a définis dans son dashboard. Pour l'imposer :

```dart
VoxoChatView(
  controller: voxo,
  theme: VoxoTheme.fromConfig(voxo.chatbot, platformBrightness: Brightness.dark),
)
```

## Permissions natives

Nécessaires seulement si vous laissez les pièces jointes actives.

**iOS** — `ios/Runner/Info.plist` :

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Pour joindre une photo à votre conversation avec le support.</string>
<key>NSCameraUsageDescription</key>
<string>Pour envoyer une photo prise sur le moment au support.</string>
```

**Android** — rien à déclarer : le sélecteur de documents ne demande pas de
permission de stockage.

## Développement local

Un backend VOXO lancé sur votre machine est servi en HTTP simple, ce qui demande
deux ajustements côté application :

- **Émulateur Android** : `localhost` désigne l'émulateur. Utilisez `10.0.2.2`
  pour joindre votre machine — `http://10.0.2.2:5000/api`.
- **HTTP en clair** : Android le bloque depuis Android 9. Ajoutez
  `android:usesCleartextTraffic="true"` dans
  `android/app/src/debug/AndroidManifest.xml` uniquement — jamais dans le
  manifeste principal. Voir [`example/`](example/) pour le fichier complet.

Le simulateur iOS partage le réseau du Mac et joint `localhost` directement.

## Ce que le SDK fait pour vous

- Session persistée et restaurée au redémarrage ; archivée au-delà de 30 minutes
  d'inactivité
- Statut de livraison par message, et renvoi d'un message en échec **sans**
  re-téléverser ses pièces jointes ni risquer un doublon côté serveur
- WebSocket avec reconnexion en backoff exponentiel, pour recevoir la réponse
  d'un conseiller même écran fermé
- Compression des images avant envoi (2 048 px, WebP), validation des formats et
  des tailles avant tout appel réseau
- Rate limiting client aligné sur le serveur, relances puis clôture automatique
  après inactivité
- Messages d'erreur bilingues FR/EN — ceux du SDK via `VoxoI18n`, ceux du
  backend relayés tels quels (déjà rédigés dans la locale de la requête)

## Limites imposées par le serveur

| Règle | Valeur |
| --- | --- |
| Longueur d'un message | 2 000 caractères |
| Pièces jointes par message | 3 |
| Taille d'un fichier | 10 Mo |
| Messages par minute | 15 |

Le rate limit serveur est indexé sur l'adresse IP : derrière un NAT opérateur, un
`429` peut survenir sans que vous ayez atteint la limite. Le SDK le traite comme
une condition transitoire et ne renvoie jamais automatiquement.

## Tests

```bash
flutter test
```

## Exemple

[`example/`](example/) est une application minimale qui demande `apiUrl` et
`tenantId`, puis ouvre le chat :

```bash
cd example && flutter run
```

## Licence

Logiciel propriétaire, tous droits réservés — voir [`LICENSE`](LICENSE). Son usage est réservé aux clients VOXO Chat dans le cadre de leur contrat ; la publication sur un registre public est exclue.
