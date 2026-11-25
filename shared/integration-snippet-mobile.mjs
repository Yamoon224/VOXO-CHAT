// Extraits d'intégration des SDK mobiles, séparés de integration-snippet.mjs
// pour que chaque fichier garde une responsabilité lisible.
//
// Un variant n'est ajouté ici qu'une fois le SDK correspondant livré : un
// extrait qui pointe vers un package inexistant enverrait le client dans le mur.
// Reste à faire : swift (voir mobile/MOBILE.md).

const REPO_URL = 'https://github.com/guijo225/voxo-chat.git'

/**
 * Échappe une valeur pour un littéral entre apostrophes ou guillemets simples.
 *
 * Le même échappement convient à Dart et à JavaScript : `\` et `'` sont
 * neutralisés, `$` aussi (interpolation Dart et gabarits JS), et un saut de
 * ligne devient une espace — une URL sur deux lignes casserait l'extrait.
 */
function escapeLiteral(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\$/g, '\\$')
    .replace(/\r?\n/g, ' ')
}

function flutterSnippet(apiUrl, tenantId) {
  return `// 1. pubspec.yaml
//
// dependencies:
//   voxo_chat:
//     git:
//       url: ${REPO_URL}
//       path: mobile/flutter/voxo_chat

// 2. Créez un controller. Gardez-le vivant tant que l'utilisateur peut revenir
//    à la conversation, et appelez dispose() quand vous en avez fini.
import 'package:voxo_chat/voxo_chat.dart';

final voxo = VoxoController(
  config: VoxoConfig(
    apiUrl: '${escapeLiteral(apiUrl)}',
    tenantId: '${escapeLiteral(tenantId)}',
    // Facultatif : évite le formulaire de pré-chat.
    // user: VoxoUser(name: 'Awa Diop', email: 'awa@example.com'),
  ),
);

// 3. Posez la bulle flottante, ou ouvrez l'écran complet où vous voulez.
Scaffold(
  floatingActionButton: VoxoLauncher(controller: voxo),
);

// VoxoLauncher.open(context, voxo);   // plein écran
// VoxoChatView(controller: voxo);     // intégré à votre mise en page`
}

function reactNativeSnippet(apiUrl, tenantId) {
  return `// 1. package.json
//
// "dependencies": {
//   "voxo-chat-react-native": "github:guijo225/voxo-chat#main&path:mobile/react-native/voxo-chat-react-native",
//   "react-native-get-random-values": "^1.11.0",
//   "@react-native-async-storage/async-storage": "^2.1.0",
//   "react-native-safe-area-context": "^5.5.2"
// }

// 2. Tout en haut de votre point d'entrée, AVANT tout autre import.
//    Ce polyfill fournit crypto.getRandomValues, dont dépend l'identifiant
//    qui empêche un message d'être traité deux fois.
import 'react-native-get-random-values'

// 3. Enveloppez votre application, et posez la bulle flottante.
import { VoxoProvider, VoxoLauncher } from 'voxo-chat-react-native'

export default function App() {
  return (
    <VoxoProvider
      apiUrl={'${escapeLiteral(apiUrl)}'}
      tenantId={'${escapeLiteral(tenantId)}'}
      // Facultatif : évite le formulaire de pré-chat.
      // user={{ name: 'Awa Diop', email: 'awa@example.com' }}
    >
      <VotreApplication />
      <VoxoLauncher />
    </VoxoProvider>
  )
}

// <VoxoChatView />  pour intégrer l'écran complet à votre mise en page.`
}

/** Échappe une valeur pour un littéral Kotlin entre guillemets : `\`, `"` et `$` (gabarit). */
function escapeKotlinLiteral(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/\r?\n/g, ' ')
}

function kotlinSnippet(apiUrl, tenantId) {
  return `// 1. settings.gradle.kts — le SDK se consomme depuis un clone du dépôt
//
// include(":voxo-chat")
// project(":voxo-chat").projectDir =
//     file("chemin/vers/voxo-chat/mobile/android/voxo-chat-android/voxo-chat")
//
// Puis, dans le build.gradle.kts de votre module :
//   implementation(project(":voxo-chat"))
// (Kotlin 2.x, plugins Compose et serialization, minSdk 26)

// 2. Créez un controller. Gardez-le vivant tant que l'utilisateur peut revenir
//    à la conversation (ViewModel), et appelez dispose() quand vous en avez fini.
//    À utiliser depuis le thread principal.
import chat.voxo.sdk.core.VoxoConfig
import chat.voxo.sdk.core.VoxoController
import chat.voxo.sdk.ui.VoxoChatView
import chat.voxo.sdk.ui.VoxoLauncher

val voxo = VoxoController(
    context = applicationContext,
    config = VoxoConfig(
        apiUrl = "${escapeKotlinLiteral(apiUrl)}",
        tenantId = "${escapeKotlinLiteral(tenantId)}",
        // Facultatif : évite le formulaire de pré-chat.
        // user = VoxoUser(name = "Awa Diop", email = "awa@example.com"),
    ),
)

// 3. Posez la bulle flottante, et affichez l'écran de chat où vous voulez.
@Composable
fun Racine() {
    var chatOuvert by remember { mutableStateOf(false) }
    if (chatOuvert) {
        VoxoChatView(controller = voxo, onClose = { chatOuvert = false })
    } else {
        VoxoLauncher(controller = voxo, onClick = { chatOuvert = true })
    }
}`
}

/** Variants mobiles disponibles, dans l'ordre d'affichage du dashboard. */
export const MOBILE_VARIANTS = ['flutter', 'react-native', 'kotlin']

export function isMobileVariant(variant) {
  return MOBILE_VARIANTS.includes(variant)
}

/**
 * @returns {string|null} null si le variant n'est pas un variant mobile connu
 */
export function buildMobileSnippet({ apiUrl, tenantId, variant }) {
  if (variant === 'flutter') return flutterSnippet(apiUrl, tenantId)
  if (variant === 'react-native') return reactNativeSnippet(apiUrl, tenantId)
  if (variant === 'kotlin') return kotlinSnippet(apiUrl, tenantId)
  return null
}
