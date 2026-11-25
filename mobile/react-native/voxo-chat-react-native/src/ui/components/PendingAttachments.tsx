import type { ReactNode } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

import type { VoxoPendingAttachment } from '../../models/attachment'
import { isUploaded } from '../../models/attachment'
import { formatSize } from '../../fileRules'
import { useVoxoTheme } from '../ThemeContext'
import { voxoText, type VoxoLocale } from '../../i18n'

export interface PendingAttachmentsProps {
  attachments: readonly VoxoPendingAttachment[]
  locale?: VoxoLocale
  onRemove: (localId: string) => void
}

/**
 * Pièces jointes préparées mais pas encore rattachées à un message.
 *
 * L'état d'envoi est visible : tant qu'une pièce monte, le message ne peut pas
 * partir — son identifiant serveur n'existe pas encore.
 */
export function PendingAttachments({
  attachments,
  locale = 'fr',
  onRemove,
}: PendingAttachmentsProps): ReactNode {
  const theme = useVoxoTheme()
  if (attachments.length === 0) return null

  return (
    <View style={styles.container}>
      {attachments.map((item) => (
        <View
          key={item.localId}
          style={[styles.chip, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
        >
          {item.category === 'image' ? (
            <Image source={{ uri: item.uri }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <Text style={styles.glyph}>📄</Text>
          )}

          <View style={styles.labels}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {isUploaded(item) ? formatSize(item.size) : voxoText(locale, 'uploadingLabel')}
            </Text>
          </View>

          <Pressable
            onPress={() => onRemove(item.localId)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={voxoText(locale, 'removeAttachmentAction', { name: item.name })}
          >
            <Text style={[styles.remove, { color: theme.textMuted }]}>✕</Text>
          </Pressable>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    columnGap: 6,
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  container: { columnGap: 6, flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 8, rowGap: 6 },
  glyph: { fontSize: 18 },
  labels: { maxWidth: 130 },
  meta: { fontSize: 10 },
  name: { fontSize: 12 },
  remove: { fontSize: 14, paddingHorizontal: 4 },
  thumbnail: { borderRadius: 6, height: 28, width: 28 },
})
