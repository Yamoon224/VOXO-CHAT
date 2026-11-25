import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useToast } from '@/hooks/use-toast'
import { createResetPasswordSchema } from '@/lib/validations'
import { authAPI } from '@/lib/api'
import { useLocale, useTranslations } from 'next-intl'

const EXPIRED_CODES = ['TOKEN_EXPIRED', 'TOKEN_INVALID']

export function useResetPasswordUI(token) {
  const t = useTranslations('AuthFlows')
  const locale = useLocale()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [isLinkExpired, setIsLinkExpired] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createResetPasswordSchema({
      passwordRules: t('passwordRules'), confirmationRequired: t('requiredConfirmation'),
      passwordMismatch: t('passwordMismatch'),
    })),
    defaultValues: { newPassword: '', confirmNewPassword: '' },
  })

  const onSubmit = async (data) => {
    setError(null)
    try {
      await authAPI.resetPassword({ token, ...data })
      toast.success(t('resetSuccessToast'))
      router.push(`/${locale}/auth/login`)
    } catch (requestError) {
      const message = requestError.message || t('resetErrorToast')
      if (EXPIRED_CODES.includes(requestError.code)) setIsLinkExpired(true)
      setError(message)
      toast.error(message)
    }
  }

  return {
    hasToken: Boolean(token),
    isLinkExpired,
    error,
    showPassword,
    setShowPassword,
    register,
    handleSubmit,
    errors,
    isSubmitting,
    onSubmit,
  }
}
