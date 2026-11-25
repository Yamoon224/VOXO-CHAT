jest.mock('../middleware/authMiddleware', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'owner-1', role: 'owner' };
    next();
  },
}));

jest.mock('../services/teamMemberService', () => ({
  listMembers: jest.fn(),
  updateRole: jest.fn(),
  updatePermissions: jest.fn(),
  setMemberStatus: jest.fn(),
  deleteMember: jest.fn(),
}));

jest.mock('../services/teamInvitationService', () => ({
  createInvitation: jest.fn(),
  resendInvitation: jest.fn(),
  revokeInvitation: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const routes = require('./teamRoutes');
const memberService = require('../services/teamMemberService');
const invitationService = require('../services/teamInvitationService');
const { errorHandler } = require('../middleware/errorMiddleware');

describe('teamRoutes', () => {
  const tenant = { id: '11111111-1111-4111-8111-111111111111', name: 'Acme' };
  let app;
  const invitationId = '22222222-2222-4222-8222-222222222222';
  const memberId = '33333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.tenant = tenant;
      next();
    });
    app.use('/api/team', routes);
    app.use(errorHandler);
  });

  test('lists members in the resolved tenant', async () => {
    memberService.listMembers.mockResolvedValue({ members: [], invitations: [] });
    const response = await request(app).get('/api/team/members?role=user');
    expect(response.status).toBe(200);
    expect(memberService.listMembers).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: tenant.id,
      role: 'user',
    }));
  });

  test('invites a member', async () => {
    invitationService.createInvitation.mockResolvedValue({ id: 'invite-1' });
    const response = await request(app)
      .post('/api/team/invitations')
      .send({ email: 'new@example.com', role: 'admin' });
    expect(response.status).toBe(201);
    expect(invitationService.createInvitation).toHaveBeenCalledWith(expect.objectContaining({
      tenant,
      email: 'new@example.com',
      role: 'admin',
    }));
  });

  test('carries the chosen access levels to the invitation service', async () => {
    invitationService.createInvitation.mockResolvedValue({ id: 'invite-1' });
    const response = await request(app)
      .post('/api/team/invitations')
      .send({ email: 'new@example.com', role: 'user', permissions: { knowledge: 'write' } });

    expect(response.status).toBe(201);
    expect(invitationService.createInvitation).toHaveBeenCalledWith(expect.objectContaining({
      permissions: { knowledge: 'write' },
    }));
  });

  test('rejects an invitation carrying an unknown access level', async () => {
    const response = await request(app)
      .post('/api/team/invitations')
      .send({ email: 'new@example.com', role: 'user', permissions: { knowledge: 'admin' } });

    expect(response.status).toBe(400);
    expect(invitationService.createInvitation).not.toHaveBeenCalled();
  });

  test('updates member permissions', async () => {
    memberService.updatePermissions.mockResolvedValue({ id: 'user-1' });
    const response = await request(app)
      .patch(`/api/team/members/${memberId}/permissions`)
      .send({ permissions: { knowledge: 'write', company: 'none' } });

    expect(response.status).toBe(200);
    expect(memberService.updatePermissions).toHaveBeenCalledWith(expect.objectContaining({
      memberId,
      tenantId: tenant.id,
      permissions: { knowledge: 'write', company: 'none' },
    }));
  });

  test('rejects an unknown resource in a permissions update', async () => {
    const response = await request(app)
      .patch(`/api/team/members/${memberId}/permissions`)
      .send({ permissions: { billing: 'write' } });

    expect(response.status).toBe(400);
    expect(memberService.updatePermissions).not.toHaveBeenCalled();
  });

  test('rejects an unsupported invitation role', async () => {
    const response = await request(app)
      .post('/api/team/invitations')
      .send({ email: 'new@example.com', role: 'owner' });
    expect(response.status).toBe(400);
    expect(invitationService.createInvitation).not.toHaveBeenCalled();
  });

  test('resends and revokes tenant invitations', async () => {
    invitationService.resendInvitation.mockResolvedValue({ id: 'invite-1' });
    expect((await request(app).post(`/api/team/invitations/${invitationId}/resend`)).status).toBe(200);
    expect((await request(app).delete(`/api/team/invitations/${invitationId}`)).status).toBe(200);
    expect(invitationService.resendInvitation).toHaveBeenCalledWith(expect.objectContaining({
      invitationId,
      tenant,
    }));
    expect(invitationService.revokeInvitation).toHaveBeenCalledWith(expect.objectContaining({
      invitationId,
      tenantId: tenant.id,
    }));
  });

  test('updates a member role', async () => {
    memberService.updateRole.mockResolvedValue({ id: 'user-1', role: 'admin' });
    const response = await request(app)
      .patch(`/api/team/members/${memberId}/role`)
      .send({ role: 'admin' });

    expect(response.status).toBe(200);
    expect(memberService.updateRole).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: tenant.id,
      memberId,
      role: 'admin',
    }));
  });

  test('blocks and unblocks a member through the status route', async () => {
    memberService.setMemberStatus.mockResolvedValue({ id: 'user-1', isActive: false });
    const response = await request(app)
      .patch(`/api/team/members/${memberId}/status`)
      .send({ isActive: false });

    expect(response.status).toBe(200);
    // Le tenant complet, et non son seul identifiant : le contrôle de sièges
    // au déblocage a besoin de son forfait.
    expect(memberService.setMemberStatus).toHaveBeenCalledWith(expect.objectContaining({
      tenant: expect.objectContaining({ id: tenant.id }),
      memberId,
      isActive: false,
    }));
  });

  test('deleting a member requires the owner password', async () => {
    const rejected = await request(app).delete(`/api/team/members/${memberId}`).send({});
    expect(rejected.status).toBe(400);
    expect(memberService.deleteMember).not.toHaveBeenCalled();

    const accepted = await request(app)
      .delete(`/api/team/members/${memberId}`)
      .send({ currentPassword: 'Secret1!' });

    expect(accepted.status).toBe(200);
    expect(memberService.deleteMember).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: tenant.id,
      memberId,
      currentPassword: 'Secret1!',
    }));
  });
});
