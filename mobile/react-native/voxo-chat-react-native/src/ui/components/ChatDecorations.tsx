import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'

import { useVoxoTheme } from '../ThemeContext'
import { voxoText, type VoxoLocale } from '../../i18n'

/** Séparateur de jour dans le fil : « Aujourd'hui », « Hier », ou la date. */
export function DateSeparator({ label }: { label: string }): ReactNode {
  const theme = useVoxoTheme()
  return (
    <View style={styles.separator}>
      <View style={[styles.line, { backgroundColor: theme.border }]} />
      <Text style={[styles.separatorLabel, { color: theme.textMuted }]}>{label}</Text>
      <View style={[styles.line, { backgroundColor: theme.border }]} />
    </View>
  )
}

const DIM = 0.35

/** Opacité de chaque point aux quatre temps du cycle. */
const DOT_OPACITY: number[][] = [
  [1, DIM, DIM, 1],
  [DIM, 1, DIM, DIM],
  [DIM, DIM, 1, DIM],
]

/** Trois points animés pendant que l'assistant prépare sa réponse. */
export function TypingIndicator({ locale = 'fr' }: { locale?: VoxoLocale }): ReactNode {
  const theme = useVoxoTheme()
  // Initialisation paresseuse : une seule Animated.Value pour toute la vie du
  // composant, sans y accéder pendant le rendu.
  const [progress] = useState(() => new Animated.Value(0))

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    animation.start()
    return () => animation.stop()
  }, [progress])

  return (
    <View
      style={[styles.typing, { backgroundColor: theme.botBubble, borderRadius: theme.radius }]}
      accessibilityLabel={voxoText(locale, 'typingIndicatorLabel')}
    >
      {[0, 1, 2].map((index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            { backgroundColor: theme.textMuted },
            {
              // Chaque point culmine à un tiers de cycle d'écart : c'est ce
              // décalage qui donne une vague plutôt qu'un clignotement.
              opacity: progress.interpolate({
                inputRange: [0, 0.33, 0.66, 1],
                outputRange: DOT_OPACITY[index]!,
              }),
            },
          ]}
        />
      ))}
    </View>
  )
}

export interface QuickRepliesProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
}

/** Réponses rapides proposées sous un message de l'assistant. */
export function QuickReplies({ suggestions, onSelect }: QuickRepliesProps): ReactNode {
  const theme = useVoxoTheme()
  if (suggestions.length === 0) return null

  return (
    <View style={styles.chips}>
      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion}
          onPress={() => onSelect(suggestion)}
          accessibilityRole="button"
          style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.accent }]}
        >
          <Text style={[styles.chipLabel, { color: theme.accent }]}>{suggestion}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  chipLabel: { fontSize: 13 },
  chips: { columnGap: 6, flexDirection: 'row', flexWrap: 'wrap', paddingBottom: 10, rowGap: 6 },
  dot: { borderRadius: 4, height: 7, marginRight: 4, width: 7 },
  line: { flex: 1, height: 1 },
  separator: { alignItems: 'center', columnGap: 10, flexDirection: 'row', paddingVertical: 10 },
  separatorLabel: { fontSize: 11 },
  typing: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
})
