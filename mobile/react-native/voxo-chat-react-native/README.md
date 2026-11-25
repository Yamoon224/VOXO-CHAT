# voxo-chat-react-native

SDK d'intégration [VOXO Chat](https://github.com/guijo225/voxo-chat) pour React Native :
l'assistant conversationnel de votre tenant, embarqué dans votre application, avec
reprise par un conseiller humain, pièces jointes et notation.

Le SDK consomme le même contrat public `/api/widget/*` que le widget web. Ce contrat
fait autorité et est décrit dans [`mobile/CONTRACT.md`](../../CONTRACT.md).

## Installation

```json
{
  "dependencies": {
    "voxo-chat-react-native": "github:guijo225/voxo-chat#main&path:mobile/react-native/voxo-chat-react-native"
  }
}
```

Le paquet n'a **aucune dépendance runtime** : il n'utilise que `fetch` et `WebSocket`,
tous deux natifs. Ce dont il a besoin est déclaré en dépendances de pair, que vous
installez selon ce que vous activez :

| Paquet | Rôle | Quand |
| --- | --- | --- |
| `react-native-get-random-values` | identifiants d'idempotence des messages | **fortement recommandé** |
| `@react-native-async-storage/async-storage` | session qui survit au redémarrage | si `persistSession` |
| `react-native-safe-area-context` | encoches et barre système | pour l'UI fournie |
| `@react-native-documents/picker` | sélection de fichiers | si pièces jointes |
| `react-native-image-resizer` | compression avant envoi | si pièces jointes |

### Le polyfill `crypto`, en premier

React Native ne fournit pas `crypto.getRandomValues`. Chaque message porte un
`clientMessageId` en UUID v4, et c'est lui qui garantit côté serveur qu'un envoi
rejoué n'est pas traité deux fois.

```ts
// Tout en haut de votre point d'entrée, avant tout autre import.
import 'react-native-get-random-values'
```

Sans lui, le SDK retombe sur `Math.random` : le message part quand même, mais la
protection contre les doublons s'affaiblit. Un avertissement le signale une fois.

## Démarrage

`apiUrl` et `tenantId` se trouvent dans l'onglet **Intégration** de votre dashboard
VOXO. Le `tenantId` n'est pas un secret — il est déjà public dans le `<script>` du
widget web.

```tsx
import { VoxoProvider, VoxoLauncher } from 'voxo-chat-react-native'

export default function App() {
  return (
    <VoxoProvider
      apiUrl="https://votre-backend/api"
      tenantId="00000000-0000-4000-8000-000000000000"
      // Facultatif : évite le formulaire de pré-chat.
      user={{ name: 'Awa Diop', email: 'awa@example.com' }}
    >
      <VotreApplication />
      <VoxoLauncher />
    </VoxoProvider>
  )
}
```

`VoxoChatView` s'utilise aussi directement, par exemple dans un onglet :

```tsx
<VoxoChatView />
```

Le provider branche le cycle de vie de l'application : au retour au premier plan, il
reconnecte le WebSocket et resynchronise le fil — sans quoi une réponse de conseiller
arrivée pendant la veille n'apparaîtrait jamais.

### Identifiant d'application (`appId`)

Le propriétaire du chatbot peut déclarer les identifiants de ses applications
(*package name* Android, *bundle identifier* iOS) et bloquer les autres. Passez le
vôtre : il part en en-tête `X-App-Id` sur chaque requête et en paramètre `appId` du
WebSocket, seulement s'il est renseigné.

```tsx
import DeviceInfo from 'react-native-device-info' // dépendance de VOTRE app, pas du SDK

<VoxoProvider apiUrl={…} tenantId={…} appId={DeviceInfo.getBundleId()}>
```

React Native ne le détecte pas seul et le SDK n'ajoute aucune dépendance pour cela.
Ce n'est pas une authentification : l'en-tête est déclaratif. Sur Android, le
`WebSocket` de React Native envoie lui-même un en-tête `Origin` ; or le contrôle côté
serveur ne s'applique qu'aux requêtes **sans** `Origin` — il ne vaut donc, pour le
socket Android, qu'en REST.

### Garder la conversation entre deux écrans

Passez votre propre client : le provider n'y touche pas, et la conversation survit à
une navigation.

```tsx
const client = useMemo(() => new VoxoClient({ apiUrl, tenantId }), [])
return <VoxoProvider client={client}>…</VoxoProvider>
```

## Langue (FR/EN)

L'interface fournie par le SDK — en-tête, composeur, pièces jointes, panneau
d'évaluation, dates, messages d'erreur et de reprise d'inactivité — est disponible en
français et en anglais. Toute valeur en dehors de `'fr' | 'en'` retombe sur `'fr'`.

```tsx
<VoxoProvider
  apiUrl={apiUrl}
  tenantId={tenantId}
  // Facultatif : à défaut, déduite de la locale de l'appareil.
  locale="en"
  options={{
    // Affiche le bouton de bascule FR/EN dans l'en-tête (actif par défaut).
    showLanguageSwitcher: true,
  }}
>
```

Changer de langue en cours de session, par exemple depuis votre propre écran de
réglages :

```tsx
client.setLocale('en')
```

Le choix est persisté (clé `locale-${tenantId}`, via l'adaptateur `storage` —
`AsyncStorage` par défaut si `persistSession` est actif) et restauré au prochain
démarrage. Tout ce qui est déjà affiché — historique, panneau d'évaluation, composeur —
se réaffiche immédiatement dans la nouvelle langue, pas seulement ce qui arrive
ensuite. Le SDK envoie aussi la locale active en en-tête `Accept-Language` et dans les
métadonnées de chaque message, pour que la réponse de l'assistant suive la même langue.

Pour une interface maison, `normalizeLocale`, `voxoText` et `VoxoLocale` sont exportés :

```tsx
import { normalizeLocale, voxoText } from 'voxo-chat-react-native'

const locale = normalizeLocale(userPreference) // 'fr' | 'en'
voxoText(locale, 'network')                    // message réseau localisé
```

## Notifications push

Le SDK ne dépend ni de Firebase ni d'APNs : c'est votre application qui obtient le
jeton et le lui confie. Le jeton est mémorisé par tenant et relié à chaque nouvelle
session ; si le propriétaire n'a pas activé les notifications, le SDK s'arrête sans
rien afficher.

```tsx
import messaging from '@react-native-firebase/messaging'

const client = useVoxoClient()
useEffect(() => {
  void (async () => {
    await messaging().requestPermission()
    const token = Platform.OS === 'ios'
      ? await messaging().getAPNSToken()   // jeton APNs natif
      : await messaging().getToken()       // jeton FCM
    if (token) await client.registerPushToken(token, Platform.OS === 'ios' ? 'apns' : 'fcm')
  })()
  // Le jeton peut être renouvelé : confiez le nouveau.
  return messaging().onTokenRefresh((token) => {
    void client.registerPushToken(token, Platform.OS === 'ios' ? 'apns' : 'fcm')
  })
}, [client])

// À la déconnexion de l'utilisateur :
await client.unregisterPushToken()
```

Au toucher d'une notification (`data.type === 'voxo.agent_message'`), ouvrez
`VoxoChatView` : le SDK recharge l'historique.

## Aperçu de saisie

Quand le propriétaire active l'aperçu de saisie (`options.features.liveTypingPreview`,
désactivé par défaut) **et** qu'un conseiller a pris la main, le texte en cours de
frappe est transmis au conseiller (500 caractères, une trame toutes les 200 ms au
plus). L'écran fourni le fait seul ; avec votre propre interface, appelez
`client.notifyTyping(text)` à chaque modification du champ.

Pour ne jamais rien transmettre avant l'envoi du message, désactivez-le côté app :

```tsx
<VoxoProvider apiUrl={…} tenantId={…} options={{ enableLiveTyping: false }}>
```

## Historique des conversations

`VoxoChatView` affiche un bouton historique dans l'en-tête : la liste des
conversations archivées (30 jours, 30 conversations), puis la transcription en
lecture seule de celle que l'on touche. La session active n'est pas modifiée. Avec
votre propre interface :

```tsx
const entries = await client.history()                          // { sessionId, title, endedAt }[]
const { messages, handoff } = await client.archivedConversation(entries[0].sessionId)
// Conversation purgée côté serveur : VoxoError, code 'HISTORY_UNAVAILABLE', statusCode 404.
```

## Votre propre interface

Le core est du TypeScript pur : il ne connaît ni React, ni aucun module natif. Tout
l'état passe par le client, sans rien devoir à l'UI fournie.

```tsx
const { client, snapshot } = useVoxo()

snapshot.messages       // fil trié
snapshot.connectivity   // 'connecting' | 'available' | 'unavailable'
snapshot.handoff        // statut de reprise humaine
snapshot.isSending      // un envoi est en cours

await client.sendMessage('Bonjour')
await client.retry(messageId)                  // renvoi d'un message en échec
await client.submitFeedback(message, 'up')
await client.endConversation(5, 'Parfait')
await client.startNewSession()
await client.pickAttachments()
```

Hors React, `client.subscribe(listener)` et `client.getSnapshot()` suffisent.

## Adaptateurs : Expo, ou vos propres modules

Les capacités natives passent par des interfaces. Le cas courant ne demande rien —
les adaptateurs par défaut chargent les paquets ci-dessus. Une application Expo, ou
une application qui utilise déjà d'autres modules, fournit les siens :

```tsx
<VoxoProvider
  apiUrl={apiUrl}
  tenantId={tenantId}
  adapters={{
    storage: monStockage,
    filePicker: { pick: async (limit) => /* … */ [] },
  }}
/>
```

C'est aussi ce qui permet aux tests du SDK de tourner sans aucun module natif.

## Thème

Par défaut, le thème vient de la configuration du tenant : couleur d'accent, nom,
message d'accueil et fonctionnalités activées sont ceux que le propriétaire du
chatbot a définis dans son dashboard. Sans consigne de sa part, le mode clair/sombre
suit celui de l'application. Pour l'imposer :

```tsx
<VoxoChatView theme={createTheme(snapshot.chatbot, 'dark')} />
```

## Permissions natives

Nécessaires seulement si vous laissez les pièces jointes actives.

**iOS** — `ios/VotreApp/Info.plist` :

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Pour joindre une photo à votre conversation avec le support.</string>
<key>NSCameraUsageDescription</key>
<string>Pour envoyer une photo prise sur le moment au support.</string>
```

**Android** — rien à déclarer : le sélecteur de documents ne demande pas de
permission de stockage.

## Développement local

Un backend VOXO lancé sur votre machine est servi en HTTP simple, ce qui demande deux
ajustements :

- **Émulateur Android** : `localhost` désigne l'émulateur. Utilisez `10.0.2.2` pour
  joindre votre machine — `http://10.0.2.2:5000/api`.
- **HTTP en clair** : Android le bloque depuis Android 9. Ajoutez
  `android:usesCleartextTraffic="true"` dans `android/app/src/debug/AndroidManifest.xml`
  **uniquement** — jamais dans le manifeste principal. Voir [`example/`](example/)
  pour le fichier complet.

Le simulateur iOS partage le réseau du Mac et joint `localhost` directement.

## Ce que le SDK fait pour vous

- Session persistée et restaurée au redémarrage ; archivée au-delà de 30 minutes
  d'inactivité
- Statut de livraison par message, et renvoi d'un message en échec **sans**
  re-téléverser ses pièces jointes ni risquer un doublon côté serveur
- WebSocket avec reconnexion en backoff exponentiel, et reprise au retour au premier
  plan
- Compression des images avant envoi (2 048 px, WebP), validation des formats et des
  tailles avant tout appel réseau
- Rate limiting client aligné sur le serveur, relances puis clôture automatique après
  inactivité
- Rendu Markdown restreint au même sous-ensemble que le widget web, avec filtrage des
  schémas d'URL
- Messages d'erreur en français ou en anglais selon `locale`, relayés tels quels
  depuis le backend quand l'erreur vient de lui

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

## Développement du SDK

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

L'exemple est une application minimale qui demande `apiUrl` et `tenantId` :

```bash
cd example && npm install && npm run android   # ou npm run ios
```

## Licence

Logiciel propriétaire, tous droits réservés — voir [`LICENSE`](LICENSE). Son usage est réservé aux clients VOXO Chat dans le cadre de leur contrat ; la publication sur un registre public est exclue.
