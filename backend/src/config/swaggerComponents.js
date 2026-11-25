const jsonContent = schema => ({
  'application/json': { schema },
});

const errorResponse = (description, example) => ({
  description,
  content: jsonContent({
    allOf: [
      { $ref: '#/components/schemas/ErrorResponse' },
      ...(example ? [{ example }] : []),
    ],
  }),
});

module.exports = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Jeton d’accès JWT obtenu avec POST /api/auth/login.',
    },
  },
  parameters: {
    TenantHeader: {
      in: 'header',
      name: 'X-Tenant-ID',
      required: false,
      description: 'UUID du tenant. Peut être remplacé par le sous-domaine.',
      schema: { type: 'string', format: 'uuid' },
    },
    TenantQuery: {
      in: 'query',
      name: 'tenantId',
      required: false,
      description: 'Résolution du tenant disponible uniquement en développement.',
      schema: { type: 'string', format: 'uuid' },
    },
    TenantIdPath: {
      in: 'path',
      name: 'tenantId',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
    IdPath: {
      in: 'path',
      name: 'id',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
    SessionIdPath: {
      in: 'path',
      name: 'sessionId',
      required: true,
      schema: { type: 'string', minLength: 1, maxLength: 255 },
    },
    PageQuery: {
      in: 'query',
      name: 'page',
      schema: { type: 'integer', minimum: 1, default: 1 },
    },
    LimitQuery: {
      in: 'query',
      name: 'limit',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
  responses: {
    BadRequest: errorResponse('Requête invalide.', {
      success: false,
      error: 'Données invalides',
      timestamp: '2026-01-01T00:00:00.000Z',
    }),
    Unauthorized: errorResponse('Authentification requise ou jeton invalide.'),
    Forbidden: errorResponse('Droits insuffisants.'),
    NotFound: errorResponse('Ressource introuvable.'),
    Conflict: errorResponse('La ressource existe déjà.'),
    TooManyRequests: errorResponse('Limite de requêtes dépassée.'),
    InternalError: errorResponse('Erreur interne du serveur.'),
  },
  schemas: {
    ErrorResponse: {
      type: 'object',
      required: ['success', 'error'],
      properties: {
        success: { type: 'boolean', enum: [false] },
        error: { type: 'string' },
        code: { type: 'string' },
        details: {},
        timestamp: { type: 'string', format: 'date-time' },
        path: { type: 'string' },
        method: { type: 'string' },
      },
    },
    SuccessResponse: {
      type: 'object',
      required: ['success', 'message', 'data', 'timestamp'],
      properties: {
        success: { type: 'boolean', enum: [true] },
        message: { type: 'string' },
        data: {},
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
    Pagination: {
      type: 'object',
      required: ['page', 'limit', 'total', 'pages', 'hasNext', 'hasPrev'],
      properties: {
        page: { type: 'integer' },
        limit: { type: 'integer' },
        total: { type: 'integer' },
        pages: { type: 'integer' },
        hasNext: { type: 'boolean' },
        hasPrev: { type: 'boolean' },
      },
    },
    PaginatedResponse: {
      allOf: [
        { $ref: '#/components/schemas/SuccessResponse' },
        {
          type: 'object',
          required: ['pagination'],
          properties: { pagination: { $ref: '#/components/schemas/Pagination' } },
        },
      ],
    },
    User: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        role: { type: 'string', enum: ['owner', 'admin', 'user'] },
        tenantId: { type: 'string', format: 'uuid' },
        isActive: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Tenant: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        domain: { type: 'string', nullable: true },
        subdomain: { type: 'string', nullable: true },
        subscriptionPlan: { type: 'string', enum: ['free', 'basic', 'pro', 'enterprise'] },
        isActive: { type: 'boolean' },
        settings: { type: 'object', additionalProperties: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    AuthTokens: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresIn: { type: 'string' },
      },
    },
    AuthData: {
      type: 'object',
      properties: {
        user: { $ref: '#/components/schemas/User' },
        tenant: { $ref: '#/components/schemas/Tenant' },
        tokens: { $ref: '#/components/schemas/AuthTokens' },
      },
    },
    Knowledge: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string', maxLength: 500 },
        content: { type: 'string' },
        sourceType: { type: 'string', enum: ['manual', 'upload', 'url', 'api'] },
        sourceUrl: { type: 'string', format: 'uri', nullable: true },
        tags: { type: 'array', items: { type: 'string' }, maxItems: 10 },
        isActive: { type: 'boolean' },
        metadata: { type: 'object', additionalProperties: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Message: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['user', 'assistant', 'system'] },
        content: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
    Conversation: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        sessionId: { type: 'string' },
        title: { type: 'string', nullable: true },
        messages: { type: 'array', items: { $ref: '#/components/schemas/Message' } },
        status: { type: 'string' },
        sentiment: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        endedAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
    Analytics: {
      type: 'object',
      additionalProperties: true,
      properties: {
        totalConversations: { type: 'integer' },
        totalMessages: { type: 'integer' },
        averageRating: { type: 'number' },
        knowledgeBaseSize: { type: 'integer' },
      },
    },
    WidgetConfig: {
      type: 'object',
      additionalProperties: true,
      properties: {
        name: { type: 'string' },
        welcomeMessage: { type: 'string' },
        primaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        position: {
          type: 'string',
          enum: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
        },
        initialQuestions: { type: 'array', maxItems: 5, items: { type: 'string' } },
      },
    },
    ChannelStatus: {
      type: 'object',
      properties: {
        telegram: { type: 'object', additionalProperties: true },
        whatsapp: { type: 'object', additionalProperties: true },
      },
    },
    ProviderPayload: {
      type: 'object',
      description: 'Charge utile fournisseur. Les champs inconnus sont conservés.',
      additionalProperties: true,
    },
    FileUpload: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'TXT, Markdown, PDF, Word, PowerPoint, JPEG, PNG ou GIF. Limite par défaut : 10 Mo.',
        },
        title: { type: 'string', maxLength: 500 },
        tags: {
          oneOf: [
            { type: 'string', description: 'Tags séparés par des virgules.' },
            { type: 'array', items: { type: 'string' } },
          ],
        },
        metadata: { type: 'object', additionalProperties: true },
        isActive: { type: 'boolean', default: true },
      },
    },
  },
};
