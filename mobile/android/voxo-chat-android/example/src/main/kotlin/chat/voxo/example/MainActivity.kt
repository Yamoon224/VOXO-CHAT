package chat.voxo.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import chat.voxo.sdk.core.VoxoConfig
import chat.voxo.sdk.core.VoxoController
import chat.voxo.sdk.core.VoxoException
import chat.voxo.sdk.core.VoxoPushPlatform
import chat.voxo.sdk.core.VoxoUser
import chat.voxo.sdk.ui.VoxoChatView
import chat.voxo.sdk.ui.VoxoLauncher

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        // Préremplissage : adb shell am start -n chat.voxo.example/.MainActivity --es tenantId <uuid> [--es apiUrl <url>] [--es pushToken <jeton>]
        setContent { MaterialTheme { DemoScreen(intent.getStringExtra("apiUrl"), intent.getStringExtra("tenantId"), intent.getStringExtra("pushToken")) } }
    }
}

/**
 * Démo : on saisit l'adresse du backend et le tenant, puis on ouvre le chat.
 * Une vraie application câblerait `apiUrl` et `tenantId` en dur ou via sa
 * configuration d'environnement, et ne demanderait rien à l'utilisateur.
 */
@Composable
private fun DemoScreen(initialApiUrl: String?, initialTenantId: String?, pushToken: String?) {
    val context = LocalContext.current
    var apiUrl by rememberSaveable { mutableStateOf(initialApiUrl ?: "http://10.0.2.2:3000/api") }
    var tenantId by rememberSaveable { mutableStateOf(initialTenantId.orEmpty()) }
    var error by remember { mutableStateOf<String?>(null) }
    var controller by remember { mutableStateOf<VoxoController?>(null) }
    var chatOpen by rememberSaveable { mutableStateOf(false) }

    // Un controller par couple (apiUrl, tenantId) : la session est indexée sur le tenant.
    // On capture l'instance : lire `controller` dans onDispose libérerait déjà le suivant.
    DisposableEffect(controller) {
        val current = controller
        onDispose { current?.dispose() }
    }

    // Une vraie app obtient ce jeton auprès de Firebase (FirebaseMessaging.getInstance().token) et le confie au SDK.
    LaunchedEffect(controller) { if (pushToken != null) controller?.registerPushToken(pushToken, VoxoPushPlatform.FCM) }

    if (chatOpen && controller != null) {
        VoxoChatView(controller!!, onClose = { chatOpen = false })
        return
    }

    Box(Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp)) {
        Column(Modifier.align(Alignment.Center), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("VOXO Chat — démo", style = MaterialTheme.typography.headlineSmall)
            OutlinedTextField(apiUrl, { apiUrl = it }, Modifier.fillMaxWidth(), label = { Text("URL de l'API (se termine par /api)") }, singleLine = true)
            OutlinedTextField(tenantId, { tenantId = it }, Modifier.fillMaxWidth(), label = { Text("Tenant ID (UUID)") }, singleLine = true)
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(
                onClick = {
                    try {
                        val config = VoxoConfig(apiUrl, tenantId.trim(), user = VoxoUser(name = "Awa Diop", email = "awa@example.com"))
                        controller = VoxoController(context, config).also { chatOpen = false }
                        error = null
                    } catch (e: VoxoException) {
                        // Message déjà rédigé en français pour l'utilisateur final.
                        error = e.message
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Connecter") }
        }
        controller?.let {
            VoxoLauncher(it, onClick = { chatOpen = true }, modifier = Modifier.align(Alignment.BottomEnd))
        }
    }
}
