// backend/src/middleware/widgetSecurity.js - Sécurité spécifique au widget
const rateLimit = require('express-rate-limit');
const { AppError } = require('./errorMiddleware');

// Rate limiting par IP pour le widget
const createWidgetRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Utiliser l'IP + User-Agent pour un rate limiting plus précis
      return `${req.ip}-${req.headers['user-agent'] || 'unknown'}`;
    }
  });
};

// Validation et nettoyage des messages
const sanitizeMessage = (req, res, next) => {
  if (req.body.message) {
    let message = req.body.message;
    
    // Nettoyer le message
    if (typeof message !== 'string') {
      return next(new AppError('Le message doit être une chaîne de caractères', 400, { code: 'INVALID_MESSAGE_TYPE' }));
    }
    
    // Limiter la longueur
    if (message.length > 2000) {
      message = message.substring(0, 2000);
    }
    
    // Supprimer les caractères de contrôle
    // La plage est volontairement explicite : tabulation, LF et CR restent autorisés.
    // eslint-disable-next-line no-control-regex
    message = message.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Vérifier les tentatives de spam
    const spamPatterns = [
      /(.)\1{15,}/, // Caractères répétés excessivement
      /[A-Z]{30,}/, // Trop de majuscules
      /(https?:\/\/[^\s]+){5,}/, // Trop de liens
      /\b(viagra|casino|lottery|winner|urgent|act now|click here)\b/i
    ];
    
    if (spamPatterns.some(pattern => pattern.test(message))) {
      return next(new AppError('Message détecté comme spam', 429, { code: 'SPAM_DETECTED' }));
    }
    
    req.body.message = message.trim();
  }
  
  next();
};

// Validation du tenant ID
const validateTenantId = (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'];
  
  if (!tenantId) {
    return next(new AppError('Tenant ID requis dans le header X-Tenant-ID', 400, { code: 'MISSING_TENANT_ID' }));
  }

  // Validation basique du format UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(tenantId)) {
    return next(new AppError('Format de Tenant ID invalide', 400, { code: 'INVALID_TENANT_ID' }));
  }
  
  next();
};

// Headers de sécurité pour le widget
const widgetSecurityHeaders = (req, res, next) => {
  // Headers de sécurité basiques
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Headers pour le cache du widget
  if (req.path.endsWith('.js')) {
    res.header('Cache-Control', 'public, max-age=3600'); // Cache 1 heure
    res.header('ETag', `"widget-${Date.now()}"`);
  }
  
  // Headers CORS spécifiques pour le widget
  const origin = req.headers.origin;
  
  // En développement, permettre tous les origins localhost
  if (process.env.NODE_ENV === 'development') {
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
  } else {
    // En production, être plus permissif pour le widget (configurable)
    const allowedOrigins = process.env.WIDGET_ALLOWED_ORIGINS?.split(',') || ['*'];
    
    if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
      res.header('Access-Control-Allow-Origin', origin || '*');
    }
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Tenant-ID, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  next();
};

// Middleware de protection contre les bots malveillants
const botProtection = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  
  // Détecter les bots suspects
  const suspiciousBots = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /harvester/i
  ];
  
  // Exceptions pour les bots légitimes
  const legitimateBots = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i, // Yahoo
    /duckduckbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i
  ];
  
  const isSuspicious = suspiciousBots.some(pattern => pattern.test(userAgent));
  const isLegitimate = legitimateBots.some(pattern => pattern.test(userAgent));
  
  if (isSuspicious && !isLegitimate) {
    console.warn(`Tentative d'accès par bot suspect: ${userAgent} depuis ${req.ip}`);
    return next(new AppError('Accès non autorisé', 403, { code: 'ACCESS_DENIED' }));
  }
  
  next();
};

// Validation de la session
const validateSession = (req, res, next) => {
  const { sessionId } = req.body;
  
  if (sessionId) {
    // Validation basique du format de session
    const sessionRegex = /^session-[a-f0-9-]+$/;
    if (!sessionRegex.test(sessionId)) {
      return next(new AppError('Format de session invalide', 400, { code: 'INVALID_SESSION_FORMAT' }));
    }

    // Vérifier que la session n'est pas trop ancienne (24h max)
    const sessionTimestamp = sessionId.split('-').pop();
    if (sessionTimestamp && !isNaN(sessionTimestamp)) {
      const sessionAge = Date.now() - parseInt(sessionTimestamp);
      const maxAge = 24 * 60 * 60 * 1000; // 24 heures

      if (sessionAge > maxAge) {
        return next(new AppError('Session expirée', 400, { code: 'TOKEN_EXPIRED' }));
      }
    }
  }
  
  next();
};

// Protection contre les attaques par déni de service
const ddosProtection = createWidgetRateLimit(
  1 * 60 * 1000, // 1 minute
  100, // 100 requêtes max
  'Trop de requêtes. Veuillez patienter avant de continuer.'
);

// Rate limiting spécifique pour les messages
const messageRateLimit = createWidgetRateLimit(
  1 * 60 * 1000, // 1 minute
  10, // 10 messages max par minute
  'Vous envoyez trop de messages. Veuillez patienter.'
);

// Rate limiting par session pour éviter les abus
const sessionRateLimit = (req, res, next) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return next();
  }
  
  // Utiliser une map pour stocker les compteurs par session
  if (!global.sessionCounts) {
    global.sessionCounts = new Map();
  }
  
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes
  const maxRequests = 50; // 50 requêtes par session toutes les 5 minutes
  
  const sessionData = global.sessionCounts.get(sessionId) || {
    count: 0,
    resetTime: now + windowMs
  };
  
  // Reset du compteur si la fenêtre de temps est écoulée
  if (now > sessionData.resetTime) {
    sessionData.count = 0;
    sessionData.resetTime = now + windowMs;
  }
  
  sessionData.count++;
  global.sessionCounts.set(sessionId, sessionData);
  
  if (sessionData.count > maxRequests) {
    return next(new AppError('Trop de requêtes pour cette session', 429, { code: 'RATE_LIMIT_EXCEEDED' }));
  }
  
  next();
};

// Nettoyage périodique des données de session
setInterval(() => {
  if (global.sessionCounts) {
    const now = Date.now();
    for (const [sessionId, data] of global.sessionCounts.entries()) {
      if (now > data.resetTime) {
        global.sessionCounts.delete(sessionId);
      }
    }
  }
}, 10 * 60 * 1000); // Nettoyer toutes les 10 minutes

// Validation des métadonnées
const validateMetadata = (req, res, next) => {
  if (req.body.metadata) {
    const metadata = req.body.metadata;
    
    // Vérifier que les métadonnées ne sont pas trop volumineuses
    const metadataStr = JSON.stringify(metadata);
    if (metadataStr.length > 5000) { // 5KB max
      return next(new AppError('Métadonnées trop volumineuses', 400, { code: 'METADATA_TOO_LARGE' }));
    }
    
    // Nettoyer les métadonnées sensibles
    if (metadata.userAgent) {
      metadata.userAgent = metadata.userAgent.substring(0, 500);
    }
    
    if (metadata.url) {
      // Valider l'URL
      try {
        new URL(metadata.url);
      } catch {
        delete metadata.url;
      }
    }
    
    req.body.metadata = metadata;
  }
  
  next();
};

// Middleware combiné pour les routes du widget
const widgetSecurity = [
  widgetSecurityHeaders,
  ddosProtection,
  botProtection,
  validateTenantId,
  sanitizeMessage,
  validateSession,
  validateMetadata,
  sessionRateLimit
];

// Middleware spécifique pour les messages
const messageWidgetSecurity = [
  widgetSecurityHeaders,
  messageRateLimit,
  botProtection,
  validateTenantId,
  sanitizeMessage,
  validateSession,
  validateMetadata,
  sessionRateLimit
];

// Middleware pour les fichiers statiques du widget
const staticWidgetSecurity = [
  widgetSecurityHeaders,
  (req, res, next) => {
    // Headers de cache plus agressifs pour les fichiers statiques
    res.header('Cache-Control', 'public, max-age=86400'); // 24 heures
    res.header('Expires', new Date(Date.now() + 86400000).toUTCString());
    next();
  }
];

// Logging des tentatives d'abus
const logSecurityEvent = (eventType, req, details = {}) => {
  const logData = {
    event: eventType,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    tenantId: req.headers['x-tenant-id'],
    timestamp: new Date().toISOString(),
    url: req.originalUrl,
    method: req.method,
    ...details
  };
  
  console.warn(`[SECURITY] ${eventType}:`, logData);
  
  // En production, vous pourriez envoyer cela à un service de monitoring
  // comme Sentry, DataDog, etc.
};

module.exports = {
  createWidgetRateLimit,
  sanitizeMessage,
  validateTenantId,
  widgetSecurityHeaders,
  botProtection,
  validateSession,
  ddosProtection,
  messageRateLimit,
  sessionRateLimit,
  validateMetadata,
  widgetSecurity,
  messageWidgetSecurity,
  staticWidgetSecurity,
  logSecurityEvent
};
