// widget/src/utils.js - Fonctions utilitaires complètes pour le widget
import { translate } from './i18n.js';

// Générer un UUID simple mais robuste
// Et dans widget/src/utils.js, assurez-vous que generateUUID retourne un format correct:
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback robuste si crypto.randomUUID n'est pas dispo
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

// Fonction debounce pour limiter les appels
export function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
}

// Fonction throttle pour limiter la fréquence d'exécution
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Échapper le HTML pour éviter les injections XSS
export function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;'
  };
  
  return text.replace(/[&<>"'/]/g, m => map[m]);
}

// Fonction inverse pour unescaper le HTML
export function unescapeHtml(text) {
  if (typeof text !== 'string') return text;
  
  const map = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&#x2F;': '/'
  };
  
  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#039;|&#x2F;/g, m => map[m]);
}

// Formater la date de manière lisible (locale résolue une seule fois par l'appelant, transmise ici)
export function formatDate(date, locale = 'fr') {
  if (!date) return '';

  const now = new Date();
  const inputDate = new Date(date);
  const diff = now - inputDate;

  // Moins d'une minute
  if (diff < 60000) {
    return translate(locale, 'justNow');
  }

  // Moins d'une heure
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return translate(locale, 'minutesAgo', { count: minutes });
  }

  // Moins d'un jour
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return translate(locale, 'hoursAgo', { count: hours });
  }

  // Moins d'une semaine
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return translate(locale, 'daysAgo', { count: days });
  }

  // Plus d'une semaine
  return inputDate.toLocaleDateString(locale === 'en' ? 'en-US' : 'fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Formater la durée en format lisible
export function formatDuration(milliseconds) {
  if (!milliseconds || milliseconds < 0) return '0s';
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}min`;
  } else if (minutes > 0) {
    return `${minutes}min ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Détecter si l'utilisateur est sur mobile
export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Détecter si l'utilisateur est sur tablette
export function isTablet() {
  return /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(navigator.userAgent);
}

// Obtenir le type d'appareil
export function getDeviceType() {
  if (isMobile()) return 'mobile';
  if (isTablet()) return 'tablet';
  return 'desktop';
}

// Stocker des données dans localStorage de manière sécurisée
export function setLocalStorage(key, value, prefix = 'chatbot') {
  try {
    const prefixedKey = `${prefix}-${key}`;
    const serializedValue = JSON.stringify({
      data: value,
      timestamp: Date.now(),
      version: '1.0.0'
    });
    localStorage.setItem(prefixedKey, serializedValue);
    return true;
  } catch (error) {
    console.warn('Impossible de sauvegarder dans localStorage:', error);
    return false;
  }
}

// Récupérer des données du localStorage
export function getLocalStorage(key, defaultValue = null, prefix = 'chatbot') {
  try {
    const prefixedKey = `${prefix}-${key}`;
    const item = localStorage.getItem(prefixedKey);
    
    if (!item) return defaultValue;
    
    const parsed = JSON.parse(item);
    
    // Vérifier l'âge des données (optionnel, max 30 jours)
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 jours
    if (parsed.timestamp && (Date.now() - parsed.timestamp) > maxAge) {
      localStorage.removeItem(prefixedKey);
      return defaultValue;
    }
    
    return parsed.data;
  } catch (error) {
    console.warn('Impossible de lire depuis localStorage:', error);
    return defaultValue;
  }
}

// Supprimer des données du localStorage
export function removeLocalStorage(key, prefix = 'chatbot') {
  try {
    const prefixedKey = `${prefix}-${key}`;
    localStorage.removeItem(prefixedKey);
    return true;
  } catch (error) {
    console.warn('Impossible de supprimer du localStorage:', error);
    return false;
  }
}

// Nettoyer le localStorage des anciennes données
export function cleanupLocalStorage(prefix = 'chatbot') {
  try {
    const keysToRemove = [];
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 jours
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${prefix}-`)) {
        try {
          const item = localStorage.getItem(key);
          const parsed = JSON.parse(item);
          
          if (parsed.timestamp && (Date.now() - parsed.timestamp) > maxAge) {
            keysToRemove.push(key);
          }
        } catch (error) {
          // Supprimer les éléments corrompus
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    return keysToRemove.length;
  } catch (error) {
    console.warn('Erreur lors du nettoyage du localStorage:', error);
    return 0;
  }
}

// Créer un élément DOM avec des attributs et du contenu
export function createElement(tag, attributes = {}, content = '') {
  const element = document.createElement(tag);
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key === 'class' || key === 'className') {
      element.className = value;
    } else if (key.startsWith('data-')) {
      element.setAttribute(key, value);
    } else if (key in element) {
      element[key] = value;
    } else {
      element.setAttribute(key, value);
    }
  });
  
  if (content) {
    if (typeof content === 'string') {
      element.innerHTML = content;
    } else if (content instanceof Node) {
      element.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
          element.appendChild(child);
        }
      });
    }
  }
  
  return element;
}

// Valider une configuration de widget. Messages destinés à l'intégrateur du
// script (console de développement pendant l'installation du widget), jamais
// affichés à l'utilisateur final du chat : ils restent volontairement en
// français, au même titre que les autres logs techniques du fichier.
export function validateConfig(config) {
  const errors = [];
  
  if (!config) {
    errors.push('Configuration manquante');
    return { isValid: false, errors };
  }
  
  if (!config.tenantId) {
    errors.push('tenantId est requis');
  } else if (typeof config.tenantId !== 'string') {
    errors.push('tenantId doit être une chaîne');
  }
  
  if (!config.name || typeof config.name !== 'string') {
    errors.push('name doit être une chaîne non vide');
  } else if (config.name.length > 100) {
    errors.push('name ne peut pas dépasser 100 caractères');
  }
  
  if (!config.welcomeMessage || typeof config.welcomeMessage !== 'string') {
    errors.push('welcomeMessage doit être une chaîne non vide');
  } else if (config.welcomeMessage.length > 500) {
    errors.push('welcomeMessage ne peut pas dépasser 500 caractères');
  }
  
  if (!config.apiUrl || typeof config.apiUrl !== 'string') {
    errors.push('apiUrl doit être une chaîne non vide');
  } else {
    try {
      new URL(config.apiUrl);
    } catch {
      errors.push('apiUrl doit être une URL valide');
    }
  }
  
  if (!config.theme || typeof config.theme !== 'object') {
    errors.push('theme doit être un objet');
  } else {
    if (!config.theme.primaryColor || !isValidColor(config.theme.primaryColor)) {
      errors.push('theme.primaryColor doit être une couleur valide');
    }
    
    const validPositions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
    if (!validPositions.includes(config.theme.position)) {
      errors.push('theme.position doit être une position valide');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Vérifier si une couleur CSS est valide
export function isValidColor(color) {
  if (typeof color !== 'string') return false;
  
  const s = new Option().style;
  s.color = color;
  return s.color !== '';
}

// Convertir une couleur hex en rgba
export function hexToRgba(hex, alpha = 1) {
  if (typeof hex !== 'string' || !hex.startsWith('#')) {
    return null;
  }
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Calculer une couleur plus claire ou plus foncée
export function adjustBrightness(hex, percent) {
  if (typeof hex !== 'string' || !hex.startsWith('#')) {
    return hex;
  }
  
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B)
    .toString(16)
    .slice(1);
}

// Obtenir un contraste approprié pour une couleur
export function getContrastColor(hex) {
  if (typeof hex !== 'string' || !hex.startsWith('#')) {
    return '#000000';
  }
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '#000000';
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  // Calculer la luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Gérer les erreurs de manière gracieuse
export function handleError(error, context = 'Widget', t = key => key) {
  console.error(`[${context}] Erreur:`, error);

  // En développement, afficher plus de détails
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.error('Stack trace:', error.stack);
    console.error('Contexte:', context);
  }

  // Retourner un message d'erreur user-friendly
  if (typeof error === 'string') {
    return error;
  }

  if (error.message) {
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return t('timeout');
    }

    if (error.message.includes('Network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
      return t('network');
    }

    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return t('authError');
    }

    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return t('denied');
    }

    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return t('serviceMissing');
    }

    if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
      return t('serverError');
    }

    return error.message;
  }

  return t('unexpected');
}

// Tracker les événements (pour analytics optionnel)
export function trackEvent(eventName, properties = {}) {
  // Ajouter des informations contextuelles
  const eventData = {
    ...properties,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    device: getDeviceType(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  };

  // Si Google Analytics est disponible
  if (typeof gtag === 'function') {
    gtag('event', eventName, {
      event_category: 'ChatBot Widget',
      ...eventData
    });
  }

  // Si Google Analytics 4 est disponible
  if (typeof dataLayer === 'object' && Array.isArray(dataLayer)) {
    dataLayer.push({
      event: eventName,
      event_category: 'ChatBot Widget',
      ...eventData
    });
  }

  // Si d'autres outils d'analytics sont disponibles
  if (typeof analytics === 'object' && analytics.track) {
    analytics.track(eventName, {
      category: 'ChatBot Widget',
      ...eventData
    });
  }

  // Si Adobe Analytics est disponible
  if (typeof s === 'object' && s.t) {
    s.linkTrackVars = 'events,eVar1,eVar2';
    s.events = eventName;
    s.eVar1 = 'ChatBot Widget';
    s.eVar2 = JSON.stringify(eventData);
    s.tl(true, 'o', eventName);
  }

  // Log en développement
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log(`[Analytics] ${eventName}:`, eventData);
  }

  // Envoyer vers un endpoint personnalisé si configuré
  if (window.ChatBotConfig?.analytics?.endpoint) {
    fetch(window.ChatBotConfig.analytics.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event: eventName,
        properties: eventData
      })
    }).catch(error => {
      console.warn('Erreur envoi analytics:', error);
    });
  }
}

// Détecter les tentatives de spam/abuse
export function isSpamMessage(message) {
  if (typeof message !== 'string' || message.length === 0) {
    return false;
  }
  
  // Vérifications basiques de spam
  const spamPatterns = [
    /(.)\1{15,}/, // Caractères répétés excessivement
    /[A-Z]{25,}/, // Trop de majuscules
    /(https?:\/\/[^\s]+){4,}/, // Trop de liens
    /\b(viagra|casino|lottery|winner|congratulations|urgent|immediate|act now|click here|free money|nigerian prince)\b/i,
    /[0-9]{10,}/, // Trop de chiffres consécutifs
    /[!@#$%^&*]{10,}/, // Trop de caractères spéciaux
    /\b(buy now|limited time|special offer|act fast)\b/i
  ];
  
  return spamPatterns.some(pattern => pattern.test(message));
}

// Nettoyer et valider les messages utilisateur
export function sanitizeMessage(message) {
  if (typeof message !== 'string') {
    return '';
  }
  
  // Supprimer les espaces en début/fin
  message = message.trim();
  
  // Limiter la longueur
  if (message.length > 2000) {
    message = message.substring(0, 2000);
  }
  
  // Supprimer les caractères de contrôle dangereux
  message = message.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Supprimer les balises script (sécurité)
  message = message.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Limiter le nombre de sauts de ligne consécutifs
  message = message.replace(/\n{4,}/g, '\n\n\n');
  
  return message;
}

// Gérer les raccourcis clavier
export function handleKeyboardShortcuts(event, widget) {
  // Échapper pour fermer le chat
  if (event.key === 'Escape' && widget && widget.isOpen) {
    event.preventDefault();
    widget.close();
    return true;
  }
  
  // Ctrl/Cmd + K pour ouvrir/fermer le chat
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault();
    if (widget) {
      if (widget.isOpen) {
        widget.close();
      } else {
        widget.open();
      }
    }
    return true;
  }
  
  // Ctrl/Cmd + M pour envoyer un message test
  if ((event.ctrlKey || event.metaKey) && event.key === 'm') {
    event.preventDefault();
    if (widget && typeof widget.sendMessage === 'function') {
      const testMessageKeys = ['testGreeting', 'testHowAreYou', 'testHelpRequest', 'testThanks', 'testGoodbye'];
      const locale = widget.config?.locale || 'fr';
      const randomKey = testMessageKeys[Math.floor(Math.random() * testMessageKeys.length)];
      const randomMessage = translate(locale, randomKey);
      widget.sendMessage(randomMessage);
      if (!widget.isOpen) {
        widget.open();
      }
    }
    return true;
  }
  
  return false;
}

// Vérifier la compatibilité du navigateur
export function checkBrowserCompatibility() {
  const requiredFeatures = [
    'fetch',
    'Promise',
    'localStorage',
    'addEventListener',
    'querySelector',
    'JSON'
  ];
  
  const unsupportedFeatures = requiredFeatures.filter(feature => {
    return typeof window[feature] === 'undefined';
  });
  
  // Vérifier le support des modules ES6
  const supportsES6 = (function() {
    try {
      new Function('(a = 0) => a');
      return true;
    } catch (e) {
      return false;
    }
  })();
  
  return {
    isCompatible: unsupportedFeatures.length === 0 && supportsES6,
    unsupportedFeatures,
    supportsES6,
    browserInfo: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    }
  };
}

// Obtenir des informations sur la performance
export function getPerformanceInfo() {
  if (!window.performance) {
    return null;
  }
  
  const timing = window.performance.timing;
  const navigation = window.performance.navigation;
  
  return {
    // Temps de chargement de la page
    loadTime: timing.loadEventEnd - timing.navigationStart,
    
    // Temps de réponse du serveur
    responseTime: timing.responseEnd - timing.requestStart,
    
    // Temps de rendu DOM
    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
    
    // Type de navigation
    navigationType: navigation.type,
    
    // Nombre de redirections
    redirectCount: navigation.redirectCount,
    
    // Mémoire utilisée (si disponible)
    memory: window.performance.memory ? {
      used: Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(window.performance.memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(window.performance.memory.jsHeapSizeLimit / 1024 / 1024)
    } : null
  };
}

// Utilitaire pour créer des promesses avec timeout
// Utilitaire générique sans contexte de widget : pas de locale disponible ici,
// le message par défaut reste un texte technique neutre (anglais), à ne pas
// afficher tel quel à l'utilisateur final (l'appelant doit le traduire si besoin).
export function createTimeoutPromise(promise, timeoutMs, timeoutMessage = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    })
  ]);
}

// Utilitaire pour retry automatique
export function retryOperation(operation, maxRetries = 3, delayMs = 1000) {
  return new Promise((resolve, reject) => {
    let retryCount = 0;
    
    function attempt() {
      operation()
        .then(resolve)
        .catch(error => {
          retryCount++;
          if (retryCount >= maxRetries) {
            reject(new Error(`Operation failed after ${maxRetries} attempts: ${error.message}`));
          } else {
            console.warn(`Tentative ${retryCount} échouée, nouvelle tentative dans ${delayMs}ms:`, error.message);
            setTimeout(attempt, delayMs * retryCount); // Délai croissant
          }
        });
    }
    
    attempt();
  });
}

// Utilitaire pour formater les tailles de fichier
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Utilitaire pour générer un hash simple
export function simpleHash(str) {
  if (typeof str !== 'string') return 0;
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir en 32 bits
  }
  return Math.abs(hash);
}

// Utilitaire pour créer un cache simple
export function createSimpleCache(maxSize = 100, ttl = 5 * 60 * 1000) {
  const cache = new Map();
  
  function cleanup() {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > ttl) {
        cache.delete(key);
      }
    }
    
    // Si le cache est encore trop grand, supprimer les plus anciens
    if (cache.size > maxSize) {
      const entries = Array.from(cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = entries.slice(0, cache.size - maxSize);
      toDelete.forEach(([key]) => cache.delete(key));
    }
  }
  
  return {
    get(key) {
      const entry = cache.get(key);
      if (!entry) return null;
      
      if (Date.now() - entry.timestamp > ttl) {
        cache.delete(key);
        return null;
      }
      
      return entry.data;
    },
    
    set(key, data) {
      cleanup();
      cache.set(key, {
        data,
        timestamp: Date.now()
      });
    },
    
    has(key) {
      return this.get(key) !== null;
    },
    
    clear() {
      cache.clear();
    },
    
    size() {
      cleanup();
      return cache.size;
    }
  };
}

// Export par défaut d'un objet utilitaire
export default {
  generateUUID,
  debounce,
  throttle,
  escapeHtml,
  unescapeHtml,
  formatDate,
  formatDuration,
  isMobile,
  isTablet,
  getDeviceType,
  setLocalStorage,
  getLocalStorage,
  removeLocalStorage,
  cleanupLocalStorage,
  createElement,
  validateConfig,
  isValidColor,
  hexToRgba,
  adjustBrightness,
  getContrastColor,
  handleError,
  trackEvent,
  isSpamMessage,
  sanitizeMessage,
  handleKeyboardShortcuts,
  checkBrowserCompatibility,
  getPerformanceInfo,
  createTimeoutPromise,
  retryOperation,
  formatFileSize,
  simpleHash,
  createSimpleCache
};
