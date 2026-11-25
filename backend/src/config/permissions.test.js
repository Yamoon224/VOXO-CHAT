const {
  computeEffectivePermissions,
  hasPermission,
  sanitizeOverrides,
  listGrantableLevels,
  isLevelGrantable,
  findUngrantableLevel,
} = require('./permissions');

describe('permissions', () => {
  const owner = { role: 'owner' };
  const admin = { role: 'admin' };
  const user = { role: 'user' };

  describe('computeEffectivePermissions', () => {
    test('grants everything to the owner, ignoring any override', () => {
      expect(computeEffectivePermissions(owner)).toEqual({
        conversations: 'write',
        knowledge: 'write',
        company: 'write',
        analytics: 'read',
        agentic: 'write',
      });
      const sabotaged = { role: 'owner', permissionOverrides: { company: 'none' } };
      expect(computeEffectivePermissions(sabotaged).company).toBe('write');
    });

    test('applies role presets when no override is set', () => {
      expect(computeEffectivePermissions(user)).toEqual({
        conversations: 'write',
        knowledge: 'read',
        company: 'read',
        analytics: 'read',
        agentic: 'none',
      });
      expect(computeEffectivePermissions(admin).company).toBe('write');
    });

    test('lets an override raise a level within the role cap', () => {
      const promoted = { role: 'user', permissionOverrides: { knowledge: 'write' } };
      expect(computeEffectivePermissions(promoted).knowledge).toBe('write');
    });

    test('lets an override lower a level below the preset', () => {
      const restricted = { role: 'user', permissionOverrides: { conversations: 'none' } };
      expect(computeEffectivePermissions(restricted).conversations).toBe('none');
    });

    test('caps company at read for a standard user', () => {
      const overreaching = { role: 'user', permissionOverrides: { company: 'write' } };
      expect(computeEffectivePermissions(overreaching).company).toBe('read');
    });

    test('caps a demoted admin whose stale override outranks the new role', () => {
      const demoted = { role: 'user', permissionOverrides: { company: 'write', analytics: 'write' } };
      const effective = computeEffectivePermissions(demoted);
      expect(effective.company).toBe('read');
      expect(effective.analytics).toBe('read');
    });

    test('never exceeds read on analytics, whatever the role', () => {
      const greedy = { role: 'admin', permissionOverrides: { analytics: 'write' } };
      expect(computeEffectivePermissions(greedy).analytics).toBe('read');
    });

    test('denies everything for an unknown or missing subject', () => {
      const none = { conversations: 'none', knowledge: 'none', company: 'none', analytics: 'none', agentic: 'none' };
      expect(computeEffectivePermissions(null)).toEqual(none);
      expect(computeEffectivePermissions({ role: 'ghost' })).toEqual(none);
    });
  });

  describe('hasPermission', () => {
    test('satisfies a read requirement with a write level', () => {
      expect(hasPermission(user, 'conversations', 'read')).toBe(true);
      expect(hasPermission(user, 'conversations', 'write')).toBe(true);
    });

    test('rejects a write requirement held only in read', () => {
      expect(hasPermission(user, 'knowledge', 'read')).toBe(true);
      expect(hasPermission(user, 'knowledge', 'write')).toBe(false);
    });

    test('rejects everything when the resource is set to none', () => {
      const cut = { role: 'user', permissionOverrides: { company: 'none' } };
      expect(hasPermission(cut, 'company', 'read')).toBe(false);
    });
  });

  describe('sanitizeOverrides', () => {
    test('drops unknown resources and levels', () => {
      const raw = { knowledge: 'write', billing: 'write', company: 'superuser' };
      expect(sanitizeOverrides(raw)).toEqual({ knowledge: 'write' });
    });

    test('returns a fresh object so Sequelize sees the JSONB change', () => {
      const raw = { knowledge: 'write' };
      expect(sanitizeOverrides(raw)).not.toBe(raw);
    });

    test('tolerates null and non-object input', () => {
      expect(sanitizeOverrides(null)).toEqual({});
      expect(sanitizeOverrides('write')).toEqual({});
    });
  });

  describe('listGrantableLevels', () => {
    test('stops at read on company for a standard user', () => {
      expect(listGrantableLevels('user', 'company')).toEqual(['none', 'read']);
      expect(listGrantableLevels('admin', 'company')).toEqual(['none', 'read', 'write']);
    });

    test('never offers write on analytics', () => {
      expect(listGrantableLevels('admin', 'analytics')).toEqual(['none', 'read']);
    });
  });

  describe('grantability checks', () => {
    test('refuses company write for a standard user', () => {
      expect(isLevelGrantable('user', 'company', 'write')).toBe(false);
      expect(isLevelGrantable('user', 'knowledge', 'write')).toBe(true);
    });

    test('reports the first offending pair, or null when everything passes', () => {
      expect(findUngrantableLevel('user', { company: 'write' }))
        .toEqual({ resource: 'company', level: 'write' });
      expect(findUngrantableLevel('user', { knowledge: 'write' })).toBeNull();
      expect(findUngrantableLevel('user', {})).toBeNull();
    });
  });
});
