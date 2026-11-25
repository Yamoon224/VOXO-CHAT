import type { ReactNode } from 'react'
import { useCallback, useRef } from 'react'
import type { ListRenderItemInfo } from 'react-native'
import { FlatList, StyleSheet, View } from 'react-native'

import type { VoxoFeatures } from '../../models/chatbotConfig'
import type { VoxoFeedback, VoxoMessage } from '../../models/message'
import { hasFailed, isFromUser } from '../../models/message'
import { formatDaySeparator, needsDaySeparator } from '../dateLabels'
import { DateSeparator, QuickReplies, TypingIndicator } from './ChatDecorations'
import { MessageBubble } from './MessageBubble'
import type { VoxoLocale } from '../../i18n'

export interface MessageListProps {
  messages: VoxoMessage[]
  features: VoxoFeatures
  markdown: boolean
  isTyping: boolean
  agentName?: string
  locale?: VoxoLocale
  onSuggestion?: (suggestion: string) => void
  onFeedback?: (message: VoxoMessage, value: VoxoFeedback) => void
  onRetry?: (messageId: string) => void
  onLinkPress?: (url: string) => void
}

/**
 * Fil de conversation : séparateurs de jour, bulles, réponses rapides et
 * indicateur de frappe.
 *
 * Les réponses rapides ne s'affichent que sous le **dernier** message de
 * l'assistant : plus haut, elles inviteraient à répondre à une question déjà
 * dépassée.
 */
export function MessageList({
  messages,
  features,
  markdown,
  isTyping,
  agentName,
  locale = 'fr',
  onSuggestion,
  onFeedback,
  onRetry,
  onLinkPress,
}: MessageListProps): ReactNode {
  const listRef = useRef<FlatList<VoxoMessage>>(null)

  const suggestionAnchor = findSuggestionAnchor(messages)

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<VoxoMessage>) => {
      const previous = index === 0 ? undefined : messages[index - 1]?.timestamp
      const showSeparator = features.dateSeparators && needsDaySeparator(item.timestamp, previous)

      return (
        <View>
          {showSeparator && <DateSeparator label={formatDaySeparator(item.timestamp, Date.now(), locale)} />}
          <MessageBubble
            message={item}
            features={features}
            markdown={markdown}
            agentName={agentName}
            locale={locale}
            onFeedback={onFeedback === undefined ? undefined : (value) => onFeedback(item, value)}
            onRetry={
              onRetry === undefined || !hasFailed(item) ? undefined : () => onRetry(item.id)
            }
            onLinkPress={onLinkPress}
          />
          {index === suggestionAnchor && onSuggestion !== undefined && (
            <QuickReplies suggestions={item.suggestions} onSelect={onSuggestion} />
          )}
        </View>
      )
    },
    [messages, features, markdown, agentName, locale, onFeedback, onRetry, onLinkPress, onSuggestion, suggestionAnchor],
  )

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.content}
      ListFooterComponent={isTyping ? <TypingIndicator locale={locale} /> : undefined}
      // Le fil doit rester collé au bas quand un message arrive.
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      keyboardShouldPersistTaps="handled"
    />
  )
}

/** Index du dernier message de l'assistant porteur de suggestions. */
function findSuggestionAnchor(messages: VoxoMessage[]): number {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]!
    if (!isFromUser(message) && message.suggestions.length > 0) return index
  }
  return -1
}

const styles = StyleSheet.create({
  content: { paddingBottom: 4, paddingHorizontal: 12, paddingTop: 12 },
})
