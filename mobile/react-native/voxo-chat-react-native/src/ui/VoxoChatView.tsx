import type { ReactNode } from 'react'
import { useCallback, useContext, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import type { VoxoClient } from '../core/client'
import { VoxoContext } from '../react/VoxoContext'
import { useVoxoSnapshot } from '../react/useVoxo'
import { ChatHeader } from './components/ChatHeader'
import { ComposerBar } from './components/ComposerBar'
import { HistoryScreen } from './components/HistoryScreen'
import { MessageList } from './components/MessageList'
import type { RatingResult } from './components/RatingSheet'
import { RatingSheet } from './components/RatingSheet'
import { voxoText } from '../i18n'
import type { VoxoTheme } from './theme'
import { useVoxoTheme, VoxoThemeProvider } from './ThemeContext'

export interface VoxoChatViewProps {
  /** Client explicite. À défaut, celui du `VoxoProvider` le plus proche. */
  client?: VoxoClient
  /** Palette imposée par l'intégrateur, sinon celle du tenant. */
  theme?: VoxoTheme
  /** Affiche un bouton de fermeture quand l'écran est présenté en modale. */
  onClose?: () => void
}

/**
 * Écran de chat prêt à l'emploi.
 *
 * Il se contente de refléter l'état du client : toute la logique vit dans le
 * core. Une application qui veut sa propre interface peut ignorer cet écran et
 * s'abonner directement au client.
 *
 * L'appelant reste propriétaire du client — cet écran ne le met jamais au rebut.
 */
export function VoxoChatView({ client, theme, onClose }: VoxoChatViewProps): ReactNode {
  // Lecture directe du contexte plutôt que `useVoxoClient` : passer un client
  // explicite doit rester possible sans `VoxoProvider` au-dessus.
  const contextClient = useContext(VoxoContext)
  const resolved = client ?? contextClient
  if (resolved === null) {
    throw new Error(
      'VoxoChatView a besoin d’un client : placez-le sous un <VoxoProvider>, ' +
        'ou passez la prop `client`.',
    )
  }

  return (
    <VoxoThemeProvider config={useVoxoSnapshot(resolved).chatbot} theme={theme}>
      <ChatScreen client={resolved} onClose={onClose} />
    </VoxoThemeProvider>
  )
}

function ChatScreen({
  client,
  onClose,
}: {
  client: VoxoClient
  onClose?: () => void
}): ReactNode {
  const snapshot = useVoxoSnapshot(client)
  const theme = useVoxoTheme()
  const [isRating, setIsRating] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  // Uniquement les messages de succès, posés depuis un gestionnaire. Les
  // erreurs vivent dans l'instantané : les recopier ici les dupliquerait.
  const [success, setSuccess] = useState<string | undefined>()

  // L'erreur s'efface d'elle-même au bout d'un moment. On la consomme côté
  // client — mettre à jour un système externe est le rôle d'un effet.
  useEffect(() => {
    if (snapshot.lastError === undefined) return
    const timer = setTimeout(() => client.clearError(), NOTICE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [snapshot.lastError, client])

  useEffect(() => {
    if (success === undefined) return
    const timer = setTimeout(() => setSuccess(undefined), NOTICE_DURATION_MS)
    return () => clearTimeout(timer)
  }, [success])

  const notice = snapshot.lastError ?? success

  const submitRating = useCallback(
    async ({ rating, comment }: RatingResult) => {
      setIsRating(false)
      if (await client.endConversation(rating, comment)) {
        setSuccess(voxoText(client.config.locale, 'ratingThanks'))
      }
    },
    [client],
  )

  if (showHistory) {
    return <HistoryScreen client={client} onBack={() => setShowHistory(false)} />
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ChatHeader
        config={snapshot.chatbot}
        connectivity={snapshot.connectivity}
        handoff={snapshot.handoff}
        canRate={snapshot.canRate}
        onRate={() => setIsRating(true)}
        onNewConversation={() => void client.startNewSession()}
        onHistory={() => setShowHistory(true)}
        onClose={onClose}
        locale={client.config.locale}
        onLocaleChange={client.config.options.showLanguageSwitcher ? locale => client.setLocale(locale) : undefined}
      />

      {/* Tant que la configuration distante n'est pas arrivée, afficher un fil
          vide ferait clignoter le thème par défaut puis celui du tenant. */}
      {!snapshot.isReady && snapshot.messages.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <MessageList
          messages={snapshot.messages}
          features={snapshot.chatbot.features}
          markdown={snapshot.chatbot.enableMarkdown}
          isTyping={snapshot.isSending && client.config.options.enableTyping}
          agentName={snapshot.handoff.agentName}
          locale={client.config.locale}
          onSuggestion={(suggestion) => void client.sendMessage(suggestion)}
          onFeedback={(message, value) => void client.submitFeedback(message, value)}
          onRetry={(messageId) => void client.retry(messageId)}
          onLinkPress={(url) => void client.openLink(url)}
        />
      )}

      {notice !== undefined && (
        <View style={[styles.notice, { backgroundColor: theme.surfaceMuted }]}>
          <Text style={[styles.noticeText, { color: theme.text }]}>{notice}</Text>
        </View>
      )}

      <ComposerBar
        attachments={snapshot.attachments}
        isSending={snapshot.isSending}
        isUploading={snapshot.isUploading}
        attachmentsEnabled={snapshot.chatbot.features.attachments}
        maxAttachments={snapshot.chatbot.maxAttachments}
        locale={client.config.locale}
        onSend={(text) => void client.sendMessage(text)}
        onPickFiles={() => void client.pickAttachments()}
        onRemoveAttachment={(localId) => client.removeAttachment(localId)}
        onActivity={() => client.notifyUserActivity()}
        onTextChange={(text) => client.notifyTyping(text)}
      />

      <RatingSheet
        visible={isRating}
        onSubmit={(result) => void submitRating(result)}
        onCancel={() => setIsRating(false)}
        locale={client.config.locale}
      />
    </KeyboardAvoidingView>
  )
}

const NOTICE_DURATION_MS = 4000

const styles = StyleSheet.create({
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  notice: { borderRadius: 10, marginHorizontal: 12, marginBottom: 6, padding: 10 },
  noticeText: { fontSize: 13 },
  root: { flex: 1 },
})
