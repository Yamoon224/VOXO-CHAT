import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { VoxoLimits } from '../../core/limits'
import { useVoxoTheme } from '../ThemeContext'
import { voxoText, type VoxoLocale } from '../../i18n'

export interface RatingResult {
  rating: number
  comment: string
}

export interface RatingSheetProps {
  visible: boolean
  onSubmit: (result: RatingResult) => void
  /** Fermeture sans validation : la conversation reste ouverte. */
  onCancel: () => void
  locale?: VoxoLocale
}

/**
 * Feuille de fin de conversation : note de 1 à 5 et commentaire facultatif.
 *
 * On ne clôt jamais sans intention explicite — refermer sans valider laisse la
 * conversation en l'état.
 */
export function RatingSheet({ visible, onSubmit, onCancel, locale = 'fr' }: RatingSheetProps): ReactNode {
  const theme = useVoxoTheme()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [showError, setShowError] = useState(false)

  const close = (): void => {
    setRating(0)
    setComment('')
    setShowError(false)
  }

  const submit = (): void => {
    // Le backend refuse une note hors 1-5 : on ne laisse pas partir un zéro.
    if (rating === 0) {
      setShowError(true)
      return
    }
    onSubmit({ rating, comment: comment.trim() })
    close()
  }

  const cancel = (): void => {
    close()
    onCancel()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={cancel}>
      <Pressable style={styles.backdrop} onPress={cancel} accessibilityLabel={voxoText(locale, 'close')} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            {voxoText(locale, 'ratingTitle')}
          </Text>

          <View style={styles.stars} accessibilityLabel={voxoText(locale, 'ratingGroup')}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable
                key={value}
                onPress={() => {
                  setRating(value)
                  setShowError(false)
                }}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={voxoText(locale, 'ratingValue', { count: value })}
              >
                <Text style={[styles.star, { color: value <= rating ? theme.accent : theme.textMuted }]}>
                  {value <= rating ? '★' : '☆'}
                </Text>
              </Pressable>
            ))}
          </View>

          {showError && (
            <Text style={[styles.error, { color: theme.danger }]}>
              {voxoText(locale, 'ratingRequired')}
            </Text>
          )}

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={voxoText(locale, 'ratingComment')}
            placeholderTextColor={theme.textMuted}
            multiline
            maxLength={VoxoLimits.maxFeedbackLength}
            style={[styles.comment, { backgroundColor: theme.surfaceMuted, color: theme.text }]}
          />

          <View style={styles.actions}>
            <Pressable onPress={cancel} style={styles.button} accessibilityRole="button">
              <Text style={{ color: theme.textMuted }}>{voxoText(locale, 'cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              style={[styles.button, styles.primary, { backgroundColor: theme.accent }]}
              accessibilityRole="button"
            >
              <Text style={{ color: theme.onAccent, fontWeight: '600' }}>{voxoText(locale, 'send')}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  actions: { columnGap: 8, flexDirection: 'row', marginTop: 16 },
  backdrop: { backgroundColor: '#00000066', flex: 1 },
  button: { alignItems: 'center', borderRadius: 10, flex: 1, paddingVertical: 12 },
  comment: { borderRadius: 12, fontSize: 14, marginTop: 14, minHeight: 80, padding: 12 },
  error: { fontSize: 12, marginTop: 6 },
  primary: {},
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  star: { fontSize: 32, paddingHorizontal: 4 },
  stars: { flexDirection: 'row', marginTop: 14 },
  title: { fontSize: 17, fontWeight: '600' },
})
