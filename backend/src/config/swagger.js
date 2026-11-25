const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');
const config = require('./config');
const components = require('./swaggerComponents');
const documentedPaths = {
  ...require('./swaggerPaths'),
  ...require('./swaggerAdditionalPaths'),
};

const source = relativePath => path.resolve(__dirname, relativePath).replace(/\\/g, '/');

const tags = [
  { name: 'System', description: 'Santé, découverte et ressources du service' },
  { name: 'Auth', description: 'Authentification et gestion du compte utilisateur' },
  { name: 'Tenants', description: 'Profil entreprise et configuration du chatbot' },
  { name: 'Knowledge', description: 'Base de connaissances et traitement documentaire' },
  { name: 'Chat', description: 'Conversations et fonctions IA' },
  { name: 'Analytics', description: 'Indicateurs et statistiques' },
  { name: 'Widget', description: 'API publique consommée par le widget embarqué' },
  { name: 'Webhooks', description: 'Intégrations Telegram et WhatsApp' },
  { name: 'Integrations', description: 'Connexions aux services externes' },
  { name: 'Development', description: 'Diagnostic local, absent du contrat de production' },
];

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'VOXO API',
      version: '1.0.0',
      description: [
        'API multitenant de VOXO Chat.',
        'Le tenant est résolu avec `X-Tenant-ID`, le sous-domaine, ou en développement avec `tenantId`.',
      ].join('\n\n'),
    },
    servers: [
      {
        url: config.app.backendUrl,
        description: config.env === 'production' ? 'Serveur configuré' : 'Serveur de développement',
      },
    ],
    tags,
    components,
  },
  // Keep route annotations discoverable while using the centralized contract as
  // the source of truth. Absolute paths make generation independent of process.cwd().
  apis: [
    source('../app.js'),
    source('../routes/*.js'),
    source('../controllers/*.js'),
    source('../models/*.js'),
    source('../middleware/*.js'),
  ],
};

const swaggerSpec = swaggerJSDoc(options);

// Existing annotations are intentionally superseded by the exhaustive contract.
swaggerSpec.paths = JSON.parse(JSON.stringify(documentedPaths));

if (config.env === 'production') {
  for (const [routePath, pathItem] of Object.entries(swaggerSpec.paths)) {
    for (const method of Object.keys(pathItem)) {
      if (pathItem[method]['x-development-only']) {
        delete pathItem[method];
      } else if (Array.isArray(pathItem[method].parameters)) {
        pathItem[method].parameters = pathItem[method].parameters.filter(item =>
          item.$ref !== '#/components/parameters/TenantQuery');
      }
    }

    if (Object.keys(pathItem).length === 0) {
      delete swaggerSpec.paths[routePath];
    }
  }

  swaggerSpec.tags = swaggerSpec.tags.filter(tag => tag.name !== 'Development');
  delete swaggerSpec.components.parameters.TenantQuery;
}

module.exports = swaggerSpec;
