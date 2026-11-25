jest.mock('../models', () => ({
  SupportTicket: { findOne: jest.fn(), create: jest.fn(), findByPk: jest.fn() },
  SupportMessage: { create: jest.fn() },
  Tenant: { findByPk: jest.fn() },
  sequelize: { transaction: jest.fn() },
}));
jest.mock('./planService', () => ({ listPlans: jest.fn() }));
jest.mock('./quotaService', () => ({ getPlanName: jest.fn() }));
jest.mock('./supportNotifier', () => ({ notifyAdminsOfNewTicket: jest.fn(), notifyTenantOfReply: jest.fn() }));

const { SupportTicket, SupportMessage, Tenant, sequelize } = require('../models');
const planService = require('./planService');
const quotaService = require('./quotaService');
const notifier = require('./supportNotifier');
const service = require('./planChangeRequestService');

const TX = { LOCK: { UPDATE: 'UPDATE' } };
const tenant = { id: 'tenant-1', subscriptionPlan: 'free' };
const actor = { id: 'owner-1', firstName: 'Ada', lastName: 'Owner', email: 'ada@voxo.test' };

describe('planChangeRequestService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(fn => fn(TX));
    planService.listPlans.mockResolvedValue([{ name: 'free', label: 'Gratuit' }, { name: 'pro', label: 'Pro' }]);
    quotaService.getPlanName.mockReturnValue('free');
    SupportTicket.findOne.mockResolvedValue(null);
  });

  test('creates a structured plan-change ticket and its first message', async () => {
    const ticket = { id: 'ticket-1', subject: 'Demande de forfait : Pro', priority: 'normal' };
    SupportTicket.create.mockResolvedValue(ticket);

    await service.create({ tenant, actor, requestedPlan: 'pro', note: 'Plus de messages' });

    expect(SupportTicket.create).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: tenant.id, type: 'plan_change', requestedPlan: 'pro', requestNote: 'Plus de messages',
    }), { transaction: TX });
    expect(SupportMessage.create).toHaveBeenCalledWith(expect.objectContaining({ ticketId: 'ticket-1' }), { transaction: TX });
    expect(notifier.notifyAdminsOfNewTicket).toHaveBeenCalled();
  });

  test('rejects a duplicate active request', async () => {
    SupportTicket.findOne.mockResolvedValue({ id: 'existing-ticket' });
    await expect(service.create({ tenant, actor, requestedPlan: 'pro', note: '' }))
      .rejects.toMatchObject({ code: 'PLAN_CHANGE_ALREADY_PENDING' });
  });

  test('approves only an active plan-change ticket with a future expiry', async () => {
    const ticket = { id: 'ticket-1', tenantId: tenant.id, type: 'plan_change', requestedPlan: 'pro', status: 'open', update: jest.fn() };
    const managedTenant = { update: jest.fn() };
    SupportTicket.findByPk.mockResolvedValue(ticket);
    Tenant.findByPk.mockResolvedValue(managedTenant);
    SupportMessage.create.mockResolvedValue({});
    const expiry = new Date(Date.now() + 86400000).toISOString();

    await service.approve({ ticketId: ticket.id, admin: actor, subscriptionExpiresAt: expiry });

    expect(managedTenant.update).toHaveBeenCalledWith({ subscriptionPlan: 'pro', subscriptionExpiresAt: expiry }, { transaction: TX });
    expect(ticket.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'resolved' }), { transaction: TX });
    expect(notifier.notifyTenantOfReply).toHaveBeenCalledWith(expect.objectContaining({ ticket, adminName: 'Ada Owner' }));
  });

  test('rejects a ticket that is not a live plan-change request', async () => {
    SupportTicket.findByPk.mockResolvedValue({ type: 'general', status: 'open' });
    await expect(service.approve({ ticketId: 'ticket-1', admin: actor, subscriptionExpiresAt: new Date(Date.now() + 86400000).toISOString() }))
      .rejects.toMatchObject({ code: 'PLAN_CHANGE_TICKET_REQUIRED' });
  });
});
