import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeEffectivePermissions,
  hasPermission,
  sanitizeOverrides,
  listGrantableLevels,
} from './permissions.mjs'

// Garde-fou anti-dérive : ces cas reproduisent ceux de
// backend/src/config/permissions.test.js. Si le backend change sa matrice sans
// que ce miroir suive, l'une des deux suites doit rougir.

const owner = { role: 'owner' }
const admin = { role: 'admin' }
const user = { role: 'user' }

test('grants everything to the owner, ignoring any override', () => {
  assert.deepEqual(computeEffectivePermissions(owner), {
    conversations: 'write', knowledge: 'write', company: 'write', analytics: 'read', agentic: 'write',
  })
  const sabotaged = { role: 'owner', permissionOverrides: { company: 'none' } }
  assert.equal(computeEffectivePermissions(sabotaged).company, 'write')
})

test('applies role presets when no override is set', () => {
  assert.deepEqual(computeEffectivePermissions(user), {
    conversations: 'write', knowledge: 'read', company: 'read', analytics: 'read', agentic: 'none',
  })
  assert.equal(computeEffectivePermissions(admin).company, 'write')
})

test('lets an override raise or lower a level within the role cap', () => {
  const promoted = { role: 'user', permissionOverrides: { knowledge: 'write' } }
  assert.equal(computeEffectivePermissions(promoted).knowledge, 'write')

  const restricted = { role: 'user', permissionOverrides: { conversations: 'none' } }
  assert.equal(computeEffectivePermissions(restricted).conversations, 'none')
})

test('caps company at read for a standard user', () => {
  const overreaching = { role: 'user', permissionOverrides: { company: 'write' } }
  assert.equal(computeEffectivePermissions(overreaching).company, 'read')
})

test('caps a demoted admin whose stale override outranks the new role', () => {
  const demoted = { role: 'user', permissionOverrides: { company: 'write', analytics: 'write' } }
  const effective = computeEffectivePermissions(demoted)
  assert.equal(effective.company, 'read')
  assert.equal(effective.analytics, 'read')
})

test('never exceeds read on analytics, whatever the role', () => {
  const greedy = { role: 'admin', permissionOverrides: { analytics: 'write' } }
  assert.equal(computeEffectivePermissions(greedy).analytics, 'read')
})

test('denies everything for an unknown or missing subject', () => {
  const none = {
    conversations: 'none', knowledge: 'none', company: 'none', analytics: 'none', agentic: 'none',
  }
  assert.deepEqual(computeEffectivePermissions(null), none)
  assert.deepEqual(computeEffectivePermissions({ role: 'ghost' }), none)
})

test('a write level satisfies a read requirement, not the reverse', () => {
  const permissions = computeEffectivePermissions(user)
  assert.equal(hasPermission(permissions, 'conversations', 'write'), true)
  assert.equal(hasPermission(permissions, 'knowledge', 'read'), true)
  assert.equal(hasPermission(permissions, 'knowledge', 'write'), false)
})

test('drops unknown resources and levels, returning a fresh object', () => {
  const raw = { knowledge: 'write', billing: 'write', company: 'superuser' }
  assert.deepEqual(sanitizeOverrides(raw), { knowledge: 'write' })
  assert.notEqual(sanitizeOverrides(raw), raw)
  assert.deepEqual(sanitizeOverrides(null), {})
})

test('offers only the levels a role can actually hold', () => {
  assert.deepEqual(listGrantableLevels('user', 'company'), ['none', 'read'])
  assert.deepEqual(listGrantableLevels('admin', 'company'), ['none', 'read', 'write'])
  assert.deepEqual(listGrantableLevels('admin', 'analytics'), ['none', 'read'])
})
