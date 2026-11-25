const { Op } = require('sequelize');
const { Notification } = require('../models');
const bus = require('./eventBus');
const oneSignal = require('./oneSignalService');

const channel = (recipientType, recipientId) => `notif:${recipientType}:${recipientId}`;
const view = item => ({ id: item.id, type: item.type, title: item.title, body: item.body, url: item.url, readAt: item.readAt, createdAt: item.createdAt });

async function notify(input) {
  try {
    const [item, created] = await Notification.findOrCreate({
      where: input.dedupeKey ? { recipientType: input.recipientType, recipientId: input.recipientId, dedupeKey: input.dedupeKey } : { id: input.id || require('uuid').v4() },
      defaults: input,
    });
    if (created) {
      const itemView = view(item);
      bus.publish(channel(item.recipientType, item.recipientId), { type: 'notification.created', notification: itemView });
      // Best effort : le push ne doit jamais retarder ni invalider l'événement in-app.
      oneSignal.send({ ...itemView, recipientType: item.recipientType, recipientId: item.recipientId }).catch(() => {});
    }
    return view(item);
  } catch (error) { console.error('Notification in-app \u00e9chou\u00e9e', error.message); return null; }
}

async function list(recipientType, recipientId, { unread, page = 1, limit = 20 }) {
  const where = { recipientType, recipientId, ...(unread && { readAt: null }) };
  const offset = (Math.max(Number(page), 1) - 1) * Math.min(Number(limit) || 20, 100);
  const [items, unreadCount] = await Promise.all([
    Notification.findAll({ where, order: [['createdAt', 'DESC']], limit: Math.min(Number(limit) || 20, 100), offset }),
    Notification.count({ where: { recipientType, recipientId, readAt: null } }),
  ]);
  return { notifications: items.map(view), unreadCount };
}

async function markRead(recipientType, recipientId, id) {
  await Notification.update({ readAt: new Date() }, { where: { id, recipientType, recipientId, readAt: null } });
}
async function markAllRead(recipientType, recipientId) {
  await Notification.update({ readAt: new Date() }, { where: { recipientType, recipientId, readAt: null } });
}
async function markTicketReadForOtherAdmins(ticketId, recipientId) {
  await Notification.update({ readAt: new Date() }, {
    where: { recipientType: 'admin', recipientId: { [Op.ne]: recipientId }, readAt: null, url: `/admin/support/${ticketId}` },
  });
}
async function purgeReadBefore(date) { return Notification.destroy({ where: { readAt: { [Op.lt]: date } } }); }

module.exports = { notify, list, markRead, markAllRead, markTicketReadForOtherAdmins, purgeReadBefore, channel };
