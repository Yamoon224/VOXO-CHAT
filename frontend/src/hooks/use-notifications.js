'use client'

import { useCallback, useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { useToast } from '@/hooks/use-toast'
import { useRealtimeChannel } from '@/hooks/use-realtime-channel'
import { notificationAPI, adminNotificationAPI } from '@/lib/api-notifications'
import { ADMIN_ACCESS_TOKEN } from '@/lib/admin-auth-tokens'

export function useNotifications({ admin = false, enabled = true } = {}) {
  const { toast } = useToast()
  const api = admin ? adminNotificationAPI : notificationAPI
  const token = Cookies.get(admin ? ADMIN_ACCESS_TOKEN : 'accessToken')
  const path = admin ? '/admin/notifications/socket' : '/notifications/socket'
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const reload = useCallback(async () => {
    try { const response = await api.list(); setNotifications(response.data.notifications); setUnreadCount(response.data.unreadCount) } catch { }
  }, [api])
  useEffect(() => {
    if (!enabled) return

    let active = true

    api.list()
      .then(response => {
        if (!active) return
        setNotifications(response.data.notifications)
        setUnreadCount(response.data.unreadCount)
      })
      .catch(error => {
        console.error('Chargement des notifications impossible', error)
      })

    return () => {
      active = false
    }
  }, [api, enabled])
  useRealtimeChannel({
    path, token, enabled, onEvent: event => {
      if (event.type !== 'notification.created') return
      setNotifications(items => [event.notification, ...items])
      setUnreadCount(count => count + 1)
      toast.success(event.notification.title)
    }
  })
  const markRead = async id => { await api.markRead(id); setNotifications(items => items.map(item => item.id === id ? { ...item, readAt: new Date().toISOString() } : item)); reload() }
  const markAllRead = async () => { await api.markAllRead(); await reload() }
  return { notifications, unreadCount, markRead, markAllRead }
}
