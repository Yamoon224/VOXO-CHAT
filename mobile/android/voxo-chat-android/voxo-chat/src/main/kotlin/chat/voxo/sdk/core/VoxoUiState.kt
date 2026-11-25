package chat.voxo.sdk.core

import chat.voxo.sdk.models.VoxoChatbotConfig
import chat.voxo.sdk.models.VoxoHandoff
import chat.voxo.sdk.models.VoxoMessage
import chat.voxo.sdk.models.VoxoPendingAttachment

/**
 * Instantané immuable de tout ce qu'une interface a besoin d'afficher. Émis par
 * [VoxoController.state] ; l'UI fournie et une UI sur mesure le consomment à
 * l'identique.
 */
data class VoxoUiState(
    val messages: List<VoxoMessage> = emptyList(),
    val chatbot: VoxoChatbotConfig = VoxoChatbotConfig(),
    val connectivity: VoxoConnectivity = VoxoConnectivity.CONNECTING,
    val handoff: VoxoHandoff = VoxoHandoff(),
    val pendingAttachments: List<VoxoPendingAttachment> = emptyList(),
    val sessionId: String = "",
    val locale: String = "fr",
    val isReady: Boolean = false,
    /** Un envoi est en cours : affiche l'indicateur « en train d'écrire ». */
    val isLoading: Boolean = false,
    val isUploading: Boolean = false,
    val sessionEnded: Boolean = false,
    /** La conversation peut être notée (fonction active et au moins une réponse serveur). */
    val canRate: Boolean = false,
    /** Dernier message d'erreur destiné à l'utilisateur ; null une fois acquitté. */
    val lastError: String? = null,
)
