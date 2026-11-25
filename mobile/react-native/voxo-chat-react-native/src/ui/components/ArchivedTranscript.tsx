import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import type { VoxoClient } from '../../core/client'
import type { VoxoArchivedView } from '../../core/conversationSync'
import { asVoxoError } from '../../core/errors'
import type { VoxoArchivedConversation } from '../../core/sessionStore'
import { voxoText } from '../../i18n'
import { useVoxoTheme } from '../ThemeContext'
import { MessageList } from './MessageList'

export interface ArchivedTranscriptProps {
  client: VoxoClient
  entry: VoxoArchivedConversation
  onBack: () => void
}

type Loaded = { view: VoxoArchivedView } | { error: string } | null

/**
 * Transcription en lecture seule d'une conversation archivée : mêmes bulles que
 * le chat, mais ni zone de saisie, ni avis, ni renvoi. Une erreur affiche le
 * message du SDK tel quel.
 */
export function ArchivedTranscript({ client, entry, onBack }: ArchivedTranscriptProps): ReactNode {
  const theme = useVoxoTheme()
  const locale = client.config.locale
  const [loaded, setLoaded] = useState<Loaded>(null)

  useEffect(() => {
    let cancelled = false
    client
      .archivedConversation(entry.sessionId)
      .then((view) => {
        if (!cancelled) setLoaded({ view })
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoaded({ error: asVoxoError(error).message })
      })
    return () => {
      cancelled = true
    }
  }, [client, entry.sessionId])

  const chatbot = client.getSnapshot().chatbot

  return (
    <View style={[styles.root, { backgroundColor: theme.surface }]}>
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel={voxoText(locale, 'backLabel')}>
          <Text style={[styles.back, { color: theme.accent }]}>{'‹ ' + voxoText(locale, 'backLabel')}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {entry.title}
        </Text>
      </View>

      {loaded === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : 'error' in loaded ? (
        <View style={styles.center}>
          <Text style={{ color: theme.textMuted }}>{loaded.error}</Text>
        </View>
      ) : (
        <MessageList
          messages={[...loaded.view.messages].sort((a, b) => a.timestamp - b.timestamp)}
          features={chatbot.features}
          markdown={chatbot.enableMarkdown}
          isTyping={false}
          agentName={loaded.view.handoff.agentName}
          locale={locale}
          onLinkPress={(url) => void client.openLink(url)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  back: { fontSize: 15, marginRight: 12 },
  bar: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', padding: 12 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
  root: { flex: 1 },
  title: { flex: 1, fontSize: 15, fontWeight: '600' },
})
