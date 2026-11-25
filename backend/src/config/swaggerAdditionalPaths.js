const parameter = name => ({ $ref: `#/components/parameters/${name}` });
const response = name => ({ $ref: `#/components/responses/${name}` });
const success = description => ({
  description,
  content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
});
const jsonBody = schema => ({ required: true, content: { 'application/json': { schema } } });

const operation = ({ operationId, tag, summary, parameters = [], requestBody, result, publicRoute = false }) => ({
  operationId,
  tags: [tag],
  summary,
  security: publicRoute ? [] : [{ bearerAuth: [] }],
  parameters: [
    ...(tag !== 'Integrations' ? [parameter('TenantHeader'), parameter('TenantQuery')] : []),
    ...parameters,
  ],
  ...(requestBody && { requestBody }),
  responses: {
    '200': result || success('Opération réussie.'),
    '400': response('BadRequest'),
    ...(publicRoute ? {} : { '401': response('Unauthorized'), '403': response('Forbidden') }),
    '404': response('NotFound'),
    '429': response('TooManyRequests'),
    '500': response('InternalError'),
  },
});

const session = [parameter('SessionIdPath')];
const binary = (description, mediaType) => ({
  description,
  content: { [mediaType]: { schema: { type: 'string', format: 'binary' } } },
});

module.exports = {
  '/api/tenant/quota': { get: operation({ operationId: 'getTenantQuota', tag: 'Tenants', summary: 'Consulter les quotas du tenant' }) },
  '/api/tenant/credits': { get: operation({ operationId: 'getTenantCredits', tag: 'Tenants', summary: 'Consulter le portefeuille de crédits du tenant' }) },
  '/api/tenant/plans': { get: operation({ operationId: 'listTenantPlans', tag: 'Tenants', summary: 'Lister les forfaits disponibles' }) },
  '/api/tenant/conversation-export-settings': {
    get: operation({ operationId: 'getConversationExportSettings', tag: 'Tenants', summary: 'Consulter les destinataires d’export autorisés' }),
    put: operation({
      operationId: 'updateConversationExportSettings', tag: 'Tenants', summary: 'Modifier les destinataires d’export autorisés',
      requestBody: jsonBody({ type: 'object', required: ['allowedRecipients'], properties: { allowedRecipients: { type: 'array', maxItems: 50, items: { type: 'string', format: 'email' } } } }),
    }),
  },
  '/api/tenant/allowed-domains': { put: operation({
    operationId: 'updateAllowedDomains', tag: 'Tenants', summary: 'Modifier les domaines autorisés pour le widget',
    requestBody: jsonBody({ type: 'object', required: ['allowedDomains'], properties: { allowedDomains: { type: 'array', items: { type: 'string' } }, enforceDomains: { type: 'boolean' } } }),
  }) },
  '/api/tenant/allowed-apps': { put: operation({
    operationId: 'updateAllowedAppIds', tag: 'Tenants', summary: 'Modifier les identifiants d’application mobile autorisés',
    requestBody: jsonBody({ type: 'object', required: ['allowedAppIds'], properties: { allowedAppIds: { type: 'array', maxItems: 50, items: { type: 'string' } }, enforceAppIds: { type: 'boolean' } } }),
  }) },
  '/api/tenant/mobile-push': {
    get: operation({ operationId: 'getMobilePushSettings', tag: 'Tenants', summary: 'État des notifications push mobiles (sans secret)' }),
    put: operation({
      operationId: 'updateMobilePushSettings', tag: 'Tenants', summary: 'Configurer les notifications push mobiles (FCM, APNs)',
      requestBody: jsonBody({ type: 'object', properties: {
        enabled: { type: 'boolean' }, includeMessageText: { type: 'boolean' },
        fcm: { type: 'object', properties: { serviceAccount: { type: 'string', description: 'JSON du compte de service Firebase (écriture seule)' }, remove: { type: 'boolean' } } },
        apns: { type: 'object', properties: { keyId: { type: 'string' }, teamId: { type: 'string' }, bundleId: { type: 'string' }, sandbox: { type: 'boolean' }, privateKey: { type: 'string', description: 'Clé .p8 (écriture seule)' }, remove: { type: 'boolean' } } },
      } }),
    }),
  },
  '/api/knowledge/{id}/file': { get: operation({ operationId: 'getKnowledgeFileUrl', tag: 'Knowledge', summary: 'Créer un lien signé vers le fichier source', parameters: [parameter('IdPath')] }) },
  '/api/chat/attachments/{attachmentId}/url': { get: operation({
    operationId: 'getChatAttachmentUrl', tag: 'Chat', summary: 'Créer un lien signé vers une pièce jointe',
    parameters: [{ in: 'path', name: 'attachmentId', required: true, schema: { type: 'string', format: 'uuid' } }],
  }) },
  '/api/chat/conversation/{sessionId}/export': { get: operation({
    operationId: 'downloadConversationPdf', tag: 'Chat', summary: 'Exporter une conversation en PDF', parameters: session,
    result: binary('Document PDF de la conversation.', 'application/pdf'),
  }) },
  '/api/chat/conversations/export': { post: operation({
    operationId: 'downloadSelectedConversations', tag: 'Chat', summary: 'Exporter plusieurs conversations',
    requestBody: jsonBody({ type: 'object', required: ['sessionIds', 'format'], properties: { sessionIds: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'string' } }, format: { type: 'string', enum: ['csv', 'zip'] } } }),
    result: binary('Archive ou fichier CSV contenant les conversations.', 'application/octet-stream'),
  }) },
  '/api/chat/conversation/{sessionId}/email-export': { post: operation({
    operationId: 'emailConversationPdf', tag: 'Chat', summary: 'Envoyer un export PDF par e-mail', parameters: session,
    requestBody: jsonBody({ type: 'object', required: ['recipient'], properties: { recipient: { type: 'string', format: 'email' } } }),
  }) },
  '/api/chat/conversation/{sessionId}/take': { post: operation({ operationId: 'takeConversation', tag: 'Chat', summary: 'Prendre en charge une conversation', parameters: session }) },
  '/api/chat/conversation/{sessionId}/read': { post: operation({ operationId: 'markConversationRead', tag: 'Chat', summary: 'Marquer une conversation comme lue', parameters: session }) },
  '/api/chat/conversation/{sessionId}/return-to-ai': { post: operation({ operationId: 'returnConversationToAi', tag: 'Chat', summary: 'Rendre une conversation à l’IA', parameters: session }) },
  '/api/chat/conversation/{sessionId}/agent-message': { post: operation({
    operationId: 'sendAgentMessage', tag: 'Chat', summary: 'Envoyer un message d’agent', parameters: session,
    requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { message: { type: 'string' }, file: { type: 'string', format: 'binary' } } } } } },
  }) },
  '/api/chat/commercial-requests/{requestId}': { patch: operation({
    operationId: 'updateCommercialRequest', tag: 'Chat', summary: 'Mettre à jour le résultat d’une demande commerciale',
    parameters: [{ in: 'path', name: 'requestId', required: true, schema: { type: 'string', format: 'uuid' } }],
    requestBody: jsonBody({ type: 'object', minProperties: 1, properties: {
      category: { type: 'string', enum: ['order', 'repair', 'other'] },
      outcomeStatus: { type: 'string', enum: ['open', 'in_progress', 'successful', 'failed', 'cancelled'] },
      resolutionReason: { type: 'string', maxLength: 2000, nullable: true },
      amount: { type: 'integer', minimum: 0, nullable: true },
    } }),
  }) },
  '/api/widget/conversation/{sessionId}/timeout': { post: operation({
    operationId: 'timeoutWidgetConversation', tag: 'Widget', summary: 'Clôturer une conversation inactive', parameters: session, publicRoute: true,
    requestBody: jsonBody({ type: 'object', properties: { sessionDuration: { type: 'integer', minimum: 0 }, messageCount: { type: 'integer', minimum: 0 } } }),
  }) },
  '/api/integrations/microsoft/callback': { get: {
    operationId: 'completeMicrosoftOAuth', tags: ['Integrations'], summary: 'Terminer la connexion OAuth Microsoft', security: [],
    parameters: [
      { in: 'query', name: 'code', required: true, schema: { type: 'string' } },
      { in: 'query', name: 'state', required: true, schema: { type: 'string' } },
    ],
    responses: { '302': { description: 'Redirection vers la page d’intégration.' }, '400': response('BadRequest'), '500': response('InternalError') },
  } },
};
