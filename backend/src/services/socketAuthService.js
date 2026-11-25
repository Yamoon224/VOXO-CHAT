const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User, Tenant, AdminUser, AdminRole } = require('../models');

function tokenFromRequest(request) {
  const values = String(request.headers['sec-websocket-protocol'] || '').split(',').map(value => value.trim());
  return values[0] === 'bearer' ? values[1] : null;
}

async function resolveTenant(request) {
  const token = tokenFromRequest(request);
  if (!token) return null;
  const decoded = jwt.verify(token, config.jwt.secret);
  if (decoded.scope === 'admin' || decoded.type === 'refresh') return null;
  const user = await User.findOne({ where: { id: decoded.id, isActive: true }, include: [{ model: Tenant, as: 'tenant', where: { isActive: true } }] });
  return user ? { user, expiresAt: decoded.exp * 1000 } : null;
}

async function resolveAdmin(request) {
  const token = tokenFromRequest(request);
  if (!token) return null;
  const decoded = jwt.verify(token, config.jwt.secret);
  if (decoded.scope !== 'admin' || decoded.type === 'refresh') return null;
  const admin = await AdminUser.findOne({ where: { id: decoded.id, isActive: true }, include: [{ model: AdminRole, as: 'role' }] });
  return admin ? { admin, expiresAt: decoded.exp * 1000 } : null;
}

module.exports = { resolveTenant, resolveAdmin };
