import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Cookies from 'js-cookie'
import { useAuth, useGuestOnly } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { createLoginSchema } from '@/lib/validations'

const SUPPORTED_LOCALES = ['fr', 'en']

export function useLoginUI() {
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('Login')
  const { toast } = useToast()
  const loginSchema = useMemo(() => createLoginSchema({
    emailRequired: t('validation.emailRequired'),
    emailInvalid: t('validation.emailInvalid'),
    passwordRequired: t('validation.passwordRequired'),
    passwordMin: t('validation.passwordMin'),
  }), [t])
  
  const { shouldRender } = useGuestOnly()
  const { login: loginUser, isLoading, error, clearError } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data) => {
    clearError()
    const result = await loginUser(data)

    if (result.success) {
      toast.success(t('success'))
      const preferredLocale = result.data?.user?.preferredLocale
      const targetLocale = SUPPORTED_LOCALES.includes(preferredLocale) ? preferredLocale : locale
      if (targetLocale !== locale) {
        Cookies.set('NEXT_LOCALE', targetLocale, { expires: 365, sameSite: 'lax' })
      }
      router.push(`/${targetLocale}/dashboard`)
    } else if (result.code === 'EMAIL_NOT_VERIFIED') {
      // Compte valide mais non confirmé : on oriente vers l'écran d'attente
      // plutôt que d'afficher une erreur d'identifiants trompeuse.
      toast.warning(t('verifyEmail'))
      router.push(`/${locale}/auth/verify-email?email=${encodeURIComponent(data.email)}`)
    } else {
      toast.error(result.error)
      if (result.error.toLowerCase().includes('email')) {
        setError('email', { message: result.error })
      } else if (result.error.toLowerCase().includes('mot de passe') || result.error.toLowerCase().includes('password')) {
        setError('password', { message: result.error })
      }
    }
  }

  return {
    shouldRender,
    isLoading,
    error,
    showPassword,
    setShowPassword,
    register,
    handleSubmit,
    errors,
    isSubmitting,
    onSubmit
  }
}
