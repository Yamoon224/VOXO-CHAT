require('dotenv').config();

const { sequelize, Tenant } = require('../models');
const ragService = require('../services/ragService');

function parseArgs(argv) {
  return argv.reduce((acc, arg) => {
    if (arg === '--force') {
      acc.force = true;
      return acc;
    }

    if (arg.startsWith('--tenantId=')) {
      acc.tenantId = arg.split('=')[1];
      return acc;
    }

    if (arg.startsWith('--batchSize=')) {
      acc.batchSize = Number(arg.split('=')[1]) || acc.batchSize;
      return acc;
    }

    if (arg.startsWith('--limit=')) {
      acc.limit = Number(arg.split('=')[1]) || undefined;
      return acc;
    }

    return acc;
  }, {
    force: false,
    tenantId: null,
    batchSize: 10,
    limit: undefined,
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log('RAG embeddings initialization');
  console.log('Embedding provider available:', ragService.isEmbeddingAvailable());
  console.log('Options:', options);

  const tenantWhere = options.tenantId ? { id: options.tenantId } : {};
  const tenants = await Tenant.findAll({ where: tenantWhere, order: [['createdAt', 'ASC']] });

  if (tenants.length === 0) {
    console.log('No tenant found.');
    return;
  }

  const totals = {
    tenants: tenants.length,
    documents: 0,
    chunksCreated: 0,
    chunksEmbedded: 0,
    skipped: 0,
  };

  for (const tenant of tenants) {
    console.log(`Indexing tenant ${tenant.name} (${tenant.id})`);
    const summary = await ragService.indexTenantKnowledge(tenant.id, {
      force: options.force,
      batchSize: options.batchSize,
      limit: options.limit,
    });

    totals.documents += summary.documents;
    totals.chunksCreated += summary.chunksCreated;
    totals.chunksEmbedded += summary.chunksEmbedded;
    totals.skipped += summary.skipped;

    console.log('Tenant summary:', summary);
  }

  console.log('RAG initialization complete:', totals);
}

main()
  .catch((error) => {
    console.error('RAG initialization failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
