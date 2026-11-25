const { User } = require('../models');

const nameOf = user => [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

async function findTenantAdmins(tenantId) {
  const users = await User.findAll({ where: { tenantId, isActive: true } });
  return users.filter(user => ['owner', 'admin'].includes(user.role));
}

module.exports = { findTenantAdmins, nameOf };
