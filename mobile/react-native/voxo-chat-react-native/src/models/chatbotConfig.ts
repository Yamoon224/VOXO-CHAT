import type { JsonObject } from '../core/envelope'
import { booleanAt, numberAt, objectAt, stringAt } from '../core/envelope'
import { VoxoLimits } from '../core/limits'
import { voxoText, type VoxoLocale } from '../i18n'

/**
 * Fonctionnalités activées par le propriétaire du chatbot depuis son dashboard.
 * Le SDK les respecte : masquer un bouton ici, c'est refléter une décision du
 * client, pas une préférence de l'intégrateur.
 */
export interface VoxoFeatures {
  messageFeedback: boolean
  conversationRating: boolean
  showTimestamps: boolean
  showDeliveryStatus: boolean
  dateSeparators: boolean
  connectivityStatus: boolean
  attachments: boolean
  /** Aperçu de la saisie transmis au conseiller (désactivé par défaut). */
  liveTypingPreview: boolean
}

export const DEFAULT_FEATURES: VoxoFeatures = {
  messageFeedback: true,
  conversationRating: true,
  showTimestamps: true,
  showDeliveryStatus: true,
  dateSeparators: true,
  connectivityStatus: true,
  attachments: true,
  liveTypingPreview: false,
}

/**
 * Configuration distante renvoyée par `GET /widget/config`.
 *
 * Toutes les clés de `options.ui` sont **optionnelles** côté backend : elles
 * n'apparaissent dans la réponse que si le propriétaire les a définies. Aucune
 * ne doit être présumée présente.
 */
export interface VoxoChatbotConfig {
  name: string
  welcomeMessage: string
  primaryColor: string
  textColor: string
  avatarUrl?: string
  launcherIconUrl?: string
  /**
   * `light` ou `dark` quand le propriétaire a forcé un mode. `undefined` = on
   * suit le thème de l'application hôte.
   */
  colorScheme?: string
  enableMarkdown: boolean
  /**
   * La mention « Propulsé par VOXO » disparaît quand le tenant a souscrit à la
   * marque personnalisée (`features.customBranding`).
   */
  showPoweredBy: boolean
  features: VoxoFeatures
  /**
   * Limites d'envoi telles que le serveur les annonce. Elles font foi sur les
   * constantes locales de `VoxoLimits`, qui ne sont qu'un repli.
   */
  maxAttachments: number
  maxAttachmentBytes: number
}

/**
 * Configuration de repli, avant que `GET /widget/config` n'ait répondu ou
 * quand il échoue. `locale` retombe sur `'fr'` par défaut : c'est ce que
 * `DEFAULT_CHATBOT_CONFIG` expose pour les appelants qui n'ont pas encore de
 * client (état initial de `clientSnapshot.ts`, valeur par défaut de
 * `ThemeContext.tsx`).
 */
export function defaultChatbotConfig(locale: VoxoLocale = 'fr'): VoxoChatbotConfig {
  return {
    name: voxoText(locale, 'defaultAssistantName'),
    welcomeMessage: voxoText(locale, 'defaultWelcome'),
    primaryColor: '#3b82f6',
    textColor: '#333333',
    enableMarkdown: true,
    showPoweredBy: true,
    features: DEFAULT_FEATURES,
    maxAttachments: VoxoLimits.maxAttachmentsPerMessage,
    maxAttachmentBytes: 10 * 1024 * 1024,
  }
}

export const DEFAULT_CHATBOT_CONFIG: VoxoChatbotConfig = defaultChatbotConfig('fr')

export function chatbotConfigFromApi(json: JsonObject, locale: VoxoLocale = 'fr'): VoxoChatbotConfig {
  const theme = objectAt(json, 'theme')
  const options = objectAt(json, 'options')
  const ui = objectAt(options, 'ui')
  const attachments = objectAt(options, 'attachments')
  const tenantFeatures = objectAt(json, 'features')
  const optionFeatures = objectAt(options, 'features')

  return {
    name: stringAt(json, 'name') ?? voxoText(locale, 'defaultAssistantName'),
    welcomeMessage: stringAt(json, 'welcomeMessage') ?? voxoText(locale, 'defaultWelcome'),
    primaryColor: stringAt(theme, 'primaryColor') ?? '#3b82f6',
    textColor: stringAt(theme, 'textColor') ?? '#333333',
    avatarUrl: stringAt(ui, 'avatarUrl'),
    launcherIconUrl: stringAt(ui, 'launcherIconUrl'),
    colorScheme: stringAt(ui, 'colorScheme'),
    enableMarkdown: booleanAt(options, 'enableMarkdown', true),
    showPoweredBy: !booleanAt(tenantFeatures, 'customBranding', false),
    features: {
      messageFeedback: booleanAt(optionFeatures, 'messageFeedback', true),
      conversationRating: booleanAt(optionFeatures, 'conversationRating', true),
      showTimestamps: booleanAt(optionFeatures, 'showTimestamps', true),
      showDeliveryStatus: booleanAt(optionFeatures, 'showDeliveryStatus', true),
      dateSeparators: booleanAt(optionFeatures, 'dateSeparators', true),
      connectivityStatus: booleanAt(optionFeatures, 'connectivityStatus', true),
      attachments: booleanAt(optionFeatures, 'attachments', true),
      liveTypingPreview: booleanAt(optionFeatures, 'liveTypingPreview', false),
    },
    maxAttachments: numberAt(attachments, 'maxFiles') ?? VoxoLimits.maxAttachmentsPerMessage,
    maxAttachmentBytes: numberAt(attachments, 'maxBytes') ?? 10 * 1024 * 1024,
  }
}
