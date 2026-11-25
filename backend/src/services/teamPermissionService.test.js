const service = require('./teamPermissionService');

describe('teamPermissionService', () => {
  const owner = { id: 'owner', role: 'owner' };
  const admin = { id: 'admin', role: 'admin' };
  const user = { id: 'user', role: 'user' };

  test('allows an owner to assign admin or user roles', () => {
    expect(() => service.assertCanInvite(owner, 'admin')).not.toThrow();
    expect(() => service.assertCanInvite(owner, 'user')).not.toThrow();
  });

  test('allows an admin to manage users only', () => {
    expect(() => service.assertCanInvite(admin, 'user')).not.toThrow();
    expect(() => service.assertCanInvite(admin, 'admin')).toThrow(expect.objectContaining({
      code: 'ROLE_ASSIGNMENT_DENIED',
    }));
    expect(() => service.assertCanManageMember(admin, user)).not.toThrow();
    expect(() => service.assertCanManageMember(admin, { id: 'other-admin', role: 'admin' }))
      .toThrow(expect.objectContaining({ code: 'MEMBER_MANAGEMENT_DENIED' }));
  });

  test('protects the owner and self-management', () => {
    expect(() => service.assertCanManageMember(admin, owner))
      .toThrow(expect.objectContaining({ code: 'OWNER_PROTECTED' }));
    expect(() => service.assertCanManageMember(admin, admin))
      .toThrow(expect.objectContaining({ code: 'SELF_MANAGEMENT_DENIED' }));
  });

  test('denies team management to standard users', () => {
    expect(() => service.assertCanManageTeam(user))
      .toThrow(expect.objectContaining({ code: 'TEAM_ACCESS_DENIED' }));
  });

  describe('role changes are reserved to the owner', () => {
    test('the owner promotes and demotes', () => {
      expect(() => service.assertCanUpdateRole(owner, user, 'admin')).not.toThrow();
      expect(() => service.assertCanUpdateRole(owner, { id: 'a2', role: 'admin' }, 'user'))
        .not.toThrow();
    });

    test('an admin cannot change any role, even for a user', () => {
      expect(() => service.assertCanUpdateRole(admin, user, 'admin'))
        .toThrow(expect.objectContaining({ code: 'ROLE_ASSIGNMENT_DENIED' }));
    });

    test('the owner role can never be assigned nor taken away', () => {
      expect(() => service.assertCanUpdateRole(owner, user, 'owner'))
        .toThrow(expect.objectContaining({ code: 'ROLE_ASSIGNMENT_DENIED' }));
      expect(() => service.assertCanUpdateRole(owner, { id: 'o2', role: 'owner' }, 'admin'))
        .toThrow(expect.objectContaining({ code: 'OWNER_PROTECTED' }));
    });
  });

  describe('deletion is reserved to the owner', () => {
    test('the owner deletes admins and users', () => {
      expect(() => service.assertCanDeleteMember(owner, user)).not.toThrow();
      expect(() => service.assertCanDeleteMember(owner, admin)).not.toThrow();
    });

    test('an admin cannot delete anyone', () => {
      expect(() => service.assertCanDeleteMember(admin, user))
        .toThrow(expect.objectContaining({ code: 'MEMBER_DELETION_DENIED' }));
    });

    // Le départ du propriétaire implique un transfert de propriété : il passe
    // par la suppression de compte, pas par la route équipe.
    test('the owner is redirected to the account deletion flow for themselves', () => {
      expect(() => service.assertCanDeleteMember(owner, owner))
        .toThrow(expect.objectContaining({ code: 'SELF_MANAGEMENT_DENIED' }));
    });
  });

  test('blocking stays open to admins, on users only', () => {
    expect(() => service.assertCanManageMember(owner, admin)).not.toThrow();
    expect(() => service.assertCanManageMember(admin, user)).not.toThrow();
    expect(() => service.assertCanManageMember(admin, { id: 'a2', role: 'admin' }))
      .toThrow(expect.objectContaining({ code: 'MEMBER_MANAGEMENT_DENIED' }));
  });

  describe('access changes are reserved to the owner', () => {
    test('the owner adjusts the access of admins and users', () => {
      expect(() => service.assertCanUpdatePermissions(owner, user)).not.toThrow();
      expect(() => service.assertCanUpdatePermissions(owner, admin)).not.toThrow();
    });

    test('an admin cannot adjust anyone, not even a user', () => {
      expect(() => service.assertCanUpdatePermissions(admin, user))
        .toThrow(expect.objectContaining({ code: 'PERMISSION_ASSIGNMENT_DENIED' }));
    });

    test('the owner cannot be restricted, nor restrict themselves', () => {
      expect(() => service.assertCanUpdatePermissions(owner, { id: 'o2', role: 'owner' }))
        .toThrow(expect.objectContaining({ code: 'OWNER_PROTECTED' }));
      expect(() => service.assertCanUpdatePermissions(owner, owner))
        .toThrow(expect.objectContaining({ code: 'SELF_MANAGEMENT_DENIED' }));
    });
  });

  describe('access assignment at invitation time', () => {
    test('the owner may customise, the admin may only use the preset', () => {
      expect(() => service.assertCanAssignPermissions(owner, 'user', { knowledge: 'write' }))
        .not.toThrow();
      expect(() => service.assertCanAssignPermissions(admin, 'user', {})).not.toThrow();
      expect(() => service.assertCanAssignPermissions(admin, 'user', { knowledge: 'write' }))
        .toThrow(expect.objectContaining({ code: 'PERMISSION_ASSIGNMENT_DENIED' }));
    });

    test('refuses a level the target role could never hold', () => {
      expect(() => service.assertCanAssignPermissions(owner, 'user', { company: 'write' }))
        .toThrow(expect.objectContaining({ code: 'PERMISSION_LEVEL_DENIED' }));
      expect(() => service.assertCanAssignPermissions(owner, 'admin', { company: 'write' }))
        .not.toThrow();
    });
  });
});
