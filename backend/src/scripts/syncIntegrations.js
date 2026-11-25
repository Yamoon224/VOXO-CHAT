const { Op } = require('sequelize');
const { Tenant, IntegrationConnector } = require('../models');
const integrationSyncService = require('../services/integrationSyncService');

async function run() {
  const connectors = await IntegrationConnector.findAll({ where: { status: 'connected', syncFrequency: { [Op.in]: ['daily', 'weekly'] } } });
  for (const connector of connectors) {
    const interval = connector.syncFrequency === 'daily' ? 86400000 : 604800000;
    if (connector.lastSyncedAt && Date.now() - new Date(connector.lastSyncedAt).getTime() < interval) continue;
    const tenant = await Tenant.findByPk(connector.tenantId);
    if (tenant?.isActive) await integrationSyncService.sync(tenant, connector).catch(error => console.error(`Integration ${connector.id}: ${error.code || error.message}`));
  }
}

run().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });
