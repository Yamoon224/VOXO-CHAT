'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { chatAPI } from '@/lib/api'
import { attachmentErrorKey } from '@/lib/attachment-error.mjs'
import { useToast } from '@/hooks/use-toast'

export function useAttachmentPreview() {
  const t = useTranslations('Files')
  const { toast } = useToast()
  const [loadingId, setLoadingId] = useState(null)
  const [preview, setPreview] = useState(null)
  const requestInFlight = useRef(false)

  const openAttachment = async (attachment) => {
    if (requestInFlight.current) return
    requestInFlight.current = true
    setLoadingId(attachment.id)
    try {
      const response = await chatAPI.getAttachmentUrl(attachment.id)
      const url = response?.data?.url
      if (!url) throw new Error(t('attachmentUnavailable'))
      if (attachment.category === 'image' || attachment.mimeType === 'application/pdf') {
        setPreview({ attachment, url })
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      toast.error(t(attachmentErrorKey(error)))
    } finally {
      requestInFlight.current = false
      setLoadingId(null)
    }
  }

  return { loadingId, preview, openAttachment, closePreview: () => setPreview(null) }
}
