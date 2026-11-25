import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { authAPI } from '@/lib/api'
import { useLocale, useTranslations } from 'next-intl'

const INVALID_LINK_CODES = ['TOKEN_EXPIRED', 'TOKEN_INVALID']

// verifying | pending | expired
export function useVerifyEmailUI({ token, email, sent, pending }) {
  const t = useTranslations('AuthFlows')
  const locale = useLocale()
  const [status, setStatus] = useState(token ? 'verifying' : 'pending')
  const [error, setError] = useState(null)
  const [isResending, setIsResending] = useState(false)
  // `sent=0` : l'inscription a réussi mais l'email n'est jamais parti.
  const [deliveryFailed, setDeliveryFailed] = useState(sent === '0')
  // `pending=1` : l'utilisateur arrive d'une inscription refusée parce qu'un
  // compte non confirmé existait déjà. Aucun email ne vient d'être envoyé.
  const [alreadyPending, setAlreadyPending] = useState(pending === '1')
  const hasVerified = useRef(false)
  const router = useRouter()
  const { toast } = useToast()
  const { verifyEmail } = useAuth()

  useEffect(() => {
    // Le jeton est à usage unique : ne jamais le consommer deux fois,
    // même si React remonte le composant en mode strict.
    if (!token || hasVerified.current) return
    hasVerified.current = true

    verifyEmail(token).then((result) => {
      if (result.success) {
        toast.success(t('verifySuccess'))
        router.push(`/${locale}/dashboard`)
        return
      }
      setError(result.error)
      setStatus(INVALID_LINK_CODES.includes(result.code) ? 'expired' : 'pending')
      toast.error(result.error)
    })
  }, [token, verifyEmail, router, toast, t, locale])

  const resend = useCallback(async () => {
    if (!email) {
      const message = t('unknownEmail')
      setError(message)
      toast.error(message)
      return
    }

    setIsResending(true)
    try {
      await authAPI.resendVerification(email)
      setError(null)
      setDeliveryFailed(false)
      setAlreadyPending(false)
      setStatus('pending')
      toast.success(t('resendSuccess'))
    } catch (requestError) {
      const message = requestError.message || t('sendFailed')
      // Le backend distingue la panne du fournisseur d'un compte introuvable :
      // seul le premier cas remonte, et il doit rester visible à l'écran.
      if (requestError.code === 'EMAIL_SEND_FAILED') setDeliveryFailed(true)
      setError(message)
      toast.error(message)
    } finally {
      setIsResending(false)
    }
  }, [email, toast, t])

  return { status, error, email, isResending, deliveryFailed, alreadyPending, resend }
}
