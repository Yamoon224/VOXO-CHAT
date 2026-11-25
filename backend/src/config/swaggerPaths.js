const ref = name => ({ $ref: `#/components/schemas/${name}` });
const parameter = name => ({ $ref: `#/components/parameters/${name}` });
const responseRef = name => ({ $ref: `#/components/responses/${name}` });

const successResponse = (description, data = { type: 'object', additionalProperties: true }) => ({
  description,
  content: {
    'application/json': {
      schema: {
        allOf: [
          ref('SuccessResponse'),
          { type: 'object', properties: { data } },
        ],
      },
    },
  },
});

const operation = ({
  operationId,
  tag,
  summary,
  security = 'protected',
  tenant = false,
  parameters = [],
  requestBody,
  success = successResponse('Opération réussie.'),
  status = '200',
  development = false,
  extraResponses = {},
}) => ({
  operationId,
  tags: [development ? 'Development' : tag],
  summary,
  ...(development && {
    description: 'Endpoint de diagnostic disponible uniquement en développement.',
    'x-development-only': true,
  }),
  security: security === 'protected'
    ? [{ bearerAuth: [] }]
    : security === 'optional'
      ? [{ bearerAuth: [] }, {}]
      : [],
  parameters: [
    ...(tenant ? [parameter('TenantHeader'), parameter('TenantQuery')] : []),
    ...parameters,
  ],
  ...(requestBody && { requestBody }),
  responses: {
    [status]: success,
    '400': responseRef('BadRequest'),
    ...(security !== 'public' ? { '401': responseRef('Unauthorized') } : {}),
    ...(security === 'protected' ? { '403': responseRef('Forbidden') } : {}),
    '404': responseRef('NotFound'),
    '429': responseRef('TooManyRequests'),
    '500': responseRef('InternalError'),
    ...extraResponses,
  },
});

const jsonBody = (schema, example) => ({
  required: true,
  content: {
    'application/json': {
      schema,
      ...(example && { example }),
    },
  },
});

const multipartBody = schema => ({
  required: true,
  content: { 'multipart/form-data': { schema } },
});

const textResponse = (description, mediaType = 'text/plain') => ({
  description,
  content: { [mediaType]: { schema: { type: 'string' } } },
});

const paths = {};
const add = (path, method, definition) => {
  paths[path] ||= {};
  paths[path][method] = definition;
};

// System
add('/health', 'get', operation({
  operationId: 'getHealth',
  tag: 'System',
  summary: 'Vérifier la santé du service',
  security: 'public',
  success: {
    description: 'État des services.',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: ['status', 'timestamp', 'environment', 'services'],
          properties: {
            status: { type: 'string', enum: ['ok'] },
            timestamp: { type: 'string', format: 'date-time' },
            environment: { type: 'string' },
            services: { type: 'object', additionalProperties: { type: 'string' } },
          },
        },
      },
    },
  },
}));
add('/api', 'get', operation({
  operationId: 'getApiIndex',
  tag: 'System',
  summary: 'Afficher l’index des routes principales',
  security: 'public',
  success: {
    description: 'Informations générales sur l’API.',
    content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
  },
}));
add('/widget.js', 'get', operation({
  operationId: 'getWidgetScript',
  tag: 'System',
  summary: 'Télécharger le script du widget',
  security: 'public',
  success: textResponse('Bundle JavaScript du widget.', 'application/javascript'),
}));

// Authentication
add('/api/auth/register', 'post', operation({
  operationId: 'registerUser',
  tag: 'Auth',
  summary: 'Créer un propriétaire et son tenant',
  security: 'public',
  status: '201',
  requestBody: jsonBody({
    type: 'object',
    required: ['companyName', 'firstName', 'lastName', 'email', 'password', 'confirmPassword'],
    properties: {
      companyName: { type: 'string', minLength: 2, maxLength: 100 },
      domain: { type: 'string', format: 'uri', nullable: true },
      subdomain: { type: 'string', minLength: 3, maxLength: 50 },
      subscriptionPlan: { type: 'string', enum: ['free', 'basic', 'pro', 'enterprise'], default: 'free' },
      firstName: { type: 'string', maxLength: 50 },
      lastName: { type: 'string', maxLength: 50 },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', format: 'password', minLength: 8 },
      confirmPassword: { type: 'string', format: 'password' },
    },
  }),
  success: successResponse('Compte créé.', ref('AuthData')),
  extraResponses: { '409': responseRef('Conflict') },
}));
add('/api/auth/login', 'post', operation({
  operationId: 'loginUser',
  tag: 'Auth',
  summary: 'Connecter un utilisateur',
  security: 'public',
  requestBody: jsonBody({
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', format: 'password' },
      tenantId: { type: 'string', format: 'uuid' },
    },
  }),
  success: successResponse('Connexion réussie.', ref('AuthData')),
  extraResponses: { '401': responseRef('Unauthorized') },
}));
add('/api/auth/refresh-token', 'post', operation({
  operationId: 'refreshAccessToken',
  tag: 'Auth',
  summary: 'Renouveler le jeton d’accès',
  security: 'public',
  requestBody: jsonBody({
    type: 'object',
    required: ['refreshToken'],
    properties: { refreshToken: { type: 'string' } },
  }),
  success: successResponse('Jeton renouvelé.', ref('AuthTokens')),
  extraResponses: { '401': responseRef('Unauthorized') },
}));
add('/api/auth/forgot-password', 'post', operation({
  operationId: 'requestPasswordReset',
  tag: 'Auth',
  summary: 'Demander une réinitialisation de mot de passe',
  security: 'public',
  requestBody: jsonBody({
    type: 'object',
    required: ['email'],
    properties: { email: { type: 'string', format: 'email' } },
  }),
}));
add('/api/auth/reset-password', 'post', operation({
  operationId: 'resetPassword',
  tag: 'Auth',
  summary: 'Réinitialiser le mot de passe',
  security: 'public',
  requestBody: jsonBody({
    type: 'object',
    required: ['token', 'newPassword', 'confirmNewPassword'],
    properties: {
      token: { type: 'string' },
      newPassword: { type: 'string', format: 'password', minLength: 8 },
      confirmNewPassword: { type: 'string', format: 'password' },
    },
  }),
}));
add('/api/auth/verify-email', 'post', operation({
  operationId: 'verifyEmail',
  tag: 'Auth',
  summary: 'Confirmer son adresse email via le lien reçu',
  security: 'public',
  requestBody: jsonBody({
    type: 'object',
    required: ['token'],
    properties: { token: { type: 'string' } },
  }),
}));
add('/api/auth/resend-verification', 'post', operation({
  operationId: 'resendEmailVerification',
  tag: 'Auth',
  summary: 'Renvoyer le lien de vérification d’adresse',
  security: 'public',
  requestBody: jsonBody({
    type: 'object',
    required: ['email'],
    properties: { email: { type: 'string', format: 'email' } },
  }),
}));
add('/api/auth/profile', 'get', operation({
  operationId: 'getUserProfile',
  tag: 'Auth',
  summary: 'Obtenir le profil connecté',
  success: successResponse('Profil récupéré.', ref('User')),
}));
add('/api/auth/profile', 'put', operation({
  operationId: 'updateUserProfile',
  tag: 'Auth',
  summary: 'Mettre à jour le profil connecté',
  requestBody: jsonBody({
    type: 'object',
    required: ['firstName', 'lastName', 'email'],
    properties: {
      firstName: { type: 'string', maxLength: 50 },
      lastName: { type: 'string', maxLength: 50 },
      email: { type: 'string', format: 'email' },
    },
  }),
  success: successResponse('Profil mis à jour.', ref('User')),
}));
add('/api/auth/change-password', 'put', operation({
  operationId: 'changePassword',
  tag: 'Auth',
  summary: 'Changer le mot de passe connecté',
  requestBody: jsonBody({
    type: 'object',
    required: ['currentPassword', 'newPassword', 'confirmNewPassword'],
    properties: {
      currentPassword: { type: 'string', format: 'password' },
      newPassword: { type: 'string', format: 'password', minLength: 8 },
      confirmNewPassword: { type: 'string', format: 'password' },
    },
  }),
}));
add('/api/auth/account/deletion-preview', 'get', operation({
  operationId: 'getAccountDeletionPreview',
  tag: 'Auth',
  summary: 'Prévisualiser les conséquences de la suppression de son compte',
  success: successResponse('Aperçu de suppression récupéré.', {
    type: 'object',
    properties: {
      isOwner: { type: 'boolean' },
      transferRequired: { type: 'boolean' },
      willDeleteCompany: { type: 'boolean' },
      tenantName: { type: 'string', nullable: true },
      purgeAt: { type: 'string', format: 'date-time' },
      eligibleOwners: { type: 'array', items: { type: 'object' } },
      impact: { type: 'object', nullable: true },
    },
  }),
}));
add('/api/auth/account', 'delete', operation({
  operationId: 'deleteOwnAccount',
  tag: 'Auth',
  summary: 'Supprimer son compte (soft delete, purge définitive après 30 jours)',
  requestBody: jsonBody({
    type: 'object',
    required: ['currentPassword'],
    properties: {
      currentPassword: { type: 'string', format: 'password', minLength: 1 },
      // Obligatoire quand le propriétaire a encore des membres actifs.
      newOwnerId: { type: 'string', format: 'uuid' },
      // Obligatoire quand personne ne peut reprendre : l'entreprise part aussi.
      confirmCompanyDeletion: { type: 'boolean' },
    },
  }),
  success: successResponse('Compte supprimé.', {
    type: 'object',
    properties: {
      scope: { type: 'string', enum: ['member', 'company'] },
      purgeAt: { type: 'string', format: 'date-time' },
    },
  }),
}));
add('/api/auth/logout', 'post', operation({
  operationId: 'logoutUser',
  tag: 'Auth',
  summary: 'Déconnecter l’utilisateur',
}));
add('/api/auth/test', 'get', operation({
  operationId: 'testAuthRoutes',
  tag: 'Auth',
  summary: 'Tester les routes Auth',
  security: 'public',
  development: true,
}));

// Tenant
add('/api/tenant/profile', 'get', operation({
  operationId: 'getTenantProfile',
  tag: 'Tenants',
  summary: 'Obtenir le profil du tenant',
  tenant: true,
  success: successResponse('Tenant récupéré.', ref('Tenant')),
}));
add('/api/tenant/settings', 'put', operation({
  operationId: 'updateTenantSettings',
  tag: 'Tenants',
  summary: 'Modifier les paramètres généraux du tenant',
  tenant: true,
  requestBody: jsonBody({
    type: 'object',
    properties: {
      name: { type: 'string' },
      domain: { type: 'string' },
      subdomain: { type: 'string' },
    },
  }),
  success: successResponse('Paramètres mis à jour.', ref('Tenant')),
}));
add('/api/tenant/chatbot-settings', 'get', operation({
  operationId: 'getChatbotSettings',
  tag: 'Tenants',
  summary: 'Obtenir les paramètres du chatbot',
  tenant: true,
  success: successResponse('Configuration récupérée.', ref('WidgetConfig')),
}));
add('/api/tenant/chatbot-settings', 'put', operation({
  operationId: 'updateChatbotSettings',
  tag: 'Tenants',
  summary: 'Modifier les paramètres du chatbot',
  tenant: true,
  requestBody: jsonBody(ref('WidgetConfig')),
  success: successResponse('Configuration mise à jour.', {
    type: 'object',
    properties: {
      chatbot: ref('WidgetConfig'),
      warnings: {
        type: 'array',
        items: {
          type: 'object',
          required: ['code', 'message'],
          properties: {
            code: { type: 'string', example: 'INITIAL_QUESTIONS_NOT_COVERED' },
            message: { type: 'string' },
          },
        },
      },
    },
  }),
}));
add('/api/tenant/test', 'get', operation({
  operationId: 'testTenantRoutes',
  tag: 'Tenants',
  summary: 'Tester la résolution du tenant',
  tenant: true,
  security: 'public',
  development: true,
}));

// Knowledge
const knowledgeCollection = { type: 'array', items: ref('Knowledge') };
const ragStatusSchema = {
  type: 'object',
  properties: {
    embeddingProviderAvailable: { type: 'boolean' },
    minSimilarity: { type: 'number', minimum: 0, maximum: 1 },
    topK: { type: 'integer', minimum: 1 },
    activeDocuments: { type: 'integer', minimum: 0 },
    indexedDocuments: { type: 'integer', minimum: 0 },
    embeddingCoverage: { type: 'integer', minimum: 0, maximum: 100 },
    chunks: {
      type: 'object',
      properties: {
        total: { type: 'integer', minimum: 0 },
        done: { type: 'integer', minimum: 0 },
        pending: { type: 'integer', minimum: 0 },
        indexing: { type: 'integer', minimum: 0 },
        error: { type: 'integer', minimum: 0 },
      },
    },
  },
};
add('/api/knowledge', 'get', operation({
  operationId: 'listKnowledge',
  tag: 'Knowledge',
  summary: 'Lister les connaissances',
  tenant: true,
  parameters: [
    parameter('PageQuery'),
    parameter('LimitQuery'),
    { in: 'query', name: 'search', schema: { type: 'string' } },
    { in: 'query', name: 'sourceType', schema: { type: 'string' } },
    { in: 'query', name: 'isActive', schema: { type: 'boolean' } },
  ],
  success: {
    description: 'Liste paginée.',
    content: {
      'application/json': {
        schema: {
          allOf: [
            ref('PaginatedResponse'),
            { type: 'object', properties: { data: knowledgeCollection } },
          ],
        },
      },
    },
  },
}));
add('/api/knowledge', 'post', operation({
  operationId: 'createKnowledge',
  tag: 'Knowledge',
  summary: 'Créer une connaissance manuelle',
  tenant: true,
  status: '201',
  requestBody: jsonBody({
    type: 'object',
    required: ['title', 'content'],
    properties: {
      title: { type: 'string', maxLength: 500 },
      content: { type: 'string', maxLength: 10000 },
      tags: { type: 'array', maxItems: 10, items: { type: 'string' } },
      metadata: { type: 'object', additionalProperties: true },
    },
  }),
  success: successResponse('Connaissance créée.', ref('Knowledge')),
}));
add('/api/knowledge/search', 'get', operation({
  operationId: 'searchKnowledge',
  tag: 'Knowledge',
  summary: 'Rechercher dans les connaissances',
  tenant: true,
  parameters: [
    { in: 'query', name: 'q', required: true, schema: { type: 'string', minLength: 2 } },
    { in: 'query', name: 'limit', schema: { type: 'integer', minimum: 1, maximum: 50 } },
  ],
  success: successResponse('Résultats de recherche.', knowledgeCollection),
}));
add('/api/knowledge/stats', 'get', operation({
  operationId: 'getKnowledgeStats',
  tag: 'Knowledge',
  summary: 'Obtenir les statistiques des connaissances',
  tenant: true,
  success: successResponse('Statistiques des connaissances et état du RAG.', {
    type: 'object',
    properties: {
      total: { type: 'integer', minimum: 0 },
      active: { type: 'integer', minimum: 0 },
      withEmbedding: { type: 'integer', minimum: 0 },
      embeddingCoverage: { type: 'integer', minimum: 0, maximum: 100 },
      rag: ragStatusSchema,
    },
    additionalProperties: true,
  }),
}));
add('/api/knowledge/processing/capabilities', 'get', operation({
  operationId: 'getProcessingCapabilities',
  tag: 'Knowledge',
  summary: 'Lister les capacités de traitement documentaire',
  tenant: true,
}));
add('/api/knowledge/processing/health', 'get', operation({
  operationId: 'getProcessingHealth',
  tag: 'Knowledge',
  summary: 'Vérifier les services OCR et PDF',
  tenant: true,
}));
add('/api/knowledge/processing/preview', 'post', operation({
  operationId: 'previewKnowledgeFile',
  tag: 'Knowledge',
  summary: 'Prévisualiser le traitement d’un fichier',
  tenant: true,
  requestBody: multipartBody(ref('FileUpload')),
}));
add('/api/knowledge/upload', 'post', operation({
  operationId: 'uploadKnowledgeFile',
  tag: 'Knowledge',
  summary: 'Créer une connaissance depuis un fichier',
  tenant: true,
  status: '201',
  parameters: [{
    in: 'header',
    name: 'X-File-Type',
    schema: { type: 'string', enum: ['pdf', 'image', 'document'] },
    description: 'Permet d’appliquer la limite de débit adaptée.',
  }],
  requestBody: multipartBody(ref('FileUpload')),
  success: successResponse('Fichier traité.', ref('Knowledge')),
}));
add('/api/knowledge/from-url', 'post', operation({
  operationId: 'createKnowledgeFromUrl',
  tag: 'Knowledge',
  summary: 'Créer une connaissance depuis une URL',
  tenant: true,
  status: '201',
  requestBody: jsonBody({
    type: 'object',
    required: ['url'],
    properties: {
      url: { type: 'string', format: 'uri' },
      title: { type: 'string', maxLength: 500 },
      tags: { type: 'array', items: { type: 'string' } },
    },
  }),
  success: successResponse('URL importée.', ref('Knowledge')),
}));
// Schéma partagé d'un crawl de site
const crawlJobSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    rootUrl: { type: 'string', format: 'uri' },
    status: {
      type: 'string',
      enum: ['pending', 'running', 'completed', 'partial', 'blocked', 'failed'],
    },
    isFinished: { type: 'boolean' },
    strategy: {
      type: 'string',
      nullable: true,
      enum: ['sitemap', 'links', null],
      description: 'Comment les URLs ont été trouvées.',
    },
    discoveredVia: {
      type: 'string',
      nullable: true,
      description: 'Origine du sitemap : robots.txt, chemin conventionnel, etc.',
    },
    pagesDiscovered: { type: 'integer', minimum: 0 },
    pagesIndexed: { type: 'integer', minimum: 0 },
    pagesFailed: { type: 'integer', minimum: 0 },
    failureReason: {
      type: 'string',
      nullable: true,
      enum: ['BLOCKED', 'JS_ONLY', 'NOT_FOUND', 'TIMEOUT', 'SERVER_ERROR', 'UNSAFE_URL', 'NETWORK', null],
    },
    failureMessage: {
      type: 'string',
      nullable: true,
      description: 'Message prêt à afficher au client (anti-bot, quota atteint...).',
    },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          reason: { type: 'string' },
          error: { type: 'string' },
        },
      },
    },
    startedAt: { type: 'string', format: 'date-time', nullable: true },
    finishedAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

add('/api/knowledge/crawl-site', 'post', operation({
  operationId: 'crawlSite',
  tag: 'Knowledge',
  summary: 'Parcourir toutes les pages d\'un site',
  description: 'Découvre les pages disponibles (robots.txt, sitemap, puis liens internes) '
    + 'et les indexe. Réponse immédiate : suivre l\'avancement via /api/knowledge/crawl-jobs/{id}.',
  tenant: true,
  status: '202',
  requestBody: jsonBody({
    type: 'object',
    required: ['url'],
    properties: {
      url: { type: 'string', format: 'uri' },
      sitemapUrl: {
        type: 'string',
        format: 'uri',
        description: 'Optionnel : force un sitemap si la détection automatique échoue.',
      },
      title: { type: 'string', maxLength: 400, description: 'Préfixe ajouté au titre de chaque page.' },
      tags: { type: 'array', items: { type: 'string' }, maxItems: 10 },
      maxPages: { type: 'integer', minimum: 1, maximum: 500, default: 50 },
      maxDepth: { type: 'integer', minimum: 1, maximum: 5, default: 3 },
      includeSubdomains: { type: 'boolean', default: false },
    },
  }),
  success: successResponse('Crawl démarré.', crawlJobSchema),
}));
add('/api/knowledge/crawl-jobs', 'get', operation({
  operationId: 'listCrawlJobs',
  tag: 'Knowledge',
  summary: 'Lister les crawls de site',
  tenant: true,
  parameters: [{
    in: 'query',
    name: 'limit',
    schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
  }],
  success: successResponse('Crawls récupérés.', { type: 'array', items: crawlJobSchema }),
}));
add('/api/knowledge/crawl-jobs/{id}', 'get', operation({
  operationId: 'getCrawlJob',
  tag: 'Knowledge',
  summary: 'Suivre l\'avancement d\'un crawl',
  tenant: true,
  parameters: [parameter('IdPath')],
  success: successResponse('État du crawl récupéré.', crawlJobSchema),
}));
add('/api/knowledge/bulk-import', 'post', operation({
  operationId: 'bulkImportKnowledge',
  tag: 'Knowledge',
  summary: 'Importer plusieurs connaissances',
  tenant: true,
  requestBody: jsonBody({
    type: 'object',
    required: ['items'],
    properties: {
      items: { type: 'array', minItems: 1, maxItems: 50, items: ref('Knowledge') },
    },
  }),
  success: successResponse('Import terminé.', {
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  }),
}));
add('/api/knowledge/regenerate-embeddings', 'post', operation({
  operationId: 'regenerateKnowledgeEmbeddings',
  tag: 'Knowledge',
  summary: 'Régénérer les embeddings',
  tenant: true,
  parameters: [{
    in: 'query',
    name: 'force',
    schema: { type: 'boolean', default: false },
    description: 'Reconstruit tous les chunks avant de générer les embeddings.',
  }],
  success: successResponse('Indexation RAG terminée avec son bilan réel.', {
    type: 'object',
    properties: {
      force: { type: 'boolean', default: false },
      message: { type: 'string' },
      summary: {
        type: 'object',
        properties: {
          documents: { type: 'integer', minimum: 0 },
          chunksCreated: { type: 'integer', minimum: 0 },
          chunksEmbedded: { type: 'integer', minimum: 0 },
          skipped: { type: 'integer', minimum: 0 },
        },
      },
      status: ragStatusSchema,
    },
  }),
}));
add('/api/knowledge/export/json', 'get', operation({
  operationId: 'exportKnowledgeJson',
  tag: 'Knowledge',
  summary: 'Exporter les connaissances en JSON',
  tenant: true,
  parameters: [
    { in: 'query', name: 'includeInactive', schema: { type: 'boolean', default: false } },
    { in: 'query', name: 'includeProcessingData', schema: { type: 'boolean', default: false } },
  ],
  success: {
    description: 'Fichier JSON exporté.',
    headers: {
      'Content-Disposition': { schema: { type: 'string' } },
    },
    content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
  },
}));
add('/api/knowledge/{id}', 'get', operation({
  operationId: 'getKnowledge',
  tag: 'Knowledge',
  summary: 'Obtenir une connaissance',
  tenant: true,
  parameters: [parameter('IdPath')],
  success: successResponse('Connaissance récupérée.', ref('Knowledge')),
}));
add('/api/knowledge/{id}', 'put', operation({
  operationId: 'updateKnowledge',
  tag: 'Knowledge',
  summary: 'Modifier une connaissance',
  tenant: true,
  parameters: [parameter('IdPath')],
  requestBody: jsonBody({
    type: 'object',
    properties: {
      title: { type: 'string', maxLength: 500 },
      content: { type: 'string', maxLength: 10000 },
      tags: { type: 'array', items: { type: 'string' } },
      isActive: { type: 'boolean' },
      metadata: { type: 'object', additionalProperties: true },
    },
  }),
  success: successResponse('Connaissance mise à jour.', ref('Knowledge')),
}));
add('/api/knowledge/{id}', 'delete', operation({
  operationId: 'deleteKnowledge',
  tag: 'Knowledge',
  summary: 'Supprimer définitivement une connaissance et ses embeddings',
  tenant: true,
  parameters: [parameter('IdPath')],
}));
add('/api/knowledge/{id}/duplicate', 'post', operation({
  operationId: 'duplicateKnowledge',
  tag: 'Knowledge',
  summary: 'Dupliquer une connaissance',
  tenant: true,
  status: '201',
  parameters: [parameter('IdPath')],
  requestBody: jsonBody({
    type: 'object',
    properties: {
      newTitle: { type: 'string', maxLength: 500 },
      copyTags: { type: 'boolean', default: true },
      copyMetadata: { type: 'boolean', default: true },
      additionalTags: { type: 'array', maxItems: 5, items: { type: 'string' } },
    },
  }),
  success: successResponse('Connaissance dupliquée.', ref('Knowledge')),
}));
add('/api/knowledge/{id}/archive', 'patch', operation({
  operationId: 'archiveKnowledge',
  tag: 'Knowledge',
  summary: 'Archiver ou désarchiver une connaissance',
  tenant: true,
  parameters: [parameter('IdPath')],
  requestBody: jsonBody({
    type: 'object',
    properties: {
      archive: { type: 'boolean', default: true },
      reason: { type: 'string', maxLength: 500 },
    },
  }),
}));
add('/api/knowledge/{id}/reprocess', 'post', operation({
  operationId: 'reprocessKnowledge',
  tag: 'Knowledge',
  summary: 'Relancer le traitement documentaire',
  tenant: true,
  parameters: [parameter('IdPath')],
  requestBody: jsonBody({
    type: 'object',
    properties: {
      method: { type: 'string', default: 'auto' },
      ocrLanguage: { type: 'string', default: 'fra+eng' },
    },
  }),
}));
add('/api/knowledge/{id}/processing-history', 'get', operation({
  operationId: 'getKnowledgeProcessingHistory',
  tag: 'Knowledge',
  summary: 'Obtenir l’historique de traitement',
  tenant: true,
  parameters: [parameter('IdPath')],
}));
add('/api/knowledge/test', 'get', operation({
  operationId: 'testKnowledgeRoutes',
  tag: 'Knowledge',
  summary: 'Tester les routes Knowledge',
  tenant: true,
  development: true,
}));
add('/api/knowledge/test-ocr', 'post', operation({
  operationId: 'testKnowledgeOcr',
  tag: 'Knowledge',
  summary: 'Tester l’OCR avec un fichier',
  tenant: true,
  development: true,
  requestBody: multipartBody({
    type: 'object',
    required: ['testFile'],
    properties: { testFile: { type: 'string', format: 'binary' } },
  }),
}));
add('/api/knowledge/test-performance', 'get', operation({
  operationId: 'testKnowledgePerformance',
  tag: 'Knowledge',
  summary: 'Tester les performances OCR/PDF',
  tenant: true,
  development: true,
}));

// Chat
const chatMessageBody = jsonBody({
  type: 'object',
  required: ['message'],
  properties: {
    message: { type: 'string', minLength: 1, maxLength: 2000 },
    sessionId: { type: 'string', maxLength: 255 },
    clientMessageId: { type: 'string', format: 'uuid', description: 'Clé d’idempotence du message utilisateur.' },
    userId: { type: 'string', maxLength: 255 },
    metadata: { type: 'object', additionalProperties: true },
  },
});
add('/api/chat/message', 'post', operation({
  operationId: 'sendChatMessage',
  tag: 'Chat',
  summary: 'Envoyer un message au chatbot',
  security: 'optional',
  tenant: true,
  requestBody: chatMessageBody,
}));
add('/api/chat/test-ai', 'get', operation({
  operationId: 'testAiConnection',
  tag: 'Chat',
  summary: 'Tester la connexion au fournisseur IA',
  tenant: true,
  security: 'public',
  development: true,
}));
add('/api/chat/conversation/{sessionId}', 'get', operation({
  operationId: 'getConversationHistory',
  tag: 'Chat',
  summary: 'Obtenir l’historique d’une conversation',
  tenant: true,
  parameters: [parameter('SessionIdPath')],
  success: successResponse('Conversation récupérée.', ref('Conversation')),
}));
add('/api/chat/conversations', 'get', operation({
  operationId: 'listConversations',
  tag: 'Chat',
  summary: 'Lister les conversations',
  tenant: true,
  parameters: [
    parameter('PageQuery'), parameter('LimitQuery'),
    { in: 'query', name: 'priority', schema: { type: 'string', enum: ['normal', 'important', 'urgent', 'critical'] } },
    { in: 'query', name: 'labelId', schema: { type: 'string', format: 'uuid' } },
    { in: 'query', name: 'sortBy', schema: { type: 'string', enum: ['updatedAt', 'priority'], default: 'updatedAt' } },
    { in: 'query', name: 'sortOrder', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
  ],
  success: successResponse('Conversations récupérées.', {
    type: 'array',
    items: ref('Conversation'),
  }),
}));
add('/api/chat/conversation/{sessionId}/priority', 'patch', operation({
  operationId: 'updateConversationPriority', tag: 'Chat', summary: 'Modifier ou automatiser la priorité', tenant: true,
  parameters: [parameter('SessionIdPath')],
  requestBody: jsonBody({ type: 'object', required: ['value'], properties: { value: { type: 'string', enum: ['normal', 'important', 'urgent', 'critical'], nullable: true } } }),
}));
add('/api/chat/conversation-labels', 'get', operation({
  operationId: 'listConversationLabels', tag: 'Chat', summary: 'Lister les étiquettes de conversation', tenant: true,
}));
add('/api/chat/conversation-labels', 'post', operation({
  operationId: 'createConversationLabel', tag: 'Chat', summary: 'Créer une étiquette de conversation', tenant: true,
  requestBody: jsonBody({ type: 'object', required: ['name', 'color'], properties: { name: { type: 'string', maxLength: 40 }, color: { type: 'string', enum: ['slate', 'blue', 'green', 'yellow', 'orange', 'red', 'purple', 'pink'] } } }),
}));
add('/api/chat/conversation-labels/{labelId}', 'patch', operation({
  operationId: 'updateConversationLabel', tag: 'Chat', summary: 'Modifier une étiquette', tenant: true,
  parameters: [{ in: 'path', name: 'labelId', required: true, schema: { type: 'string', format: 'uuid' } }],
  requestBody: jsonBody({ type: 'object', properties: { name: { type: 'string', maxLength: 40 }, color: { type: 'string' } } }),
}));
add('/api/chat/conversation-labels/{labelId}', 'delete', operation({
  operationId: 'deleteConversationLabel', tag: 'Chat', summary: 'Supprimer une étiquette', tenant: true,
  parameters: [{ in: 'path', name: 'labelId', required: true, schema: { type: 'string', format: 'uuid' } }],
}));
add('/api/chat/conversation/{sessionId}/labels', 'put', operation({
  operationId: 'assignConversationLabels', tag: 'Chat', summary: 'Remplacer les étiquettes d’une conversation', tenant: true,
  parameters: [parameter('SessionIdPath')],
  requestBody: jsonBody({ type: 'object', required: ['labelIds'], properties: { labelIds: { type: 'array', maxItems: 10, uniqueItems: true, items: { type: 'string', format: 'uuid' } } } }),
}));
add('/api/chat/conversation/{sessionId}/end', 'post', operation({
  operationId: 'endConversation',
  tag: 'Chat',
  summary: 'Terminer une conversation',
  tenant: true,
  parameters: [parameter('SessionIdPath')],
}));
add('/api/chat/conversation/{sessionId}/title', 'patch', operation({
  operationId: 'updateConversationTitle',
  tag: 'Chat',
  summary: 'Modifier le titre d’une conversation',
  tenant: true,
  parameters: [parameter('SessionIdPath')],
  requestBody: jsonBody({
    type: 'object', required: ['title'], properties: { title: { type: 'string', maxLength: 120 } },
  }),
}));
add('/api/chat/improve-response', 'post', operation({
  operationId: 'improveChatResponse',
  tag: 'Chat',
  summary: 'Améliorer une réponse avec l’IA',
  tenant: true,
  requestBody: jsonBody({
    type: 'object',
    required: ['response'],
    properties: {
      response: { type: 'string' },
      context: { type: 'string' },
    },
  }),
}));
add('/api/chat/analyze-sentiment', 'post', operation({
  operationId: 'analyzeConversationSentiment',
  tag: 'Chat',
  summary: 'Analyser le sentiment de messages',
  tenant: true,
  requestBody: jsonBody({
    type: 'object',
    required: ['messages'],
    properties: { messages: { type: 'array', items: { type: 'string' } } },
  }),
}));
add('/api/chat/batch-summary', 'post', operation({
  operationId: 'summarizeConversations',
  tag: 'Chat',
  summary: 'Résumer plusieurs conversations',
  tenant: true,
  requestBody: jsonBody({
    type: 'object',
    required: ['conversationIds'],
    properties: {
      conversationIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
    },
  }),
}));
add('/api/chat/test', 'get', operation({
  operationId: 'testChatRoutes',
  tag: 'Chat',
  summary: 'Tester les routes Chat',
  tenant: true,
  security: 'public',
  development: true,
}));
add('/api/chat/test-performance', 'post', operation({
  operationId: 'testChatPerformance',
  tag: 'Chat',
  summary: 'Tester les performances du chat',
  tenant: true,
  development: true,
  requestBody: jsonBody({
    type: 'object',
    properties: { message: { type: 'string', default: 'Test de performance' } },
  }),
}));

// Analytics
add('/api/analytics/dashboard', 'get', operation({
  operationId: 'getAnalyticsDashboard',
  tag: 'Analytics',
  summary: 'Obtenir les indicateurs du tableau de bord',
  tenant: true,
  success: successResponse('Statistiques récupérées.', ref('Analytics')),
}));
add('/api/analytics/detailed', 'get', operation({
  operationId: 'getDetailedAnalytics',
  tag: 'Analytics',
  summary: 'Obtenir les statistiques détaillées',
  tenant: true,
  success: successResponse('Statistiques détaillées récupérées.', ref('Analytics')),
}));
add('/api/analytics/test', 'get', operation({
  operationId: 'testAnalyticsRoutes',
  tag: 'Analytics',
  summary: 'Tester les routes Analytics',
  tenant: true,
  security: 'public',
  development: true,
}));

// Widget
const widgetOperation = definition => operation({
  tag: 'Widget',
  security: 'public',
  tenant: true,
  ...definition,
});
add('/api/widget/message', 'post', widgetOperation({
  operationId: 'sendWidgetMessage',
  summary: 'Envoyer un message depuis le widget',
  requestBody: chatMessageBody,
}));
add('/api/widget/conversation/{sessionId}', 'get', widgetOperation({
  operationId: 'getWidgetConversation',
  summary: 'Obtenir une conversation du widget',
  parameters: [parameter('SessionIdPath')],
  success: successResponse('Conversation récupérée.', ref('Conversation')),
}));
add('/api/widget/conversation/{sessionId}/end', 'post', widgetOperation({
  operationId: 'endWidgetConversation',
  summary: 'Terminer une conversation du widget',
  parameters: [parameter('SessionIdPath')],
  requestBody: jsonBody({
    type: 'object',
    properties: {
      rating: { type: 'integer', minimum: 1, maximum: 5 },
      feedback: { type: 'string', maxLength: 1000 },
      sessionDuration: { type: 'integer', minimum: 0, nullable: true },
      messageCount: { type: 'integer', minimum: 0 },
    },
  }),
}));
add('/api/widget/conversation/{sessionId}/message-feedback', 'post', widgetOperation({
  operationId: 'submitWidgetMessageFeedback',
  summary: 'Noter une réponse de l’assistant',
  parameters: [parameter('SessionIdPath')],
  requestBody: jsonBody({
    type: 'object',
    required: ['value'],
    properties: {
      messageId: { type: 'string', maxLength: 100 },
      messageIndex: { type: 'integer', minimum: 0 },
      value: { type: 'string', enum: ['up', 'down'], nullable: true },
    },
    anyOf: [{ required: ['messageId'] }, { required: ['messageIndex'] }],
  }),
}));
add('/api/widget/config', 'get', widgetOperation({
  operationId: 'getWidgetConfig',
  summary: 'Obtenir la configuration publique du widget',
  success: successResponse('Configuration récupérée.', ref('WidgetConfig')),
}));
add('/api/widget/health', 'get', widgetOperation({
  operationId: 'getWidgetHealth',
  summary: 'Vérifier la santé de l’API Widget',
}));
add('/api/widget/quick-replies', 'get', widgetOperation({
  operationId: 'getWidgetQuickReplies',
  summary: 'Obtenir les réponses rapides',
  success: successResponse('Réponses rapides récupérées.', {
    type: 'array',
    items: { type: 'string' },
  }),
}));
add('/api/widget/report-issue', 'post', widgetOperation({
  operationId: 'reportWidgetIssue',
  summary: 'Signaler un problème du widget',
  requestBody: jsonBody({
    type: 'object',
    required: ['description'],
    properties: {
      description: { type: 'string' },
      sessionId: { type: 'string' },
      metadata: { type: 'object', additionalProperties: true },
    },
  }),
}));
add('/api/widget/test', 'get', widgetOperation({
  operationId: 'testWidgetRoutes',
  summary: 'Tester les routes Widget',
  development: true,
}));

// Webhooks
const tenantPath = [parameter('TenantIdPath')];
const providerBody = jsonBody(ref('ProviderPayload'));
add('/api/webhooks/channels/{tenantId}/status', 'get', operation({
  operationId: 'getChannelStatus',
  tag: 'Webhooks',
  summary: 'Obtenir le statut des canaux',
  parameters: tenantPath,
  success: successResponse('Statut récupéré.', ref('ChannelStatus')),
}));
for (const provider of ['telegram', 'whatsapp']) {
  const label = provider === 'telegram' ? 'Telegram' : 'WhatsApp';
  add(`/api/webhooks/${provider}/{tenantId}`, 'post', operation({
    operationId: `receive${label}Webhook`,
    tag: 'Webhooks',
    summary: `Recevoir un événement ${label}`,
    security: 'public',
    parameters: tenantPath,
    requestBody: providerBody,
    success: textResponse(`Événement ${label} accepté.`),
  }));
  add(`/api/webhooks/${provider}/{tenantId}/register`, 'post', operation({
    operationId: `register${label}Webhook`,
    tag: 'Webhooks',
    summary: `Enregistrer le webhook ${label}`,
    parameters: tenantPath,
    requestBody: providerBody,
  }));
  add(`/api/webhooks/${provider}/{tenantId}/test`, 'post', operation({
    operationId: `test${label}Connection`,
    tag: 'Webhooks',
    summary: `Tester la connexion ${label}`,
    parameters: tenantPath,
    requestBody: providerBody,
  }));
  add(`/api/webhooks/${provider}/{tenantId}/webhook`, 'delete', operation({
    operationId: `delete${label}Webhook`,
    tag: 'Webhooks',
    summary: `Supprimer le webhook ${label}`,
    parameters: tenantPath,
  }));
}

module.exports = paths;
