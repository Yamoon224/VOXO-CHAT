/**
 * SDK d'intégration VOXO Chat pour React Native.
 *
 * Deux couches, séparées à dessein :
 * - le **core** (`VoxoClient` et ce qu'il expose) — TypeScript pur, sans React
 *   ni module natif ; utilisable seul pour construire son propre écran de chat ;
 * - l'**UI** prête à l'emploi, construite par-dessus.
 *
 * Le contrat consommé côté serveur est figé dans `mobile/CONTRACT.md`.
 *
 * ```tsx
 * <VoxoProvider apiUrl="https://…/api" tenantId="…">
 *   <VoxoLauncher />
 * </VoxoProvider>
 * ```
 *
 * Seuls les symboles réexportés ici forment le contrat public : tout ce qui vit
 * sous `src/` sans être listé est interne et peut changer.
 */

// Core
export { VoxoClient } from './core/client'
export type { VoxoClientInput } from './core/client'
export type { VoxoClientSnapshot } from './core/clientSnapshot'
export { createConfig } from './core/config'
export type { VoxoConfig, VoxoConfigInput, VoxoOptions, VoxoUser } from './core/config'
export type { VoxoConnectivity } from './core/conversationState'
export { VoxoError } from './core/errors'
export { VoxoLimits, VoxoTexts } from './core/limits'
export type { VoxoArchivedView } from './core/conversationSync'
export type { VoxoPushPlatform } from './core/pushPlatform'
export type { VoxoArchivedConversation } from './core/sessionStore'
export { isUuidV4, uuidV4 } from './core/uuid'

// Adaptateurs de capacités natives
export { createMemoryStorage } from './adapters/types'
export type {
  VoxoAdapters,
  VoxoFilePicker,
  VoxoImageCompressor,
  VoxoLinking,
  VoxoPickedFile,
  VoxoStorage,
} from './adapters/types'

// Modèles
export type {
  VoxoAttachment,
  VoxoAttachmentCategory,
  VoxoPendingAttachment,
} from './models/attachment'
export type { VoxoChatbotConfig, VoxoFeatures } from './models/chatbotConfig'
export { handoffLabel } from './models/handoff'
export type { VoxoHandoff, VoxoHandoffStatus } from './models/handoff'
export type { VoxoDeliveryStatus, VoxoFeedback, VoxoMessage, VoxoRole } from './models/message'

// Règles de fichiers, miroir de shared/file-rules.mjs
export {
  ALLOWED_EXTENSIONS,
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_FILE_BYTES,
  categoryOf,
  formatSize,
  validateFile,
} from './fileRules'
export type { VoxoFileValidation } from './fileRules'

// Liaison React
export { VoxoProvider } from './react/VoxoProvider'
export type { VoxoProviderProps } from './react/VoxoProvider'
export { useVoxo, useVoxoClient, useVoxoSnapshot } from './react/useVoxo'

// UI
export { createTheme } from './ui/theme'
export type { VoxoColorScheme, VoxoTheme } from './ui/theme'
export { useVoxoTheme, VoxoThemeProvider } from './ui/ThemeContext'
export { VoxoChatView } from './ui/VoxoChatView'
export type { VoxoChatViewProps } from './ui/VoxoChatView'
export { VoxoLauncher } from './ui/VoxoLauncher'
export type { VoxoLauncherProps } from './ui/VoxoLauncher'
export { formatDaySeparator, formatTime } from './ui/dateLabels'
export { catalogsHaveParity, normalizeLocale, voxoText } from './i18n'
export type { VoxoLocale, VoxoCopyKey } from './i18n'
export { safeUrl } from './ui/markdown/safeUrl'
