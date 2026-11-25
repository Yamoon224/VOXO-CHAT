package chat.voxo.sdk.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import chat.voxo.sdk.core.VoxoI18n
import chat.voxo.sdk.ui.LocalVoxoTheme

@Composable
internal fun DateSeparator(label: String) {
    val theme = LocalVoxoTheme.current
    Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        HorizontalDivider(Modifier.weight(1f), color = theme.border)
        Text(label, color = theme.textMuted, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 10.dp))
        HorizontalDivider(Modifier.weight(1f), color = theme.border)
    }
}

/** Trois points animés, décalés d'un tiers de cycle. */
@Composable
internal fun TypingIndicator(locale: String) {
    val theme = LocalVoxoTheme.current
    val transition = rememberInfiniteTransition(label = "typing")
    val phase = transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1200, easing = LinearEasing), RepeatMode.Restart),
        label = "phase",
    ).value
    val radius = theme.cornerRadiusDp.dp
    Box(
        Modifier
            .padding(bottom = 10.dp)
            .semantics { contentDescription = VoxoI18n.text(locale, "typingLabel") }
            .background(theme.botBubble, RoundedCornerShape(radius, radius, radius, 4.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            repeat(3) { index ->
                val p = (phase + index / 3f) % 1f
                val opacity = 0.35f + 0.65f * (1f - kotlin.math.abs(p * 2f - 1f))
                Box(Modifier.size(7.dp).alpha(opacity).background(theme.textMuted, CircleShape))
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun QuickReplies(suggestions: List<String>, onSelected: (String) -> Unit) {
    if (suggestions.isEmpty()) return
    val theme = LocalVoxoTheme.current
    FlowRow(
        Modifier.padding(top = 2.dp, bottom = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        suggestions.forEach { suggestion ->
            AssistChip(
                onClick = { onSelected(suggestion) },
                label = { Text(suggestion, fontSize = 13.sp) },
                shape = RoundedCornerShape(999.dp),
                colors = AssistChipDefaults.assistChipColors(containerColor = theme.surface, labelColor = theme.accent),
                border = BorderStroke(1.dp, theme.accent.copy(alpha = 0.45f)),
            )
        }
    }
}
