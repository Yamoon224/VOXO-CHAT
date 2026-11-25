// backend/src/config/config.js - Version corrigée
const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '../../.env'),
  quiet: process.env.NODE_ENV === 'test' || process.env.DOTENV_CONFIG_QUIET === 'true',
});
const crypto = require('crypto');

// Génération automatique de clé JWT forte si non fournie
const generateSecretKey = () => {
  return crypto.randomBytes(64).toString('hex');
};

const boundedNumber = (value, fallback, min, max) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

const agentMaxTokensPerTurn = Math.max(1024, parseInt(process.env.AGENT_ACTION_MAX_TOKENS_PER_TURN, 10) || 6000);
const agentReservedFinalTokens = Math.min(
  Math.max(128, parseInt(process.env.AGENT_ACTION_RESERVED_FINAL_TOKENS, 10) || 512),
  Math.floor(agentMaxTokensPerTurn / 2),
);
const agentReservedCorrectionTokens = Math.min(
  Math.max(0, parseInt(process.env.AGENT_ACTION_RESERVED_CORRECTION_TOKENS, 10) || 256),
  agentMaxTokensPerTurn - agentReservedFinalTokens,
);

// Validation des variables d'environnement critiques
const validateEnvVars = () => {
  const required = ['DATABASE_URL', 'REDIS_URL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Variables d'environnement manquantes: ${missing.join(', ')}`);
    process.exit(1);
  }
};

// Validation en production
if (process.env.NODE_ENV === 'production') {
  validateEnvVars();
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  database: {
    url: process.env.DATABASE_URL,
    // Configuration Supabase
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'postgres',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production'
  },
  // Configuration spécifique Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  redis: {
    // Le TLS n'est pas configuré ici : il est activé par le préfixe rediss:// (voir config/redis.js)
    url: process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || 'redis://localhost:6379',
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD
  },
  jwt: {
    secret: process.env.JWT_SECRET || generateSecretKey(),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },
  // Configuration Claude Anthropic (PRINCIPALE)
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
    maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS) || 1000
  },

  // Configuration OpenAI (REMISE POUR COMPATIBILITÉ)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    directApiKey: process.env.OPENAI_DIRECT_KEY || null,
    organization: process.env.OPENAI_ORGANIZATION,
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    visionModel: process.env.OPENAI_VISION_MODEL || 'openai/gpt-4o-mini',
    catalogVisionModel: process.env.OPENAI_CATALOG_VISION_MODEL || 'openai/gpt-4o-mini',
    catalogVisionFallbackModel: process.env.OPENAI_CATALOG_VISION_FALLBACK_MODEL || 'openai/gpt-4o',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    transcriptionProvider: process.env.TRANSCRIPTION_PROVIDER || 'openai',
    transcriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-transcribe',
    openRouterTranscriptionModel: process.env.OPENROUTER_TRANSCRIPTION_MODEL || 'openai/whisper-1'
  },
  rag: {
    minSimilarity: boundedNumber(process.env.RAG_MIN_SIMILARITY, 0.35, 0, 1),
    topK: Math.max(1, parseInt(process.env.RAG_TOP_K, 10) || 5),
  },
  agentAction: {
    // Clé hexadécimale 32 octets (64 caractères) — générer avec `openssl rand -hex 32`.
    encryptionKey: process.env.AGENT_ACTION_ENCRYPTION_KEY,
    maxToolIterations: Math.max(1, parseInt(process.env.AGENT_ACTION_MAX_ITERATIONS, 10) || 2),
    maxTokensPerTurn: agentMaxTokensPerTurn,
    reservedFinalTokens: agentReservedFinalTokens,
    reservedCorrectionTokens: agentReservedCorrectionTokens,
    maxToolCallsPerTurn: Math.max(1, parseInt(process.env.AGENT_ACTION_MAX_TOOL_CALLS_PER_TURN, 10) || 4),
    maxToolResultChars: Math.max(256, parseInt(process.env.AGENT_ACTION_MAX_TOOL_RESULT_CHARS, 10) || 4096),
  },
  conversations: {
    inactivityMinutes: Math.max(1, parseInt(process.env.CONVERSATION_INACTIVITY_MINUTES, 10) || 30),
  },
  // Configuration sécurisée pour la production
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    csrfSecret: process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex')
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 5
    },
    chat: {
      windowMs: 60 * 1000,
      max: 20
    }
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
    credentials: true
  },
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'error' : 'debug'),
    format: process.env.NODE_ENV === 'production' ? 'json' : 'combined'
  },
  app: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com'
  },
  oneSignal: {
    appId: process.env.ONESIGNAL_APP_ID || '',
    restApiKey: process.env.ONESIGNAL_REST_API_KEY || '',
  },
  integrations: {
    encryptionKey: process.env.INTEGRATIONS_ENCRYPTION_KEY || '',
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID || '', clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common', redirectUri: process.env.MICROSOFT_REDIRECT_URI || '',
    },
  },
  email: {
    // 'brevo' (API HTTP, par défaut) ou 'smtp' (Nodemailer, conservé mais débranché)
    provider: process.env.EMAIL_PROVIDER || 'brevo',
    brevo: {
      apiKey: process.env.BREVO_API_KEY,
      senderEmail: process.env.BREVO_SENDER_EMAIL,
      senderName: process.env.BREVO_SENDER_NAME || 'Voxo Chat'
    }
  },
  paystack: {
    enabled: process.env.PAYSTACK_ENABLED === 'true',
    secretKey: process.env.PAYSTACK_SECRET_KEY || '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    callbackUrl: process.env.PAYSTACK_CALLBACK_URL || '',
    baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || 'Voxo Chat <no-reply@voxo.chat>'
  },
  swagger: {
    username: process.env.SWAGGER_USERNAME || '',
    password: process.env.SWAGGER_PASSWORD || ''
  },
  telegram: {
    timeoutMs: parseInt(process.env.TELEGRAM_TIMEOUT_MS, 10) || 10000,
    sendMaxAttempts: parseInt(process.env.TELEGRAM_SEND_MAX_ATTEMPTS, 10) || 3,
    retryBaseDelayMs: parseInt(process.env.TELEGRAM_RETRY_BASE_DELAY_MS, 10) || 500,
    retryMaxDelayMs: parseInt(process.env.TELEGRAM_RETRY_MAX_DELAY_MS, 10) || 5000
  },
  whatsapp: {
    graphApiUrl: process.env.WHATSAPP_GRAPH_API_URL || 'https://graph.facebook.com',
    apiVersion: process.env.WHATSAPP_GRAPH_API_VERSION || 'v22.0',
    timeoutMs: parseInt(process.env.WHATSAPP_TIMEOUT_MS, 10) || 10000
  },
  upload: {
    // Les règles détaillées (extensions, catégories) vivent dans
    // config/fileUploads.js, qui fait autorité. Ce champ n'est conservé que
    // pour les consommateurs historiques.
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024
  },
  storage: {
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'voxo-files',
    signedUrlTtl: parseInt(process.env.STORAGE_SIGNED_URL_TTL, 10) || 300
  },
  media: {
    maxBytes: parseInt(process.env.MEDIA_MAX_BYTES, 10) || 10 * 1024 * 1024,
    maxVoiceSeconds: parseInt(process.env.MEDIA_MAX_VOICE_SECONDS, 10) || 600,
    downloadTimeoutMs: parseInt(process.env.MEDIA_DOWNLOAD_TIMEOUT_MS, 10) || 15000,
    tempTtlMs: parseInt(process.env.MEDIA_TEMP_TTL_MS, 10) || 60 * 60 * 1000,
    maxContextChars: 12000,
    maxContextChunks: 4
  },
  catalog: {
    draftTtlMs: parseInt(process.env.CATALOG_DRAFT_TTL_MS, 10) || 24 * 60 * 60 * 1000,
    extractionMinConfidence: boundedNumber(
      process.env.CATALOG_EXTRACTION_MIN_CONFIDENCE, 0.75, 0, 1
    ),
  },
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    logflareApiKey: process.env.LOGFLARE_API_KEY,
    newrelicLicense: process.env.NEW_RELIC_LICENSE_KEY
  }
};
