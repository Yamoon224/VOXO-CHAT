const { IntegrationConnector, IntegrationSyncJob, KnowledgeBase } = require('../models');
const { AppError } = require('../middleware/errorMiddleware');
const { encrypt } = require('./integrationCryptoService');
const integrationSyncService = require('./integrationSyncService');

const PROVIDERS = ['wordpress', 'microsoft365'];
const FREQUENCIES = ['manual', 'daily', 'weekly'];
const publicConnector = connector => ({ id: connector.id, provider: connector.provider, status: connector.status, config: connector.config, syncFrequency: connector.syncFrequency, lastSyncedAt: connector.lastSyncedAt, lastError: connector.lastError, createdAt: connector.createdAt, updatedAt: connector.updatedAt });

function validate(provider, config, frequency) {
  if (!PROVIDERS.includes(provider)) throw new AppError('Fournisseur d’intégration inconnu', 400, { code: 'INVALID_PROVIDER' });
  if (!FREQUENCIES.includes(frequency)) throw new AppError('Fréquence de synchronisation invalide', 400, { code: 'INVALID_SYNC_FREQUENCY' });
  if (provider === 'wordpress' && !config.siteUrl) throw new AppError('L’URL du site WordPress est requise', 400, { code: 'INVALID_CONNECTOR_CONFIG' });
}

async function list(tenantId) {
  const connectors = await IntegrationConnector.findAll({ where: { tenantId }, order: [['provider', 'ASC']] });
  return connectors.map(publicConnector);
}

async function save(tenant, input) {
  const { provider, config = {}, credentials = {}, syncFrequency = 'daily' } = input;
  validate(provider, config, syncFrequency);
  const current = await IntegrationConnector.findOne({ where: { tenantId: tenant.id, provider } });
  const values = { config, syncFrequency, status: 'connected', lastError: null };
  if (Object.keys(credentials).length) values.credentials = encrypt(credentials);
  const connector = current ? await current.update(values) : await IntegrationConnector.create({ tenantId: tenant.id, provider, ...values });
  return publicConnector(connector);
}

async function get(tenantId, id) {
  const connector = await IntegrationConnector.findOne({ where: { id, tenantId } });
  if (!connector) throw new AppError('Intégration introuvable', 404, { code: 'CONNECTOR_NOT_FOUND' });
  return connector;
}

async function sync(tenant, id) {
  const connector = await get(tenant.id, id);
  if (connector.status === 'syncing') throw new AppError('Une synchronisation est déjà en cours', 409, { code: 'SYNC_ALREADY_RUNNING' });
  return integrationSyncService.sync(tenant, connector);
}

async function disconnect(tenantId, id) {
  const connector = await get(tenantId, id);
  await connector.update({ status: 'disconnected', credentials: null, lastError: null });
  await KnowledgeBase.update({ isActive: false }, { where: { tenantId, metadata: { connectorId: connector.id } } });
  return publicConnector(connector);
}

async function jobs(tenantId, id) {
  await get(tenantId, id);
  return IntegrationSyncJob.findAll({ where: { tenantId, connectorId: id }, order: [['createdAt', 'DESC']], limit: 10 });
}

module.exports = { list, save, get, sync, disconnect, jobs, publicConnector };
