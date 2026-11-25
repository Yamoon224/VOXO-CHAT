import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useGuestOnly } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { createForgotPasswordSchema } from '@/lib/validations'
import { authAPI } from '@/lib/api'
import { useTranslations } from 'next-intl'

export function useForgotPasswordUI() {
  const t = useTranslations('AuthFlows')
  const [submittedEmail, setSubmittedEmail] = useState(null)
  const [error, setError] = useState(null)
  const { toast } = useToast()
  const { shouldRender } = useGuestOnly()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createForgotPasswordSchema({
      emailRequired: t('requiredEmail'), emailInvalid: t('emailInvalid'),
    })),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data) => {
    setError(null)
    try {
      await authAPI.forgotPassword(data.email)
      setSubmittedEmail(data.email)
      toast.success(t('forgotSuccessToast'))
    } catch (requestError) {
      const message = requestError.message || t('forgotErrorToast')
      setError(message)
      toast.error(message)
    }
  }

  return {
    shouldRender,
    submittedEmail,
    error,
    register,
    handleSubmit,
    errors,
    isSubmitting,
    onSubmit,
  }
}
