import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import type { VoxoClient } from '../../core/client'
import type { VoxoArchivedConversation } from '../../core/sessionStore'
import { voxoText } from '../../i18n'
import { formatDaySeparator } from '../dateLabels'
import { useVoxoTheme } from '../ThemeContext'
import { ArchivedTranscript } from './ArchivedTranscript'

export interface HistoryScreenProps {
  client: VoxoClient
  /** Retour au chat en cours. */
  onBack: () => void
}

/**
 * Liste des conversations archivées ; toucher une ligne ouvre sa transcription
 * en lecture seule. La session active n'est jamais modifiée.
 */
export function HistoryScreen({ client, onBack }: HistoryScreenProps): ReactNode {
  const theme = useVoxoTheme()
  const locale = client.config.locale
  const [entries, setEntries] = useState<VoxoArchivedConversation[] | null>(null)
  const [now] = useState(() => Date.now())
  const [selected, setSelected] = useState<VoxoArchivedConversation | null>(null)

  useEffect(() => {
    let cancelled = false
    void client.history().then((list) => {
      if (!cancelled) setEntries(list)
    })
    return () => {
      cancelled = true
    }
  }, [client])

  if (selected !== null) {
    return (
      <ArchivedTranscript client={client} entry={selected} onBack={() => setSelected(null)} />
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.surface }]}>
      <View style={[styles.bar, { borderBottomColor: theme.border }]}>
        <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel={voxoText(locale, 'backLabel')}>
          <Text style={[styles.back, { color: theme.accent }]}>{'‹ ' + voxoText(locale, 'backLabel')}</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {voxoText(locale, 'historyTitle')}
        </Text>
      </View>

      {entries === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: theme.textMuted }}>{voxoText(locale, 'noHistory')}</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.sessionId}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelected(item)}
              accessibilityRole="button"
              style={[styles.row, { borderBottomColor: theme.border }]}
            >
              <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
                {`${item.title} — ${formatDaySeparator(item.endedAt, now, locale)}`}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  back: { fontSize: 15, marginRight: 12 },
  bar: { alignItems: 'center', borderBottomWidth: 1, flexDirection: 'row', padding: 12 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  root: { flex: 1 },
  row: { borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
  rowTitle: { fontSize: 14 },
  title: { flex: 1, fontSize: 15, fontWeight: '600' },
})
