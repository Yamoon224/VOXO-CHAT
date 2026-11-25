import type { VoxoChatbotConfig } from '../models/chatbotConfig'
import { mixColor, normalizeColor, onColor } from './color'

export type VoxoColorScheme = 'light' | 'dark'

/**
 * Palette de l'écran de chat, dérivée de la configuration du tenant.
 *
 * La couleur d'accent et le mode clair/sombre viennent de `GET /widget/config` :
 * c'est le propriétaire du chatbot qui décide, depuis son dashboard.
 * L'intégrateur peut passer outre en fournissant son propre `VoxoTheme`.
 */
export interface VoxoTheme {
  accent: string
  onAccent: string
  surface: string
  surfaceMuted: string
  border: string
  text: string
  textMuted: string
  userBubble: string
  onUserBubble: string
  botBubble: string
  onBotBubble: string
  /** Distingue visuellement un conseiller humain de l'assistant. */
  agentBubble: string
  danger: string
  success: string
  warning: string
  scheme: VoxoColorScheme
  radius: number
}

const DEFAULT_ACCENT = '#3b82f6'

/**
 * Construit la palette pour `config`.
 *
 * `platformScheme` n'est utilisé que si le propriétaire n'a pas forcé un mode :
 * sans consigne, on suit l'application hôte.
 */
export function createTheme(
  config: VoxoChatbotConfig,
  platformScheme: VoxoColorScheme = 'light',
): VoxoTheme {
  const accent = normalizeColor(config.primaryColor, DEFAULT_ACCENT)
  const scheme: VoxoColorScheme =
    config.colorScheme === 'dark' || config.colorScheme === 'light'
      ? config.colorScheme
      : platformScheme

  return scheme === 'dark' ? darkTheme(accent) : lightTheme(accent, config)
}

function lightTheme(accent: string, config: VoxoChatbotConfig): VoxoTheme {
  return {
    accent,
    onAccent: onColor(accent),
    surface: '#ffffff',
    surfaceMuted: '#f3f4f6',
    border: '#e5e7eb',
    text: normalizeColor(config.textColor, '#111827'),
    textMuted: '#6b7280',
    userBubble: accent,
    onUserBubble: onColor(accent),
    botBubble: '#f3f4f6',
    onBotBubble: '#111827',
    // Teinte d'accent très diluée : reconnaissable sans voler la vedette.
    agentBubble: mixColor(accent, '#ffffff', 0.88),
    danger: '#dc2626',
    success: '#16a34a',
    warning: '#f59e0b',
    scheme: 'light',
    radius: 16,
  }
}

function darkTheme(accent: string): VoxoTheme {
  return {
    accent,
    onAccent: onColor(accent),
    surface: '#111827',
    surfaceMuted: '#1f2937',
    border: '#374151',
    text: '#f9fafb',
    textMuted: '#9ca3af',
    userBubble: accent,
    onUserBubble: onColor(accent),
    botBubble: '#1f2937',
    onBotBubble: '#f9fafb',
    agentBubble: mixColor(accent, '#111827', 0.75),
    danger: '#f87171',
    success: '#4ade80',
    warning: '#fbbf24',
    scheme: 'dark',
    radius: 16,
  }
}
