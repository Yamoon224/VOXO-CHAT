// backend/src/config/supabase.js
const { Sequelize, QueryTypes } = require('sequelize');
const config = require('./config');

const isProd = config.env === 'production';
const isDev = config.env === 'development';

function buildSequelizeConfig() {
  return {
    dialect: 'postgres',
    logging: isDev ? (msg) => console.debug(`[SQL] ${msg}`) : false,

    dialectOptions: {
      ssl: isProd
        ? { require: true, rejectUnauthorized: false }
        : false,
      // utile avec certaines infra proxy/load-balancer
      keepAlive: true,
    },

    pool: {
      max: isProd ? 20 : 10,
      min: isProd ? 5 : 1,
      acquire: 30_000,
      idle: 10_000,
      evict: 1_000,
    },

    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },

    // Retry SQL (utile pour erreurs réseau transitoires)
    retry: {
      max: isProd ? 3 : 1,
      match: [
        /ETIMEDOUT/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
      ],
    },

    hooks: {
      beforeConnect: async (connectionConfig) => {
        connectionConfig.application_name = `my-app-${config.env}`;
      },
    },
  };
}

function createSequelizeInstance() {
  const sequelizeConfig = buildSequelizeConfig();

  if (config.database.url) {
    return new Sequelize(config.database.url, sequelizeConfig);
  }

  return new Sequelize(
    config.database.name,
    config.database.username,
    config.database.password,
    {
      host: config.database.host,
      port: config.database.port,
      ...sequelizeConfig,
    }
  );
}

const sequelize = createSequelizeInstance();

/**
 * Définit le tenant pour la transaction courante (recommandé avec pool).
 * À utiliser de préférence dans une transaction.
 */
async function setCurrentTenant(tenantId, transaction = null) {
  if (!tenantId) return;

  try {
    const sql = transaction
      ? `SET LOCAL app.current_tenant_id = :tenantId`
      : `SET app.current_tenant_id = :tenantId`;

    await sequelize.query(sql, {
      replacements: { tenantId: String(tenantId) },
      transaction,
    });
  } catch (error) {
    console.warn('⚠️ Impossible de définir le tenant courant:', error.message);
  }
}

function prettyDbError(error) {
  const message = error?.message || 'Erreur inconnue';

  if (message.includes('password authentication failed')) {
    return "Authentification échouée (vérifie DATABASE_URL / user / password).";
  }
  if (message.includes('connection refused')) {
    return "Connexion refusée (hôte/port inaccessibles).";
  }
  if (message.toLowerCase().includes('ssl')) {
    return "Erreur SSL (Supabase requiert SSL en production).";
  }
  if (message.toLowerCase().includes('timeout')) {
    return 'Timeout de connexion à la base.';
  }

  return message;
}

async function testConnection() {
  try {
    console.log('🔗 Connexion à Supabase...');
    await sequelize.authenticate();
    console.log('✅ Connexion DB OK');

    // Test settings custom (RLS context)
    const rls = await sequelize.query(
      `SELECT current_setting('app.current_tenant_id', true) AS tenant_id`,
      { type: QueryTypes.SELECT }
    );
    console.log('✅ Variable RLS accessible:', rls?.[0]?.tenant_id ?? null);

    if (isDev) {
      const info = await sequelize.query(
        `SELECT version(), current_database(), current_user`,
        { type: QueryTypes.SELECT }
      );
      const row = info[0] || {};
      console.log('📊 DB:', {
        version: row.version?.split(' ')?.[0],
        database: row.current_database,
        user: row.current_user,
      });
    }

    return true;
  } catch (error) {
    console.error('❌ Connexion DB échouée:', prettyDbError(error));

    if (isProd) {
      console.error("🚫 Arrêt de l'application (prod).");
      process.exit(1);
    }

    return false;
  }
}

async function syncDatabase() {
  if (isProd) {
    console.log('ℹ️ Production: sync Sequelize désactivé (utiliser migrations).');
    return;
  }

  try {
    console.log('🔄 Synchronisation schéma (dev uniquement)...');
    await sequelize.sync({ alter: true });
    console.log('✅ Synchronisation terminée');
  } catch (error) {
    console.error('❌ Erreur sync:', error.message);
    throw error;
  }
}

async function testQuery() {
  try {
    const rows = await sequelize.query(`SELECT NOW() AS current_time`, {
      type: QueryTypes.SELECT,
    });
    console.log('⏰ Test requête OK:', rows[0]?.current_time);
    return true;
  } catch (error) {
    console.error('❌ Test requête KO:', error.message);
    return false;
  }
}

async function getDatabaseStats() {
  try {
    return await sequelize.query(
      `
      SELECT 
        schemaname,
        tablename,
        n_tup_ins AS inserts,
        n_tup_upd AS updates,
        n_tup_del AS deletes
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
      `,
      { type: QueryTypes.SELECT }
    );
  } catch (error) {
    console.warn('⚠️ Stats indisponibles:', error.message);
    return [];
  }
}

async function withTenantTransaction(tenantId, callback) {
  return sequelize.transaction(async (t) => {
    await setCurrentTenant(tenantId, t);
    return callback(t);
  });
}

async function closeConnection() {
  try {
    await sequelize.close();
    console.log('🔌 Connexion DB fermée');
  } catch (error) {
    console.error('❌ Erreur fermeture DB:', error.message);
  }
}

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  setCurrentTenant,
  withTenantTransaction,
  testQuery,
  getDatabaseStats,
  closeConnection,
};
