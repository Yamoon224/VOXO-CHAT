const { Tenant } = require('../models');
const planService = require('./planService');
const notifications = require('./notificationService');
const { findTenantAdmins } = require('./tenantNotificationRecipients');

async function notifyMessageThreshold(tenantId, used, periodKey) {
  try {
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return;
    const limits = await planService.getLimits(tenant.subscriptionPlan);
    const limit = limits.messagesPerMonth;
    if (!Number.isFinite(limit) || limit <= 0) return;
    const threshold = used >= limit ? 100 : (used / limit >= 0.8 ? 80 : null);
    if (!threshold) return;
    const recipients = await findTenantAdmins(tenantId);
    await Promise.all(recipients.map(user => notifications.notify({
      recipientType: 'user', recipientId: user.id, tenantId, type: 'quota.threshold',
      title: `Quota de messages ${threshold}%`, body: `${used} messages utilis\u00e9s sur ${limit}`,
      url: '/dashboard/settings', dedupeKey: `quota:message:${threshold}:${periodKey}`,
    })));
  } catch (error) { console.error('Notification quota \u00e9chou\u00e9e', error.message); }
}

module.exports = { notifyMessageThreshold };
