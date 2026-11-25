import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/hooks/use-toast'
import { buildIntegrationSnippet } from '@shared/integration-snippet.mjs'

export function useIntegration(tenant, chatbotSettings) {
  const t = useTranslations('Integration')
  const { toast } = useToast()
  const [integrationMethod, setIntegrationMethod] = useState('script')
  const [devicePreview, setDevicePreview] = useState('desktop')
  const [copyStates, setCopyStates] = useState({ script: false, html: false, config: false, flutter: false, main: false })
  const generateIntegrationCode = (method = integrationMethod) => buildIntegrationSnippet({ apiUrl: process.env.NEXT_PUBLIC_API_URL, tenantId: tenant?.id, chatbot: chatbotSettings, variant: method })
  const copyToClipboard = async (content, type) => {
    if (!content) return toast.error(t('toastNoBackendUrl'))
    try {
      await navigator.clipboard.writeText(content)
      setCopyStates(prev => ({ ...prev, [type]: true }))
      toast.success(t('toastCodeCopied'))
      setTimeout(() => setCopyStates(prev => ({ ...prev, [type]: false })), 2000)
    } catch (error) { toast.error(t('toastCopyError', { message: error.message })) }
  }
  return { integrationMethod, setIntegrationMethod, devicePreview, setDevicePreview, copyStates, generateIntegrationCode, copyToClipboard }
}
