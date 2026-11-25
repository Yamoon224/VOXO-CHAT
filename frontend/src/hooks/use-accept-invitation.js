'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { teamAPI } from '@/lib/api'
import { acceptInvitationSchema } from '@/lib/validations'
import { useLocale, useTranslations } from 'next-intl'

export function useAcceptInvitation(tenantId, token) {
  const t = useTranslations('AuthFlows')
  const locale = useLocale()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  })

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!tenantId || !token) {
      setError(t('invalidInvitation'))
      return
    }
    const validation = acceptInvitationSchema.safeParse(form)
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || t('invalidForm'))
      return
    }
    setLoading(true)
    try {
      await teamAPI.acceptInvitation({ tenantId, token, ...validation.data })
      router.push(`/${locale}/auth/login?invitation=accepted`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return { form, updateField, submit, loading, error }
}
