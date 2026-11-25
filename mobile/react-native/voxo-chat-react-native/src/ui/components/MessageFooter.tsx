import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { VoxoFeatures } from '../../models/chatbotConfig'
import type { VoxoFeedback, VoxoMessage } from '../../models/message'
import { canReceiveFeedback, hasFailed, isFromUser } from '../../models/message'
import { formatTime } from '../dateLabels'
import { useVoxoTheme } from '../ThemeContext'
import { voxoText, type VoxoLocale } from '../../i18n'

export interface MessageFooterProps {
  message: VoxoMessage
  features: VoxoFeatures
  locale?: VoxoLocale
  onFeedback?: (value: VoxoFeedback) => void
  onRetry?: () => void
}

/**
 * Ligne discrète sous une bulle : heure, statut de livraison, avis.
 *
 * Chaque élément est conditionné par une fonctionnalité que le propriétaire du
 * chatbot peut couper depuis son dashboard.
 */
export function MessageFooter({
  message,
  features,
  locale = 'fr',
  onFeedback,
  onRetry,
}: MessageFooterProps): ReactNode {
  const theme = useVoxoTheme()

  // Un envoi raté doit rester actionnable : le texte et les pièces jointes sont
  // conservés, un appui relance l'envoi sans les re-téléverser.
  if (hasFailed(message)) {
    return (
      <View style={styles.row}>
        <Text style={[styles.small, { color: theme.danger }]}>{voxoText(locale, 'messageNotSent')}</Text>
        {onRetry !== undefined && (
          <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
            <Text style={[styles.small, styles.retry, { color: theme.accent }]}>
              {voxoText(locale, 'retryAction')}
            </Text>
          </Pressable>
        )}
      </View>
    )
  }

  const showStatus = features.showDeliveryStatus && isFromUser(message)
  const showFeedback =
    features.messageFeedback && canReceiveFeedback(message) && onFeedback !== undefined

  if (!features.showTimestamps && !showStatus && !showFeedback) {
    return <View style={styles.spacer} />
  }

  return (
    <View style={styles.row}>
      {features.showTimestamps && (
        <Text style={[styles.small, { color: theme.textMuted }]}>
          {formatTime(message.timestamp)}
        </Text>
      )}
      {showStatus && (
        <Text style={[styles.small, { color: theme.textMuted }]}>
          {message.deliveryStatus === 'answered' ? '✓✓' : '⋯'}
        </Text>
      )}
      {showFeedback && (
        <>
          <FeedbackButton
            active={message.feedback === 'up'}
            label={voxoText(locale, 'feedbackUseful')}
            glyph="👍"
            onPress={() => onFeedback('up')}
          />
          <FeedbackButton
            active={message.feedback === 'down'}
            label={voxoText(locale, 'feedbackNotUseful')}
            glyph="👎"
            onPress={() => onFeedback('down')}
          />
        </>
      )}
    </View>
  )
}

interface FeedbackButtonProps {
  active: boolean
  label: string
  glyph: string
  onPress: () => void
}

function FeedbackButton({ active, label, glyph, onPress }: FeedbackButtonProps): ReactNode {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={styles.feedback}
    >
      <Text style={[styles.glyph, active ? undefined : styles.inactive]}>{glyph}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  feedback: { paddingHorizontal: 3 },
  glyph: { fontSize: 13 },
  inactive: { opacity: 0.4 },
  retry: { fontWeight: '600', textDecorationLine: 'underline' },
  row: { alignItems: 'center', columnGap: 6, flexDirection: 'row', paddingHorizontal: 4, paddingTop: 3 },
  small: { fontSize: 11 },
  spacer: { height: 6 },
})
