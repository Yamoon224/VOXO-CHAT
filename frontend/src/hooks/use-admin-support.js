'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminSupportAPI } from '@/lib/api-admin'
import { useToast } from '@/hooks/use-toast'
import Cookies from 'js-cookie'
import { ADMIN_ACCESS_TOKEN } from '@/lib/admin-auth-tokens'
import { useRealtimeChannel } from '@/hooks/use-realtime-channel'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

/** Boîte de réception du support, côté plateforme. */
export function useAdminSupport(enabled) {
  const { toast } = useToast()
  const [tickets, setTickets] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [filters, setFilters] = useState({
    page: 1, status: 'open', priority: '', reason: '', assignedToMe: false,
  })
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)

  const loadTickets = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const response = await adminSupportAPI.getTickets(filters)
      setTickets(response.data.tickets)
      setPagination(response.data.pagination)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [enabled, filters, toast])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])
  const loadStats = useCallback(async () => {
    if (!enabled) return
    try { const response = await adminSupportAPI.getStats(); setStats(response.data.stats) } catch (error) { toast.error(error.message) }
  }, [enabled, toast])
  useEffect(() => { loadStats() }, [loadStats])
  const autoRefresh = useAutoRefresh(loadTickets, 30000, { enabled, blocked: loading })

  const assign = async (ticketId) => {
    try {
      await adminSupportAPI.assign(ticketId)
      toast.success('Demande attribuée')
      await loadTickets()
    } catch (error) { toast.error(error.message) }
  }

  return { tickets, pagination, filters, setFilters, loading, stats, reload: loadTickets, assign, ...autoRefresh }
}

/** Fil d'une demande, côté plateforme : les notes internes y sont visibles. */
export function useAdminSupportTicket(ticketId, enabled) {
  const { toast } = useToast()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadTicket = useCallback(async () => {
    if (!enabled || !ticketId) return
    setLoading(true)
    try {
      const response = await adminSupportAPI.getTicket(ticketId)
      setTicket(response.data)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [enabled, ticketId, toast])

  useEffect(() => {
    loadTicket()
  }, [loadTicket])

  useRealtimeChannel({
    path: ticketId ? `/admin/support/${ticketId}/socket` : null,
    token: Cookies.get(ADMIN_ACCESS_TOKEN), enabled: Boolean(enabled && ticketId),
    onEvent: loadTicket,
  })

  const runAction = async (action, successMessage) => {
    setActionLoading(true)
    try {
      const response = await action()
      toast.success(successMessage)
      setTicket(response.data)
      return true
    } catch (error) {
      toast.error(error.message)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  return {
    ticket,
    loading,
    actionLoading,
    reload: loadTicket,
    assign: () => runAction(
      () => adminSupportAPI.assign(ticketId),
      'Demande prise en charge'
    ),
    release: () => runAction(
      () => adminSupportAPI.release(ticketId),
      'Demande libérée'
    ),
    setStatus: (status) => runAction(
      () => adminSupportAPI.setStatus(ticketId, status),
      'Statut mis à jour'
    ),
    approvePlanChange: (subscriptionExpiresAt) => runAction(
      () => adminSupportAPI.approvePlanChange(ticketId, subscriptionExpiresAt),
      'Forfait approuvé avec succès'
    ),
    reply: (content, internal, clientMessageId) => runAction(
      () => adminSupportAPI.reply(ticketId, content, internal, clientMessageId),
      internal ? 'Note enregistrée' : 'Réponse envoyée'
    ),
  }
}
