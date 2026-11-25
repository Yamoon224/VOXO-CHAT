'use client'

import { useCallback, useEffect, useState } from 'react'
import { authAPI } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'

/**
 * Pilote la suppression du compte courant.
 *
 * Le preview est rechargé à chaque ouverture du dialog : l'équipe a pu changer
 * depuis le dernier affichage, et c'est lui qui décide si un transfert de
 * propriété est exigé ou si l'entreprise entière disparaît.
 */
export function useAccountDeletion(open) {
  const { deleteAccount } = useAuth()
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const loadPreview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await authAPI.getDeletionPreview()
      setPreview(response.data)
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    loadPreview()
  }, [open, loadPreview])

  const submit = async (payload) => {
    setSubmitting(true)
    setError(null)
    const result = await deleteAccount(payload)
    if (!result.success) setError(result.error)
    setSubmitting(false)
    return result
  }

  return { preview, loading, submitting, error, setError, submit }
}
