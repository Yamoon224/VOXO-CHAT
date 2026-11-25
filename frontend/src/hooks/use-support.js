'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { supportAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import Cookies from 'js-cookie'
import { useRealtimeChannel } from '@/hooks/use-realtime-channel'

/** Demandes d'assistance de l'entreprise connectée. */
export function useSupport(enabled = true) {
  const t = useTranslations('Support')
  const { toast } = useToast()
  const [tickets, setTickets] = useState([])
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadTickets = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const response = await supportAPI.getTickets()
      setTickets(response.data.tickets)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [enabled, toast])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  useRealtimeChannel({
    path: ticket ? `/tenant/support/${ticket.id}/socket` : null,
    token: Cookies.get('accessToken'), enabled: Boolean(enabled && ticket),
    onEvent: () => { if (ticket) openTicket(ticket.id); loadTickets() },
  })

  const openTicket = async (id) => {
    setActionLoading(true)
    try {
      const response = await supportAPI.getTicket(id)
      setTicket(response.data)
      return true
    } catch (error) {
      toast.error(error.message)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  const runAction = async (action, successMessage) => {
    setActionLoading(true)
    try {
      const response = await action()
      toast.success(successMessage)
      setTicket(response.data)
      await loadTickets()
      return true
    } catch (error) {
      toast.error(error.message)
      return false
    } finally {
      setActionLoading(false)
    }
  }

  return {
    tickets,
    ticket,
    loading,
    actionLoading,
    reload: loadTickets,
    closeTicket: () => setTicket(null),
    openTicket,
    createTicket: (data) => runAction(
      () => supportAPI.createTicket(data),
      t('toastTicketCreated')
    ),
    reply: (id, content, clientMessageId) => runAction(
      () => supportAPI.reply(id, content, clientMessageId),
      t('toastMessageSent')
    ),
  }
}
