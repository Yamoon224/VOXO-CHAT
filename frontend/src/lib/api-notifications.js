import api from '@/lib/api'
import adminClient from '@/lib/api-admin'

function create(client, prefix) {
  return {
    list: (params = {}) => client.get(prefix, { params }),
    markRead: id => client.post(`${prefix}/${id}/read`),
    markAllRead: () => client.post(`${prefix}/read-all`),
  }
}

export const notificationAPI = create(api, '/notifications')
export const adminNotificationAPI = create(adminClient, '/admin/notifications')
