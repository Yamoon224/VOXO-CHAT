import type { ReactNode } from 'react'
import { createContext, useContext, useMemo } from 'react'
import { useColorScheme } from 'react-native'

import type { VoxoChatbotConfig } from '../models/chatbotConfig'
import { DEFAULT_CHATBOT_CONFIG } from '../models/chatbotConfig'
import type { VoxoTheme } from './theme'
import { createTheme } from './theme'

const ThemeContext = createContext<VoxoTheme | null>(null)

export function useVoxoTheme(): VoxoTheme {
  const theme = useContext(ThemeContext)
  if (theme === null) {
    throw new Error('Aucun VoxoThemeProvider au-dessus de ce composant.')
  }
  return theme
}

export interface VoxoThemeProviderProps {
  /** Configuration distante du tenant : c'est elle qui porte la couleur. */
  config?: VoxoChatbotConfig
  /** Palette imposée par l'intégrateur, qui court-circuite la configuration. */
  theme?: VoxoTheme
  children: ReactNode
}

/**
 * Résout la palette et la met à disposition de l'écran.
 *
 * Sans consigne du propriétaire (`options.ui.colorScheme`), on suit le mode
 * clair/sombre de l'application hôte.
 */
export function VoxoThemeProvider({
  config = DEFAULT_CHATBOT_CONFIG,
  theme,
  children,
}: VoxoThemeProviderProps): ReactNode {
  const platformScheme = useColorScheme()

  const resolved = useMemo(
    () => theme ?? createTheme(config, platformScheme === 'dark' ? 'dark' : 'light'),
    [theme, config, platformScheme],
  )

  return <ThemeContext.Provider value={resolved}>{children}</ThemeContext.Provider>
}
