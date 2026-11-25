const notifications = require('../services/notificationService');
const { successResponse } = require('../utils/responseUtils');

function identity(req) {
  return req.adminUser
    ? { recipientType: 'admin', recipientId: req.adminUser.id }
    : { recipientType: 'user', recipientId: req.user.id };
}

async function list(req, res, next) {
  try { successResponse(res, await notifications.list(...Object.values(identity(req)), req.query), 'Notifications rÃ©cupÃ©rÃ©es'); } catch (error) { next(error); }
}
async function markRead(req, res, next) {
  try { await notifications.markRead(...Object.values(identity(req)), req.params.id); successResponse(res, null, 'Notification marquÃ©e comme lue'); } catch (error) { next(error); }
}
async function markAllRead(req, res, next) {
  try { await notifications.markAllRead(...Object.values(identity(req))); successResponse(res, null, 'Notifications marquÃ©es comme lues'); } catch (error) { next(error); }
}

module.exports = { list, markRead, markAllRead };
