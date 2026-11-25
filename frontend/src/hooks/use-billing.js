'use client'

import { useCallback, useEffect, useState } from 'react'
import { supportAPI, tenantAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

export function useBilling(enabled) {
  const { toast } = useToast()
  const [plans, setPlans] = useState([])
  const [quota, setQuota] = useState(null)
  const [pendingRequest, setPendingRequest] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [currency, setCurrency] = useState('EUR')

  const load = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const [plansResponse, quotaResponse, ticketsResponse] = await Promise.all([
        tenantAPI.getPlans(), tenantAPI.getQuota(), supportAPI.getTickets(),
      ])
      setPlans(plansResponse.data.plans)
      setCurrency(plansResponse.data.currency || 'EUR')
      setQuota(quotaResponse.data)
      setPendingRequest(ticketsResponse.data.tickets.find(ticket =>
        ticket.type === 'plan_change' && ['open', 'pending'].includes(ticket.status)) || null)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }, [enabled, toast])

  useEffect(() => { load() }, [load])

  const requestPlanChange = async (requestedPlan, note) => {
    setSubmitting(true)
    try {
      await tenantAPI.requestPlanChange({ requestedPlan, note })
      toast.success('Votre demande a été transmise à l’administrateur')
      await load()
      return true
    } catch (error) {
      toast.error(error.message)
      return false
    } finally {
      setSubmitting(false)
    }
  }

  const updateCurrency = async (nextCurrency) => {
    try { await tenantAPI.updateBillingCurrency(nextCurrency); setCurrency(nextCurrency) } catch (error) { toast.error(error.message) }
  }

  return { plans, quota, pendingRequest, loading, submitting, currency, updateCurrency, requestPlanChange }
}
