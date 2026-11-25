import type { ReactNode } from 'react'
import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

import type { VoxoConnectivity } from '../../core/conversationState'
import type { VoxoChatbotConfig } from '../../models/chatbotConfig'
import type { VoxoHandoff } from '../../models/handoff'
import { handoffLabel } from '../../models/handoff'
import { useVoxoTheme } from '../ThemeContext'
import { voxoText } from '../../i18n'

export interface ChatHeaderProps {
  config: VoxoChatbotConfig
  connectivity: VoxoConnectivity
  handoff: VoxoHandoff
  /** Une note ne se propose qu'après une vraie réponse de l'assistant. */
  canRate: boolean
  onRate?: () => void
  onNewConversation?: () => void
  /** Ouvre la liste des conversations archivées. */
  onHistory?: () => void
  onClose?: () => void
  locale?: 'fr' | 'en'
  onLocaleChange?: (locale: 'fr' | 'en') => void
}

/**
 * En-tête du chat : avatar, nom du chatbot, état, actions.
 *
 * Le sous-titre dit **une** chose à la fois, et la reprise humaine passe avant
 * la connectivité : savoir qu'un conseiller est en ligne compte plus que l'état
 * du service.
 */
export function ChatHeader({
  config,
  connectivity,
  handoff,
  canRate,
  onRate,
  onNewConversation,
  onHistory,
  onClose,
  locale = 'fr',
  onLocaleChange,
}: ChatHeaderProps): ReactNode {
  const theme = useVoxoTheme()
  const [avatarFailed, setAvatarFailed] = useState(false)
  const label = handoffLabel(handoff, locale)

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
        {config.avatarUrl !== undefined && !avatarFailed ? (
          <Image
            source={{ uri: config.avatarUrl }}
            style={styles.avatarImage}
            onError={() => setAvatarFailed(true)}
          />
        ) : (
          // Initiale du nom : repli si l'avatar ne charge pas.
          <Text style={[styles.initial, { color: theme.onAccent }]}>
            {(config.name[0] ?? 'A').toUpperCase()}
          </Text>
        )}
      </View>

      <View style={styles.titles}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {config.name}
        </Text>
        <View style={styles.subtitleRow}>
          {label === undefined && (
            <View style={[styles.dot, { backgroundColor: statusColor(connectivity, theme) }]} />
          )}
          <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
            {label ?? connectivityLabel(config, connectivity, locale)}
          </Text>
        </View>
      </View>

      {canRate && onRate !== undefined && (
        <HeaderAction glyph="★" label={voxoText(locale, 'rateAction')} onPress={onRate} />
      )}
      {onLocaleChange !== undefined && (
        <HeaderAction
          glyph={locale.toUpperCase()}
          label={voxoText(locale, 'languageAction')}
          onPress={() => onLocaleChange(locale === 'fr' ? 'en' : 'fr')}
        />
      )}
      {onHistory !== undefined && (
        <HeaderAction glyph="⟲" label={voxoText(locale, 'historyTooltip')} onPress={onHistory} />
      )}
      {onNewConversation !== undefined && (
        <HeaderAction glyph="✎" label={voxoText(locale, 'newConversationAction')} onPress={onNewConversation} />
      )}
      {onClose !== undefined && (
        <HeaderAction glyph="✕" label={voxoText(locale, 'closeChatAction')} onPress={onClose} />
      )}
    </View>
  )
}

function HeaderAction({
  glyph,
  label,
  onPress,
}: {
  glyph: string
  label: string
  onPress: () => void
}): ReactNode {
  const theme = useVoxoTheme()
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={[styles.action, { color: theme.textMuted }]}>{glyph}</Text>
    </Pressable>
  )
}

function connectivityLabel(
  config: VoxoChatbotConfig,
  connectivity: VoxoConnectivity,
  locale: 'fr' | 'en',
): string {
  if (!config.features.connectivityStatus) return voxoText(locale, 'connectivityAssistantAI')
  if (connectivity === 'available') return voxoText(locale, 'connectivityAvailable')
  if (connectivity === 'unavailable') return voxoText(locale, 'connectivityUnavailable')
  return voxoText(locale, 'connectivityConnecting')
}

function statusColor(
  connectivity: VoxoConnectivity,
  theme: { success: string; danger: string; warning: string },
): string {
  if (connectivity === 'available') return theme.success
  if (connectivity === 'unavailable') return theme.danger
  return theme.warning
}

const styles = StyleSheet.create({
  action: { fontSize: 17, paddingHorizontal: 8 },
  avatar: { alignItems: 'center', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  avatarImage: { borderRadius: 18, height: 36, width: 36 },
  container: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dot: { borderRadius: 4, height: 7, width: 7 },
  initial: { fontSize: 15, fontWeight: '600' },
  name: { fontSize: 15, fontWeight: '600' },
  subtitle: { flexShrink: 1, fontSize: 12 },
  subtitleRow: { alignItems: 'center', columnGap: 5, flexDirection: 'row' },
  titles: { flex: 1, marginLeft: 10 },
})
