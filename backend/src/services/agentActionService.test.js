jest.mock('../models', () => ({
  AgentAction: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
}));
jest.mock('../utils/cryptoUtils', () => ({
  encrypt: jest.fn(plain => `enc(${plain})`),
  decrypt: jest.fn(),
}));
jest.mock('../utils/ssrfGuard', () => ({ assertPublicUrl: jest.fn(async () => {}) }));

const { AgentAction } = require('../models');
const cryptoUtils = require('../utils/cryptoUtils');
const ssrfGuard = require('../utils/ssrfGuard');
const agentActionService = require('./agentActionService');

const TENANT_ID = 'tenant-1';

function makeAction(overrides = {}) {
  return {
    id: 'action-1',
    tenantId: TENANT_ID,
    name: 'check_order_status',
    description: 'Vérifie le statut d\'une commande',
    method: 'GET',
    endpointUrl: 'https://api.tenant-business.com/orders/{order_id}',
    parametersSchema: { type: 'object', properties: {}, required: [] },
    headersTemplate: {},
    authSecretEncrypted: null,
    timeoutMs: 5000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    update: jest.fn(),
    destroy: jest.fn(),
    ...overrides,
  };
}

describe('agentActionService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    test('never exposes the encrypted secret, only a boolean', async () => {
      AgentAction.findAll.mockResolvedValue([
        makeAction({ authSecretEncrypted: 'iv:tag:cipher' }),
      ]);

      const [action] = await agentActionService.list(TENANT_ID);

      expect(action.hasSecret).toBe(true);
      expect(action.authSecretEncrypted).toBeUndefined();
      expect(AgentAction.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: TENANT_ID } })
      );
    });
  });

  describe('create', () => {
    test('rejects once the per-tenant action limit is reached', async () => {
      AgentAction.count.mockResolvedValue(50);

      await expect(agentActionService.create(TENANT_ID, { endpointUrl: 'https://x.com' }))
        .rejects.toMatchObject({ statusCode: 400, code: 'AGENT_ACTION_LIMIT_REACHED' });

      expect(ssrfGuard.assertPublicUrl).not.toHaveBeenCalled();
    });

    test('validates the URL against SSRF before creating', async () => {
      AgentAction.count.mockResolvedValue(0);
      AgentAction.create.mockResolvedValue(makeAction());

      await agentActionService.create(TENANT_ID, {
        name: 'check_order_status',
        description: 'desc',
        method: 'GET',
        endpointUrl: 'https://api.tenant-business.com/orders',
        parametersSchema: { type: 'object' },
      });

      expect(ssrfGuard.assertPublicUrl).toHaveBeenCalledWith('https://api.tenant-business.com/orders');
    });

    test('encrypts the secret before persisting it, never in clear', async () => {
      AgentAction.count.mockResolvedValue(0);
      AgentAction.create.mockResolvedValue(makeAction());

      await agentActionService.create(TENANT_ID, {
        name: 'check_order_status',
        description: 'desc',
        method: 'GET',
        endpointUrl: 'https://api.tenant-business.com/orders',
        parametersSchema: { type: 'object' },
        authSecret: 'sk_live_secret',
      });

      expect(cryptoUtils.encrypt).toHaveBeenCalledWith('sk_live_secret');
      expect(AgentAction.create).toHaveBeenCalledWith(
        expect.objectContaining({ authSecretEncrypted: 'enc(sk_live_secret)' })
      );
    });

    test('translates a duplicate name into a French AppError', async () => {
      AgentAction.count.mockResolvedValue(0);
      const duplicateError = new Error('duplicate');
      duplicateError.name = 'SequelizeUniqueConstraintError';
      AgentAction.create.mockRejectedValue(duplicateError);

      await expect(agentActionService.create(TENANT_ID, {
        name: 'check_order_status', description: 'd', method: 'GET',
        endpointUrl: 'https://x.com', parametersSchema: { type: 'object' },
      })).rejects.toMatchObject({ statusCode: 409, code: 'AGENT_ACTION_NAME_EXISTS' });
    });
  });

  describe('update', () => {
    test('throws a 404 when the action does not belong to the tenant', async () => {
      AgentAction.findOne.mockResolvedValue(null);

      await expect(agentActionService.update(TENANT_ID, 'missing', {}))
        .rejects.toMatchObject({ statusCode: 404, code: 'AGENT_ACTION_NOT_FOUND' });
    });

    test('leaves the stored secret untouched when authSecret is omitted', async () => {
      const action = makeAction({ authSecretEncrypted: 'iv:tag:previous' });
      AgentAction.findOne.mockResolvedValue(action);

      await agentActionService.update(TENANT_ID, action.id, { description: 'nouvelle description' });

      expect(cryptoUtils.encrypt).not.toHaveBeenCalled();
      expect(action.update).toHaveBeenCalledWith(
        expect.not.objectContaining({ authSecretEncrypted: expect.anything() })
      );
    });

    test('replaces the secret when a non-empty authSecret is provided', async () => {
      const action = makeAction();
      AgentAction.findOne.mockResolvedValue(action);

      await agentActionService.update(TENANT_ID, action.id, { authSecret: 'new-secret' });

      expect(action.update).toHaveBeenCalledWith(
        expect.objectContaining({ authSecretEncrypted: 'enc(new-secret)' })
      );
    });

    test('re-validates SSRF only when endpointUrl changes', async () => {
      const action = makeAction();
      AgentAction.findOne.mockResolvedValue(action);

      await agentActionService.update(TENANT_ID, action.id, { description: 'x' });
      expect(ssrfGuard.assertPublicUrl).not.toHaveBeenCalled();

      await agentActionService.update(TENANT_ID, action.id, { endpointUrl: 'https://new.example.com' });
      expect(ssrfGuard.assertPublicUrl).toHaveBeenCalledWith('https://new.example.com');
    });
  });

  describe('remove', () => {
    test('destroys only an action owned by the tenant', async () => {
      const action = makeAction();
      AgentAction.findOne.mockResolvedValue(action);

      await agentActionService.remove(TENANT_ID, action.id);

      expect(AgentAction.findOne).toHaveBeenCalledWith({ where: { tenantId: TENANT_ID, id: action.id } });
      expect(action.destroy).toHaveBeenCalled();
    });
  });

  describe('listActiveByTenant', () => {
    test('only returns active actions for the given tenant', async () => {
      AgentAction.findAll.mockResolvedValue([makeAction()]);

      await agentActionService.listActiveByTenant(TENANT_ID);

      expect(AgentAction.findAll).toHaveBeenCalledWith({ where: { tenantId: TENANT_ID, isActive: true } });
    });
  });
});
