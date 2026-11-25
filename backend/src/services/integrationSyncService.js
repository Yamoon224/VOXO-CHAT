const { Op } = require('sequelize');
const { KnowledgeBase, IntegrationSyncJob } = require('../models');
const quotaService = require('./quotaService');
const ragService = require('./ragService');
const { decrypt } = require('./integrationCryptoService');
const { loadItems } = require('./integrationAdapters');

async function upsertItem(tenant, connector, item, seen) {
  if (!item.title || !item.content) return 'skipped';
  seen.push(item.externalId);
  const where = { tenantId: tenant.id, sourceProvider: connector.provider, externalId: item.externalId };
  const existing = await KnowledgeBase.findOne({ where });
  if (!existing) await quotaService.assertCanCreateDocuments(tenant);
  const values = { ...where, title: item.title.slice(0, 500), content: item.content.slice(0, 10000), sourceType: 'api', sourceUrl: item.sourceUrl || null, sourceUpdatedAt: item.updatedAt || new Date(), metadata: { connectorId: connector.id }, itemType: item.itemType || 'knowledge', sku: item.sku || null, priceAmount: item.priceAmount || null, isActive: true };
  const record = existing ? await existing.update(values) : await KnowledgeBase.create({ ...values, createdBy: null });
  await ragService.rebuildKnowledgeItem(record);
  return existing ? 'updated' : 'created';
}

async function sync(tenant, connector) {
  const job = await IntegrationSyncJob.create({ tenantId: tenant.id, connectorId: connector.id });
  await connector.update({ status: 'syncing', lastError: null });
  try {
    const items = await loadItems(connector, decrypt(connector.credentials));
    const seen = []; const summary = { created: 0, updated: 0, skipped: 0, disabled: 0 };
    for (const item of items) summary[await upsertItem(tenant, connector, item, seen)] += 1;
    const disabled = await KnowledgeBase.update({ isActive: false }, { where: { tenantId: tenant.id, sourceProvider: connector.provider, externalId: { [Op.notIn]: seen.length ? seen : ['__none__'] }, metadata: { connectorId: connector.id } } });
    summary.disabled = disabled[0];
    await job.update({ status: 'completed', summary, completedAt: new Date() });
    await connector.update({ status: 'connected', lastSyncedAt: new Date(), lastError: null });
    return job;
  } catch (error) {
    await job.update({ status: 'failed', error: error.message, completedAt: new Date() });
    await connector.update({ status: 'error', lastError: error.message.slice(0, 500) });
    throw error;
  }
}

module.exports = { sync };
