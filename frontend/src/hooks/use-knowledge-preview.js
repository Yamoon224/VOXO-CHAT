'use client'

import { useEffect, useState } from 'react'
import { knowledgeAPI } from '@/lib/api-knowledge'

export function useKnowledgePreview(item, open) {
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let active = true
    setPreview(null)
    setError(null)
    if (!open || !item?.id || item.sourceType !== 'upload' || !item.metadata?.storage?.available) {
      return () => { active = false }
    }
    knowledgeAPI.getOriginalFileUrl(item.id)
      .then(response => { if (active) setPreview(response.data) })
      .catch(requestError => { if (active) setError(requestError.message) })
    return () => { active = false }
  }, [item?.id, item?.metadata?.storage?.available, item?.sourceType, open])
  return { preview, error }
}
