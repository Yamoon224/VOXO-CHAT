const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Statuts possibles d'un crawl de site
const CRAWL_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',   // toutes les pages découvertes ont été indexées
  PARTIAL: 'partial',       // indexation partielle (quota, échecs isolés, plafond atteint)
  BLOCKED: 'blocked',       // le site refuse la récupération automatique
  FAILED: 'failed',         // rien n'a pu être récupéré
};

const CrawlJob = sequelize.define('CrawlJob', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id',
  },
  rootUrl: {
    type: DataTypes.STRING(2048),
    allowNull: false,
    field: 'root_url',
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: CRAWL_STATUS.PENDING,
  },
  // Comment les URLs ont été trouvées : 'sitemap' ou 'links'
  strategy: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  // Détail de la découverte, ex. « robots.txt », « chemin conventionnel »
  discoveredVia: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'discovered_via',
  },
  pagesDiscovered: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'pages_discovered',
  },
  pagesIndexed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'pages_indexed',
  },
  pagesFailed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'pages_failed',
  },
  // Cause dominante d'échec (BLOCKED, JS_ONLY, TIMEOUT...)
  failureReason: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'failure_reason',
  },
  // Message prêt à afficher au client
  failureMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'failure_message',
  },
  // Détail par URL en échec : [{ url, reason, error }]
  errors: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  options: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'started_at',
  },
  finishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'finished_at',
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by',
  },
}, {
  tableName: 'crawl_jobs',
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  indexes: [
    { fields: ['tenant_id'], name: 'crawl_jobs_tenant_id_idx' },
    { fields: ['status'], name: 'crawl_jobs_status_idx' },
  ],
});

CrawlJob.CRAWL_STATUS = CRAWL_STATUS;

module.exports = CrawlJob;
module.exports.CRAWL_STATUS = CRAWL_STATUS;
