import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth, useGuestOnly } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { registerSchema } from '@/lib/validations'
import { resolveRegisterConflict } from '@/hooks/register-conflict-actions'

// Source unique pour la validation d'étape et le filtrage des erreurs affichées.
// `subscriptionPlan` en est absent : il a une valeur par défaut et ne peut pas
// être invalide.
const STEP_FIELDS = {
  1: ['companyName', 'subdomain'],
  2: ['firstName', 'lastName', 'email', 'password', 'confirmPassword'],
}

// N'expose que les erreurs des champs de l'étape affichée : une erreur portant
// sur une étape que l'utilisateur n'a pas encore vue ne doit jamais s'afficher.
function scopeErrorsToStep(errors, step) {
  return Object.fromEntries(
    STEP_FIELDS[step].filter((name) => errors[name]).map((name) => [name, errors[name]])
  )
}

// Ramène l'utilisateur sur la première étape qui porte une erreur : signaler un
// conflit de sous-domaine depuis l'étape 2 laisse le champ fautif invisible.
function firstStepInError(fieldErrors) {
  const steps = fieldErrors
    .map(({ name }) => Number(Object.keys(STEP_FIELDS).find((step) => STEP_FIELDS[step].includes(name))))
    .filter(Boolean)

  return steps.length ? Math.min(...steps) : null
}

export function useRegisterUI() {
  const t = useTranslations('Register')
  const locale = useLocale()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const router = useRouter()
  const { toast } = useToast()

  const { shouldRender } = useGuestOnly()
  const { register: registerUser, isLoading, error, clearError } = useAuth()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    trigger,
    setError,
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      companyName: '',
      subdomain: '',
      subscriptionPlan: 'free',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data) => {
    // Garde-fou : une soumission déclenchée depuis l'étape 1 (touche Entrée,
    // bouton imprévu) ne doit pas créer le compte ni marquer l'étape 2 en erreur.
    if (currentStep !== 2) return

    clearError()
    const result = await registerUser(data)

    if (!result.success) {
      const { fieldErrors, redirect, toast: notice } = resolveRegisterConflict(result, data.email, locale, t)

      fieldErrors.forEach(({ name, message }) => setError(name, { type: 'server', message }))
      toast[notice.type](notice.message)

      if (redirect) {
        router.push(redirect)
        return
      }

      const step = firstStepInError(fieldErrors)
      if (step) setCurrentStep(step)
      return
    }

    // Le compte existe mais n'est pas encore actif : on renvoie vers l'écran
    // d'attente, qui permet aussi de relancer l'envoi si Brevo était indisponible.
    const deliveryFailed = result.data?.verificationEmailSent === false

    if (deliveryFailed) {
      toast.warning(t('deliveryFailedToast'))
    } else {
      toast.success(t('successToast'))
    }

    // `sent=0` survit au rafraîchissement, contrairement au toast : sans lui
    // l'écran d'attente annoncerait un envoi qui n'a jamais eu lieu.
    const params = new URLSearchParams({ email: data.email })
    if (deliveryFailed) params.set('sent', '0')
    router.push(`/${locale}/auth/verify-email?${params.toString()}`)
  }

  const nextStep = async () => {
    if (await trigger(STEP_FIELDS[currentStep])) {
      setCurrentStep(2)
    }
  }

  const prevStep = () => {
    setCurrentStep(1)
  }

  const subscriptionPlans = [
    {
      value: 'free',
      label: t('planFree'),
      description: t('planFreeDesc'),
      price: t('priceFree')
    },
    {
      value: 'basic',
      label: 'Basic',
      description: t('planBasicDesc'),
      price: t('priceBasic')
    },
    {
      value: 'pro',
      label: 'Pro',
      description: t('planProDesc'),
      price: t('pricePro')
    },
    {
      value: 'enterprise',
      label: 'Enterprise',
      description: t('planEnterpriseDesc'),
      price: t('priceEnterprise')
    },
  ]

  return {
    shouldRender,
    isLoading,
    error,
    currentStep,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    register,
    handleSubmit,
    control,
    errors: scopeErrorsToStep(errors, currentStep),
    isSubmitting,
    onSubmit,
    nextStep,
    prevStep,
    subscriptionPlans
  }
}
