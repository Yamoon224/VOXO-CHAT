import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { tenantAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

export function useConversationExportSettings(canManage) {
  const t = useTranslations('Conversations')
  const { toast } = useToast()
  const [recipients, setRecipients] = useState([])
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!canManage) return
    tenantAPI.getConversationExportSettings().then(response => setRecipients(response.data?.allowedRecipients || [])).catch(() => {})
  }, [canManage])
  const saveRecipients = async items => {
    try {
      setSaving(true)
      const response = await tenantAPI.updateConversationExportSettings(items)
      setRecipients(response.data?.allowedRecipients || [])
      toast.success(t('toastRecipientsUpdated'))
    } catch (error) {
      toast.error(error.message || t('toastRecipientsFailed'))
    } finally { setSaving(false) }
  }
  return { recipients, saving, saveRecipients }
}
