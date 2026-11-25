'use client'

import { Badge } from '@/components/ui/badge'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Progress } from '@/components/ui/progress'
import { useLocale, useTranslations } from 'next-intl'

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right break-all">{value ?? '—'}</span>
    </div>
  )
}

function UsageBar({ label, usage, unlimitedLabel }) {
  const percent = usage.unlimited || !usage.limit
    ? 0
    : Math.min(Math.round((usage.used / usage.limit) * 100), 100)

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">
          {usage.unlimited ? `${usage.used} · ${unlimitedLabel}` : `${usage.used} / ${usage.limit}`}
        </span>
      </div>
      {!usage.unlimited && <Progress value={percent} />}
    </div>
  )
}

function ChannelRow({ label, connected, active, detail, t }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
      </div>
      {!connected
        ? <Badge variant="outline" className="text-xs">{t('notConfigured')}</Badge>
        : <Badge variant={active ? 'secondary' : 'outline'} className="text-xs">
            {active ? t('activeOne') : t('disconnected')}
          </Badge>}
    </div>
  )
}

export function TenantDetailCards({ tenant }) {
  const t = useTranslations('AdminTenants')
  const locale = useLocale()
  const dateLocale = locale === 'en' ? 'en-US' : 'fr-FR'
  const { owner, usage, quotas, channels, features } = tenant

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SurfaceCard>
        <CardHeader><CardTitle className="text-base">{t('identity')}</CardTitle></CardHeader>
        <CardContent className="divide-y">
          <Row label={t('name')} value={tenant.name} />
          <Row label={t('subdomain')} value={tenant.subdomain} />
          <Row label={t('domain')} value={tenant.domain} />
          {/* Le forfait affiché est celui EFFECTIVEMENT appliqué : `quotas.plan`
              tient compte d'une échéance dépassée, contrairement à la colonne. */}
          <Row label={t('plan')} value={quotas.plan} />
          <Row
            label={t('expiry')}
            value={tenant.subscriptionExpiresAt
              ? new Date(tenant.subscriptionExpiresAt).toLocaleDateString(dateLocale)
              : t('noExpiry')}
          />
          <Row
            label={t('registeredOn')}
            value={tenant.createdAt
              ? new Date(tenant.createdAt).toLocaleDateString(dateLocale)
              : null}
          />
        </CardContent>
      </SurfaceCard>

      <SurfaceCard>
        <CardHeader><CardTitle className="text-base">{t('owner')}</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {owner ? (
            <>
              <Row label={t('name')} value={`${owner.firstName} ${owner.lastName}`} />
              <Row label="Email" value={owner.email} />
              <Row label={t('account')} value={owner.isActive ? t('activeOne') : t('blockedOne')} />
              <Row
                label={t('lastLogin')}
                value={owner.lastLoginAt
                  ? new Date(owner.lastLoginAt).toLocaleString(dateLocale)
                  : t('never')}
              />
            </>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">
              {t('noOwner')}
            </p>
          )}
        </CardContent>
      </SurfaceCard>

      <SurfaceCard>
        <CardHeader><CardTitle className="text-base">{t('usage')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <UsageBar label={t('periodMessages', { period: quotas.periodKey })} usage={quotas.messages} unlimitedLabel={t('unlimited')} />
          <UsageBar label={t('dailyMessages', { day: quotas.dayKey })} usage={quotas.messagesDaily} unlimitedLabel={t('unlimited')} />
          <UsageBar label={t('activeDocuments')} usage={quotas.documents} unlimitedLabel={t('unlimited')} />
          {/* Sièges = membres actifs + invitations en attente. */}
          <UsageBar label={t('users')} usage={quotas.members} unlimitedLabel={t('unlimited')} />
          <div className="divide-y border-t pt-2">
            <Row label={t('members')} value={usage.membersCount} />
            <Row label={t('documents')} value={usage.knowledgeCount} />
            <Row label={t('conversations')} value={usage.conversationsCount} />
          </div>
        </CardContent>
      </SurfaceCard>

      <SurfaceCard>
        <CardHeader><CardTitle className="text-base">{t('channelsFeatures')}</CardTitle></CardHeader>
        <CardContent className="divide-y">
          <ChannelRow
            label="Telegram"
            connected={channels.telegram.botTokenConfigured}
            active={channels.telegram.webhookActive}
            detail={channels.telegram.botUsername}
            t={t}
          />
          <ChannelRow
            label="WhatsApp"
            connected={Boolean(channels.whatsapp.sessionId)}
            active={channels.whatsapp.webhookActive}
            detail={channels.whatsapp.sessionStatus}
            t={t}
          />
          <div className="flex flex-wrap gap-1.5 pt-3">
            {Object.entries(features).map(([name, enabled]) => (
              <Badge key={name} variant={enabled ? 'secondary' : 'outline'} className="text-xs">
                {name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </SurfaceCard>
    </div>
  )
}
