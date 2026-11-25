// widget/vite.config.js
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const INTERNAL_CLASSES = [
  'vx-brand-avatar-group', 'vx-message-actions', 'vx-suggestions', 'vx-composer-action',
  'vx-message-content', 'vx-date-separator', 'vx-delivery-status', 'vx-rating-comment',
  'vx-messages', 'vx-message-avatar', 'vx-message-footer', 'vx-composer-wrap',
  'vx-launcher-image', 'vx-header-actions', 'vx-avatar-image',
  'vx-header-top', 'vx-header-spacer', 'vx-channel-pill', 'vx-brand-stage',
  'vx-composer-toolbar', 'vx-composer-options',
  'vx-welcome-label', 'vx-typing-dots', 'vx-prechat-view', 'vx-secondary-button',
  'vx-primary-button', 'vx-rating-buttons', 'vx-rating-stars', 'vx-rating-star',
  'vx-rating-card', 'vx-rating-copy', 'vx-rating-label', 'vx-rating-view',
  'vx-message-action', 'vx-inline-retry', 'vx-message-files', 'vx-file-pending',
  'vx-file-preview', 'vx-file-remove', 'vx-file-thumb', 'vx-history-item',
  'vx-brand-avatar', 'vx-brand-copy', 'vx-brand-mark', 'vx-chat-view',
  'vx-icon-button', 'vx-message', 'vx-bubble', 'vx-timestamp', 'vx-typing-dot',
  'vx-typing', 'vx-chip', 'vx-composer', 'vx-input', 'vx-send', 'vx-menu-item',
  'vx-menu', 'vx-attachments', 'vx-file-chip', 'vx-file-name', 'vx-prechat-card',
  'vx-form-error', 'vx-field', 'vx-toast', 'vx-launcher', 'vx-powered',
  'vx-subtitle', 'vx-tagline', 'vx-status', 'vx-title', 'vx-header', 'vx-panel',
  'vx-shell', 'vx-icon', 'vx-live', 'vx-md', 'vx-retry', 'vx-dropping',
  'vx-error', 'vx-attach', 'vx-avatar-hidden', 'vx-user', 'vx-bot', 'vx-agent'
]

// Une classe assemblée à l'exécution (`vx-${role}`, 'vx-' + role) échappe au
// renommage : le CSS compacté ne la cible plus et la règle devient morte.
const DYNAMIC_CLASS_PATTERNS = [/vx-\$\{/, /['"`]vx-[a-z-]*['"`]\s*\+/]

function compactWidgetClassNames() {
  const aliases = INTERNAL_CLASSES.map((name, index) => [name, `_${index.toString(36)}`])
  return {
    name: 'compact-widget-shadow-classes',
    transform(code, id) {
      if (!/[\\/]src[\\/].+\.js$/.test(id)) return null
      const dynamic = DYNAMIC_CLASS_PATTERNS.find(pattern => pattern.test(code))
      if (dynamic) {
        this.error(`${id} assemble un nom de classe à l'exécution (${dynamic}). Utilisez un littéral complet ('vx-user', 'vx-bot', …), sinon la classe échappe au compactage et son CSS ne s'applique plus.`)
      }
      let compacted = code
      for (const [name, alias] of aliases) {
        const pattern = new RegExp(`(^|[^a-zA-Z0-9_-])${name}(?=$|[^a-zA-Z0-9_-])`, 'g')
        compacted = compacted.replace(pattern, `$1${alias}`)
      }
      return compacted === code ? null : { code: compacted, map: null }
    }
  }
}

function minifyWidgetCss() {
  return {
    name: 'minify-widget-css-string',
    transform(code, id) {
      if (!id.endsWith('/src/styles.js') && !id.endsWith('\\src\\styles.js')) return null
      const match = code.match(/export const WIDGET_CSS = `([\s\S]*?)`;/)
      if (!match) return null
      const css = match[1]
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,])\s*/g, '$1')
        .replace(/;}/g, '}')
        .replace(/(^|[ :(,])0\.(\d+)/g, '$1.$2')
        .replace(/(^|[ :,(])0(?:px|rem|em|ms)(?=\D|$)/g, (_, prefix) => `${prefix}0`)
        .replace(/#ffffff/gi, '#fff')
        .trim()
      return { code: code.replace(match[0], `export const WIDGET_CSS = ${JSON.stringify(css)};`), map: null }
    }
  }
}

function emitWidgetAssets() {
  return {
    name: 'emit-widget-assets',
    buildStart() {
      this.emitFile({
        type: 'asset',
        fileName: 'widget-assets/chat-icon.svg',
        source: readFileSync(resolve(process.cwd(), 'assets/chat-icon.svg'))
      })
    }
  }
}

export default defineConfig({
  plugins: [emitWidgetAssets(), compactWidgetClassNames(), minifyWidgetCss()],
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'ChatBotWidget',
      fileName: () => 'widget.js',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        globals: {},
        banner: '/*! VOXO generated bundle */'
      }
    },
    minify: 'terser',
    terserOptions: {
      ecma: 2020,
      compress: {
        passes: 5,
        toplevel: true,
        pure_getters: true,
        unsafe: true,
        unsafe_arrows: true,
        booleans_as_integers: true
      },
      mangle: {
        toplevel: true,
        properties: {
          regex: /^(messagesContainer|suggestionsContainer|conversationStartTime|lastActivityTime|quickRepliesLoaded|quickRepliesCache|connectivityState|lastHealthCheck|selectedRating|sessionEnded|serverConversationExists|conversationSyncInProgress|rateLimitWindow|messagesSent|inactivityTimer|typingEl|autoOpenTimer|welcomeTimer|toastTimer|ratingCloseTimer|conversationSocket|socketReconnectTimer|socketReconnectAttempt|socketErrorLogged|previousFocus|messageNodes|inputField|sendButton|chatWindow|brandAvatar|powered|liveRegion|prechatView|menuButton|clearButton|historyButton|minimizeButton|closeButton|endButton|ratingCancel|ratingComment|ratingError|ratingGroup|ratingSubmit|ratingView|subtitleElement|titleElement|needsUserInfo|messageCount|defaultChatIconUrl|handleDocumentPointerDown|updateConnectivityLabel|validateAndMergeConfig|startInactivityMonitoring|connectConversationSocket|scheduleSocketReconnect|logSocketError|applyConversationEvent|syncActiveConversation|handoffStatus|handoffAgent|typingEmitter|notifyTyping|stopTyping|checkBrowserCompatibility|autoResizeTextarea|loadTenantSettings|setupGlobalListeners|restoreUserProfile|handleRootKeyDown|handleSendMessage|showHistory|openHistoryConversation|getConversationHistory|archiveConversation|createDeliveryStatus|createMessageActions|createPreChatForm|createRatingView|createBrandAvatar|renderLauncherIcon|createAvatar|createWidget|renderMessage|createDateSeparator|createTypingIndicator|createSuggestions|updateBrand|renderMessages|updateMessage|updateEndAction|clearSuggestions|showSuggestions|showTyping|removeTyping|showToast|checkConnectivity|setConnectivity|setView|retryMessage|submitMessageFeedback|copyMessage|startRating|cancelRating|selectRating|submitRating|startNewSession|saveSession|restoreSession|saveUserProfile|setUserInfo|checkUserInfo|showPreChatForm|hidePreChatForm|bindEvents|scrollToBottom|updateLastActivity|resetInactivityReminders|checkInactivity|checkRateLimit|executeCallback|generateSessionId|playNotificationSound|addWelcomeMessage|attachButton|attachmentsRow|fileInput|previewUrl|localId|pendingAttachments|bindAttachmentEvents|renderAttachments|renderPendingAttachments|createAttachmentList|uploadAttachment|isUploading|localeSelect|refreshLocalizedUI|refreshPreChatForm|refreshRatingView|isViewingHistoryList|getLocale)$/
        }
      },
      format: { semicolons: false }
    }
  },
  server: {
    port: 8080,
    cors: true
  }
})
