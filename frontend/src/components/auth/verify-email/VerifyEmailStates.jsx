import { Loader2, MailCheck, AlertTriangle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTranslations } from 'next-intl'

export function VerifyingState() {
  const t = useTranslations('AuthFlows')
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-600">{t('verifying')}</p>
      </CardContent>
    </Card>
  )
}

function ResendButton({ isResending, onResend, label }) {
  const t = useTranslations('AuthFlows')
  return (
    <Button className="w-full" variant="outline" onClick={onResend} disabled={isResending}>
      {isResending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('sending')}
        </>
      ) : (
        <>
          <Send className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  )
}

// Trois entrées possibles sur cet écran : l'envoi vient d'avoir lieu, il a
// échoué, ou l'utilisateur a retenté une inscription déjà en attente. Annoncer
// un envoi qui n'a pas eu lieu enverrait chercher un email inexistant.
const PENDING_VARIANTS = {
  sent: {
    accent: 'bg-blue-100',
    title: 'verifyInbox', description: 'verifySent', generic: 'verifySentGeneric', hint: 'verifyHint',
  },
  failed: {
    accent: 'bg-amber-100',
    title: 'verifyFailed', description: 'verifyFailedDescription', hint: 'verifyFailedHint',
  },
  existing: {
    accent: 'bg-amber-100',
    title: 'verifyExisting', description: 'verifyExistingDescription', generic: 'verifyExistingGeneric', hint: 'verifyExistingHint',
  },
}

function pendingVariant({ deliveryFailed, alreadyPending }) {
  if (deliveryFailed) return PENDING_VARIANTS.failed
  if (alreadyPending) return PENDING_VARIANTS.existing
  return PENDING_VARIANTS.sent
}

export function PendingState({ email, error, isResending, deliveryFailed, alreadyPending, onResend }) {
  const t = useTranslations('AuthFlows')
  const variant = pendingVariant({ deliveryFailed, alreadyPending })
  const isNeutral = variant === PENDING_VARIANTS.sent

  return (
    <Card>
      <CardHeader>
        <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full ${variant.accent}`}>
          {isNeutral
            ? <MailCheck className="h-6 w-6 text-blue-600" />
            : <AlertTriangle className="h-6 w-6 text-amber-600" />}
        </div>
        <CardTitle>{t(variant.title)}</CardTitle>
        <CardDescription>{email ? t(variant.description, { email }) : t(variant.generic || variant.description)}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-gray-600">{t(variant.hint)}</p>
      </CardContent>

      <CardFooter>
        <ResendButton isResending={isResending} onResend={onResend} label={t('resend')} />
      </CardFooter>
    </Card>
  )
}

export function ExpiredState({ error, isResending, onResend }) {
  const t = useTranslations('AuthFlows')
  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        <CardTitle>{t('invalidLink')}</CardTitle>
        <CardDescription>{error}</CardDescription>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-gray-600">
          {t('verifyExpiredHint')}
        </p>
      </CardContent>

      <CardFooter>
        <ResendButton isResending={isResending} onResend={onResend} label={t('newVerifyLink')} />
      </CardFooter>
    </Card>
  )
}
