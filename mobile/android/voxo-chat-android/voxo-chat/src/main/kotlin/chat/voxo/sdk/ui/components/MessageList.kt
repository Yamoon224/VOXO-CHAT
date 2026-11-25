package chat.voxo.sdk.ui.components

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import chat.voxo.sdk.models.VoxoFeatures
import chat.voxo.sdk.models.VoxoFeedback
import chat.voxo.sdk.models.VoxoMessage
import chat.voxo.sdk.ui.VoxoDateLabels
import java.time.ZoneId

/** Fil de messages : séparateurs de jour, réponses rapides sous le dernier message, indicateur de frappe. */
@Composable
internal fun MessageList(
    messages: List<VoxoMessage>,
    features: VoxoFeatures,
    markdown: Boolean,
    isTyping: Boolean,
    agentName: String?,
    locale: String,
    onSuggestion: (String) -> Unit,
    onFeedback: (VoxoMessage, VoxoFeedback) -> Unit,
    onRetry: (String) -> Unit,
    onLinkClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val listState = rememberLazyListState()
    val extra = if (isTyping) 1 else 0

    // Suit le bas du fil quand un message arrive ou que l'indicateur apparaît.
    LaunchedEffect(messages.size, isTyping) {
        val last = messages.size + extra - 1
        if (last >= 0) listState.animateScrollToItem(last)
    }

    val zone = ZoneId.systemDefault()
    LazyColumn(modifier, state = listState, contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp)) {
        items(messages, key = { it.id }) { message ->
            val index = messages.indexOf(message)
            val previous = messages.getOrNull(index - 1)
            if (features.dateSeparators && (previous == null || previous.timestamp.atZone(zone).toLocalDate() != message.timestamp.atZone(zone).toLocalDate())) {
                DateSeparator(VoxoDateLabels.daySeparator(message.timestamp, locale = locale))
            }
            MessageBubble(
                message = message,
                features = features,
                markdown = markdown,
                agentName = agentName,
                locale = locale,
                onFeedback = { onFeedback(message, it) },
                onRetry = { onRetry(message.id) },
                onLinkClick = onLinkClick,
            )
            if (index == messages.lastIndex && !message.isFromUser) QuickReplies(message.suggestions, onSuggestion)
        }
        if (isTyping) item(key = "typing") { TypingIndicator(locale) }
    }
}
