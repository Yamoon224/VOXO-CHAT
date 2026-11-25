import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { VoxoFeatures } from '../../models/chatbotConfig'
import type { VoxoFeedback, VoxoMessage } from '../../models/message'
import { MarkdownBody } from '../markdown/MarkdownBody'
import { useVoxoTheme } from '../ThemeContext'
import { AttachmentList } from './AttachmentList'
import { MessageFooter } from './MessageFooter'
import type { VoxoLocale } from '../../i18n'

export interface MessageBubbleProps {
  message: VoxoMessage
  features: VoxoFeatures
  markdown: boolean
  /** Nom du conseiller, affiché au-dessus de ses messages. */
  agentName?: string
  locale?: VoxoLocale
  onFeedback?: (value: VoxoFeedback) => void
  onRetry?: () => void
  onLinkPress?: (url: string) => void
}

/**
 * Une bulle du fil de conversation.
 *
 * Trois traitements visuels, parce que l'utilisateur doit savoir à qui il
 * parle : lui-même (couleur d'accent, à droite), l'assistant (fond neutre) et un
 * conseiller humain (teinte d'accent diluée, avec son nom).
 */
export function MessageBubble({
  message,
  features,
  markdown,
  agentName,
  locale = 'fr',
  onFeedback,
  onRetry,
  onLinkPress,
}: MessageBubbleProps): ReactNode {
  const theme = useVoxoTheme()
  const isUser = message.role === 'user'
  const isAgent = message.role === 'agent'

  const background = isUser ? theme.userBubble : isAgent ? theme.agentBubble : theme.botBubble
  const foreground = isUser ? theme.onUserBubble : theme.onBotBubble

  // Le coin côté auteur est rogné : c'est ce qui donne l'orientation de la bulle
  // sans avoir besoin d'une pointe.
  const corners = {
    borderTopLeftRadius: theme.radius,
    borderTopRightRadius: theme.radius,
    borderBottomLeftRadius: isUser ? theme.radius : 4,
    borderBottomRightRadius: isUser ? 4 : theme.radius,
  }

  return (
    <View style={[styles.container, isUser ? styles.alignEnd : styles.alignStart]}>
      {isAgent && agentName !== undefined && (
        <Text style={[styles.agentName, { color: theme.textMuted }]}>{agentName}</Text>
      )}

      <View
        style={[
          styles.bubble,
          corners,
          { backgroundColor: background },
          isAgent ? { borderColor: theme.accent, borderWidth: 1 } : null,
        ]}
      >
        <AttachmentList attachments={message.attachments} foreground={foreground} />
        {message.text.length > 0 && (
          <MarkdownBody
            text={message.text}
            color={foreground}
            markdown={markdown}
            onLinkPress={onLinkPress}
          />
        )}
      </View>

      <MessageFooter
        message={message}
        features={features}
        locale={locale}
        onFeedback={onFeedback}
        onRetry={onRetry}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  agentName: { fontSize: 11, fontWeight: '600', marginBottom: 3, marginLeft: 4 },
  alignEnd: { alignItems: 'flex-end', alignSelf: 'flex-end' },
  alignStart: { alignItems: 'flex-start', alignSelf: 'flex-start' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10 },
  container: { marginBottom: 2, maxWidth: '85%' },
})
