import type { ReactNode } from 'react'
import { useContext, useState } from 'react'
import { Image, Modal, Pressable, StyleSheet, Text } from 'react-native'

import type { VoxoClient } from '../core/client'
import { VoxoContext } from '../react/VoxoContext'
import { useVoxoSnapshot } from '../react/useVoxo'
import { createTheme, type VoxoTheme } from './theme'
import { VoxoChatView } from './VoxoChatView'
import { voxoText } from '../i18n'

export interface VoxoLauncherProps {
  /** Client explicite. À défaut, celui du `VoxoProvider` le plus proche. */
  client?: VoxoClient
  theme?: VoxoTheme
  /** Glyphe affiché quand le propriétaire n'a pas défini d'icône de marque. */
  icon?: string
}

/**
 * Bulle flottante qui ouvre le chat, équivalent mobile du lanceur du widget web.
 *
 * Le chat s'ouvre en plein écran par-dessus l'application. Le client n'est pas
 * mis au rebut à la fermeture : la conversation continue en arrière-plan, et le
 * socket reste branché pour recevoir la réponse d'un conseiller pendant que
 * l'utilisateur fait autre chose.
 */
export function VoxoLauncher({ client, theme, icon = '💬' }: VoxoLauncherProps): ReactNode {
  const contextClient = useContext(VoxoContext)
  const resolved = client ?? contextClient
  const [isOpen, setIsOpen] = useState(false)

  if (resolved === null) {
    throw new Error(
      'VoxoLauncher a besoin d’un client : placez-le sous un <VoxoProvider>, ' +
        'ou passez la prop `client`.',
    )
  }

  return (
    <>
      <LauncherButton
        client={resolved}
        theme={theme}
        icon={icon}
        onPress={() => setIsOpen(true)}
      />
      <Modal visible={isOpen} animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <VoxoChatView client={resolved} theme={theme} onClose={() => setIsOpen(false)} />
      </Modal>
    </>
  )
}

function LauncherButton({
  client,
  theme,
  icon,
  onPress,
}: {
  client: VoxoClient
  theme?: VoxoTheme
  icon: string
  onPress: () => void
}): ReactNode {
  const snapshot = useVoxoSnapshot(client)
  const [iconFailed, setIconFailed] = useState(false)
  const resolvedTheme = theme ?? createTheme(snapshot.chatbot)
  const brandIcon = snapshot.chatbot.launcherIconUrl

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={voxoText(client.config.locale, 'openChat')}
      style={[styles.button, { backgroundColor: resolvedTheme.accent }]}
    >
      {brandIcon !== undefined && !iconFailed ? (
        // Icône de marque définie par le propriétaire : elle peut ne pas charger
        // (réseau, URL périmée), auquel cas on retombe sur le glyphe.
        <Image
          source={{ uri: brandIcon }}
          style={styles.icon}
          onError={() => setIconFailed(true)}
        />
      ) : (
        <Text style={styles.glyph}>{icon}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 28,
    bottom: 24,
    elevation: 6,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    width: 56,
  },
  glyph: { fontSize: 24 },
  icon: { borderRadius: 14, height: 28, width: 28 },
})
