import type { ReactNode } from 'react'
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import type { VoxoPendingAttachment } from '../../models/attachment'
import { VoxoLimits } from '../../core/limits'
import { useVoxoTheme } from '../ThemeContext'
import { PendingAttachments } from './PendingAttachments'
import { voxoText, type VoxoLocale } from '../../i18n'

export interface ComposerBarProps {
  attachments: readonly VoxoPendingAttachment[]
  isSending: boolean
  isUploading: boolean
  /** Suit `options.features.attachments` de `GET /widget/config`. */
  attachmentsEnabled: boolean
  /** Nombre maximal de pièces, annoncé par le serveur. */
  maxAttachments: number
  locale?: VoxoLocale
  onSend: (text: string) => void
  onPickFiles: () => void
  onRemoveAttachment: (localId: string) => void
  onActivity: () => void
  /** Aperçu de saisie : appelé à chaque modification du champ. */
  onTextChange?: (text: string) => void
}

/** Zone de saisie : pièces jointes en attente, champ de texte, bouton d'envoi. */
export function ComposerBar({
  attachments,
  isSending,
  isUploading,
  attachmentsEnabled,
  maxAttachments,
  locale = 'fr',
  onSend,
  onPickFiles,
  onRemoveAttachment,
  onActivity,
  onTextChange,
}: ComposerBarProps): ReactNode {
  const theme = useVoxoTheme()
  const [text, setText] = useState('')

  const hasReadyAttachment = attachments.some((item) => item.remoteId !== undefined)
  const canSend = !isSending && !isUploading && (text.trim().length > 0 || hasReadyAttachment)
  const isFull = attachments.length >= maxAttachments

  const send = (): void => {
    if (!canSend) return
    onSend(text)
    setText('')
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      <PendingAttachments attachments={attachments} locale={locale} onRemove={onRemoveAttachment} />

      <View style={styles.row}>
        {attachmentsEnabled && (
          <Pressable
            onPress={onPickFiles}
            // La file est pleine : le bouton reste visible mais inerte, pour que
            // l'utilisateur comprenne que la limite est atteinte.
            disabled={isFull || isSending}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              isFull
                ? voxoText(locale, 'attachLimitReachedLabel', { count: maxAttachments })
                : voxoText(locale, 'attachFileAction')
            }
            style={styles.attach}
          >
            <Text style={[styles.attachGlyph, { color: theme.textMuted }, isFull && styles.dim]}>
              📎
            </Text>
          </Pressable>
        )}

        <TextInput
          value={text}
          onChangeText={(next) => {
            setText(next)
            onActivity()
            onTextChange?.(next)
          }}
          onSubmitEditing={send}
          placeholder={voxoText(locale, 'composerPlaceholder')}
          placeholderTextColor={theme.textMuted}
          multiline
          // Le backend refuse au-delà : autant l'empêcher à la frappe.
          maxLength={VoxoLimits.maxMessageLength}
          returnKeyType="send"
          blurOnSubmit={false}
          style={[styles.input, { backgroundColor: theme.surfaceMuted, color: theme.text }]}
        />

        <Pressable
          onPress={send}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={voxoText(locale, 'sendMessageAction')}
          style={[
            styles.send,
            { backgroundColor: canSend ? theme.accent : theme.surfaceMuted },
          ]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={theme.textMuted} />
          ) : (
            <Text style={[styles.sendGlyph, { color: canSend ? theme.onAccent : theme.textMuted }]}>
              ↑
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  attach: { padding: 8 },
  attachGlyph: { fontSize: 20 },
  container: { borderTopWidth: 1, padding: 8 },
  dim: { opacity: 0.4 },
  input: {
    borderRadius: 22,
    flex: 1,
    fontSize: 15,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  row: { alignItems: 'flex-end', columnGap: 4, flexDirection: 'row' },
  send: { alignItems: 'center', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  sendGlyph: { fontSize: 20, fontWeight: '700' },
})
