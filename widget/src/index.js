// widget/src/index.js - Point d'entrée principal du widget
import { ChatBotWidget } from './widget.js';
import { getDefaultApiUrl, getDefaultFrontendUrl, getScriptConfig } from './runtime-config.js';

// Configuration par défaut
const defaultConfig = {
  name: 'Assistant',
  welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?',
  showLanguageSwitcher: true,
  theme: {
    primaryColor: '#3b82f6',
    textColor: '#333333',
    position: 'bottom-right'
  },
  apiUrl: getDefaultApiUrl(),
  frontendUrl: getDefaultFrontendUrl()
};

// Initialisation automatique du widget
export function initChatBotWidget() {
  // Attendre que le DOM soit chargé
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatBotWidget, { once: true });
    return null;
  }

  const existingHost = document.getElementById('voxo-chat');
  if (window.ChatBotWidget && !window.ChatBotWidget.isDestroyed && existingHost) {
    return window.ChatBotWidget;
  }

  // Récupérer la configuration depuis window.ChatBotConfig
  const config = {
    ...defaultConfig,
    ...getScriptConfig(),
    ...(window.ChatBotConfig || {})
  };

  if (!config.apiUrl) {
    console.error('[ChatBot Widget] Impossible de déterminer l\'URL API. Définissez window.ChatBotConfig.apiUrl.');
    return null;
  }

  // Vérifier que tenantId est fourni
  if (!config.tenantId) {
    console.error('[ChatBot Widget] tenantId est requis dans window.ChatBotConfig');
    return null;
  }

  // Créer et initialiser le widget
  const widget = new ChatBotWidget(config);
  widget.init();

  // Exposer le widget globalement pour debugging
  if (typeof window !== 'undefined') {
    window.ChatBotWidget = widget;
  }
  return widget;
}

// Lancer l'initialisation
initChatBotWidget();

// Export pour les builds
export { ChatBotWidget };
