// src/config/redis.js
const Redis = require('ioredis');
const config = require('./config');

let redisClient = null;

const createRedisClient = () => {
  try {
    const redisConfig = {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryStrategy: (times) => {
        if (config.env === 'development') {
          // En développement, on arrête après 3 tentatives pour éviter le spam
          if (times > 3) {
            console.warn('📌 Reconnexion Redis désactivée en développement après 3 tentatives.');
            return null; // Arrête les tentatives
          }
          return Math.min(times * 1000, 5000); // Délai croissant
        }
        // En production, on continue d'essayer indéfiniment (comportement par défaut)
        return Math.min(times * 50, 2000);
      }
    };

    // Configuration pour production (Upstash, Railway, etc.)
    if (config.env === 'production') {
      if (config.redis.url.startsWith('rediss://')) {
        // Redis avec TLS (Upstash, etc.)
        redisConfig.tls = {};
        redisClient = new Redis(config.redis.url, redisConfig);
      } else {
        // Redis standard avec authentification
        redisClient = new Redis(config.redis.url, {
          ...redisConfig,
          username: config.redis.username,
          password: config.redis.password
        });
      }
    } else {
      // Configuration locale pour développement
      redisClient = new Redis(config.redis.url, redisConfig);
    }

    // Gestionnaires d'événements
    redisClient.on('connect', () => {
      console.log('✅ Connexion à Redis établie');
    });

    redisClient.on('ready', () => {
      // console.log('✅ Redis prêt pour les opérations');
    });

    redisClient.on('error', () => {
      // console.error('❌ Erreur Redis:', error.message);
    });

    redisClient.on('close', () => {
      // console.log('⚠️ Connexion Redis fermée');
    });

    redisClient.on('reconnecting', () => {
      // console.log('🔄 Reconnexion à Redis...');
    });

    return redisClient;
  } catch (error) {
    console.error('❌ Erreur lors de la création du client Redis:', error);
    // throw error; // Commenté pour ne pas bloquer le démarrage
    return null;
  }
};

// Vérifier si Redis est prêt
const isRedisReady = () => {
  return redisClient && redisClient.status === 'ready';
};

// Fonctions utilitaires pour le cache
const cacheService = {
  // Cache avec TTL
  set: async (key, value, ttlSeconds = 3600) => {
    if (!isRedisReady()) return false;
    try {
      const serializedValue = JSON.stringify(value);
      await redisClient.setex(key, ttlSeconds, serializedValue);
      return true;
    } catch (error) {
      console.error('Erreur cache set:', error);
      return false;
    }
  },

  // Récupération du cache
  get: async (key) => {
    if (!isRedisReady()) return null;
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Erreur cache get:', error);
      return null;
    }
  },

  // Suppression
  del: async (key) => {
    if (!isRedisReady()) return false;
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Erreur cache del:', error);
      return false;
    }
  },

  // Cache avec pattern (pour les clés multiples)
  deletePattern: async (pattern) => {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Erreur cache deletePattern:', error);
      return 0;
    }
  },

  // Incrémenter (pour rate limiting)
  incr: async (key, ttl = 3600) => {
    try {
      const result = await redisClient.incr(key);
      if (result === 1) {
        await redisClient.expire(key, ttl);
      }
      return result;
    } catch (error) {
      console.error('Erreur cache incr:', error);
      return 0;
    }
  },

  // Hash pour données complexes
  hset: async (key, field, value, ttl = 3600) => {
    try {
      await redisClient.hset(key, field, JSON.stringify(value));
      await redisClient.expire(key, ttl);
      return true;
    } catch (error) {
      console.error('Erreur cache hset:', error);
      return false;
    }
  },

  hget: async (key, field) => {
    try {
      const value = await redisClient.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Erreur cache hget:', error);
      return null;
    }
  },

  // Test de connexion
  ping: async () => {
    try {
      const result = await redisClient.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Erreur Redis ping:', error);
      return false;
    }
  },

  // Statistiques Redis
  info: async () => {
    try {
      const info = await redisClient.info();
      return info;
    } catch (error) {
      console.error('Erreur Redis info:', error);
      return null;
    }
  }
};

// Test de connexion Redis
const testRedisConnection = async () => {
  try {
    if (!redisClient) {
      createRedisClient();
    }

    await redisClient.connect();
    const pingResult = await cacheService.ping();

    if (pingResult) {
      console.log('✅ Connexion Redis validée');

      // Test d'écriture/lecture
      await cacheService.set('test:connection', { timestamp: Date.now() }, 10);
      const testData = await cacheService.get('test:connection');

      if (testData) {
        console.log('✅ Test lecture/écriture Redis réussi');
        await cacheService.del('test:connection');
      }
    } else {
      throw new Error('Ping Redis échoué');
    }

  } catch (error) {
    console.error('❌ Erreur de connexion à Redis:', error.message);

    if (config.env === 'production') {
      throw error; // Arrêter l'application en production si Redis est indisponible
    } else {
      console.warn('⚠️ Redis indisponible en développement - certaines fonctionnalités seront désactivées');
      // On ne jette pas d'erreur en développement
    }
  }
};

// Fermeture propre
const closeRedisConnection = async () => {
  if (redisClient) {
    await redisClient.quit();
    console.log('📴 Connexion Redis fermée');
  }
};

module.exports = {
  createRedisClient,
  testRedisConnection,
  closeRedisConnection,
  isRedisReady,
  cacheService,
  getRedisClient: () => redisClient
};
