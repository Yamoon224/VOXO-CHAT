import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canDeleteMember,
  canManageInvitation,
  canManageMember,
  canUpdateRole,
} from './team-permissions.mjs'

const owner = { id: 'owner', role: 'owner' }
const admin = { id: 'admin', role: 'admin' }
const user = { id: 'user', role: 'user' }

test('owner manages admins and users but not itself', () => {
  assert.equal(canManageMember(owner, admin), true)
  assert.equal(canManageMember(owner, user), true)
  assert.equal(canManageMember(owner, owner), false)
})

test('admin blocks users only', () => {
  assert.equal(canManageMember(admin, user), true)
  assert.equal(canManageMember(admin, { id: 'other', role: 'admin' }), false)
  assert.equal(canManageInvitation(admin, { role: 'user' }), true)
  assert.equal(canManageInvitation(admin, { role: 'admin' }), false)
})

test('role changes are reserved to the owner', () => {
  assert.equal(canUpdateRole(owner, admin), true)
  assert.equal(canUpdateRole(owner, user), true)
  assert.equal(canUpdateRole(admin, user), false)
  assert.equal(canUpdateRole(owner, owner), false)
})

test('deletion is reserved to the owner', () => {
  assert.equal(canDeleteMember(owner, admin), true)
  assert.equal(canDeleteMember(owner, user), true)
  assert.equal(canDeleteMember(admin, user), false)
  // Le propriétaire passe par « Supprimer mon compte », qui gère le transfert.
  assert.equal(canDeleteMember(owner, owner), false)
})
