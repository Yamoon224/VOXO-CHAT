import type { ReactNode } from 'react'
import { useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'

import type { VoxoAttachment } from '../../models/attachment'
import { isImageAttachment } from '../../models/attachment'

export interface AttachmentListProps {
  attachments: VoxoAttachment[]
  foreground: string
}

/**
 * Pièces jointes portées par un message reçu ou envoyé.
 *
 * Les images arrivent avec une URL signée qui expire : un échec de chargement
 * retombe sur la ligne de fichier plutôt que sur une image cassée.
 */
export function AttachmentList({ attachments, foreground }: AttachmentListProps): ReactNode {
  if (attachments.length === 0) return null

  return (
    <View style={styles.container}>
      {attachments.map((attachment) => (
        <AttachmentTile key={attachment.id} attachment={attachment} foreground={foreground} />
      ))}
    </View>
  )
}

function AttachmentTile({
  attachment,
  foreground,
}: {
  attachment: VoxoAttachment
  foreground: string
}): ReactNode {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = isImageAttachment(attachment) && attachment.url !== undefined && !imageFailed

  if (showImage) {
    return (
      <Image
        source={{ uri: attachment.url }}
        style={styles.image}
        resizeMode="cover"
        accessibilityLabel={attachment.name}
        onError={() => setImageFailed(true)}
      />
    )
  }

  return (
    <View style={styles.row}>
      <Text style={[styles.glyph, { color: foreground }]}>
        {isImageAttachment(attachment) ? '🖼' : '📄'}
      </Text>
      <Text style={[styles.name, { color: foreground }]} numberOfLines={1}>
        {attachment.name}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 6, rowGap: 4 },
  glyph: { fontSize: 14 },
  image: { borderRadius: 10, height: 160, width: '100%' },
  name: { flexShrink: 1, fontSize: 13 },
  row: { alignItems: 'center', columnGap: 6, flexDirection: 'row' },
})
