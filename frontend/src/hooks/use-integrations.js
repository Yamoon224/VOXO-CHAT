import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { integrationAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

export function useIntegrations() {
  const t = useTranslations('Integrations')
  const { toast } = useToast()
  const [connectors, setConnectors] = useState([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    try { const response = await integrationAPI.list(); setConnectors(response.data || []) }
    catch (error) { toast.error(error.message || t('toastLoadFailed')) }
    finally { setLoading(false) }
  }, [toast, t])
  useEffect(() => { refresh() }, [refresh])
  const save = useCallback(async data => { const response = await integrationAPI.save(data); await refresh(); toast.success(t('toastSaved')); return response.data }, [refresh, toast, t])
  const sync = useCallback(async id => { await integrationAPI.sync(id); await refresh(); toast.success(t('toastSyncDone')) }, [refresh, toast, t])
  const disconnect = useCallback(async id => { await integrationAPI.disconnect(id); await refresh(); toast.success(t('toastDisconnected')) }, [refresh, toast, t])
  const startMicrosoft = useCallback(async data => { const response = await integrationAPI.startMicrosoft(data); window.location.assign(response.data.authorizeUrl) }, [])
  return { connectors, loading, save, sync, disconnect, startMicrosoft }
}
