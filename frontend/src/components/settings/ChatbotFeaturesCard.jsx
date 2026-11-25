import { Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useTranslations } from 'next-intl'

function Feature({ title, description, children }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <Label className="font-medium">{title}</Label>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>
      {children}
    </div>
  )
}

export function ChatbotFeaturesCard({ settings, updateSetting, tenant }) {
  const t = useTranslations('ChatbotSettings')
  return (
    <SurfaceCard>
      <CardHeader>
        <CardTitle className="flex items-center"><Zap className="mr-2 h-5 w-5" />{t('featuresTitle')}</CardTitle>
        <CardDescription>{t('featuresDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6">
          <Feature title={t('leadGeneration')} description={t('leadGenerationDescription')}>
            <div className="flex items-center space-x-3">
              <Switch checked={settings.features.leadGeneration} onCheckedChange={checked => updateSetting('features.leadGeneration', checked)} disabled={tenant?.subscriptionPlan === 'free'} />
              {tenant?.subscriptionPlan === 'free' && <Badge variant="outline" className="bg-yellow-50 text-yellow-700">{t('proRequired')}</Badge>}
            </div>
          </Feature>
          <Feature title={t('attachments')} description={t('attachmentsDescription')}>
            <Switch checked={settings.options?.features?.attachments ?? false} onCheckedChange={checked => updateSetting('options.features.attachments', checked)} aria-label={t('attachments')} />
          </Feature>
          <Feature title={t('liveTyping')} description={t('liveTypingDescription')}>
            <Switch checked={settings.options?.features?.liveTypingPreview ?? false} onCheckedChange={checked => updateSetting('options.features.liveTypingPreview', checked)} aria-label={t('liveTyping')} />
          </Feature>
          <Feature title={t('analytics')} description={t('analyticsDescription')}>
            <Switch checked={settings.features.analytics} onCheckedChange={checked => updateSetting('features.analytics', checked)} />
          </Feature>
          <Feature title={t('suggestions')} description={t('suggestionsDescription')}>
            <Switch checked={settings.features.autoResponseSuggestions} onCheckedChange={checked => updateSetting('features.autoResponseSuggestions', checked)} />
          </Feature>
          <Feature title={t('branding')} description={t('brandingDescription')}>
            <div className="flex items-center space-x-3">
              <Switch checked={settings.features.customBranding} onCheckedChange={checked => updateSetting('features.customBranding', checked)} disabled={tenant?.subscriptionPlan !== 'enterprise'} />
              {tenant?.subscriptionPlan !== 'enterprise' && <Badge variant="outline" className="bg-purple-50 text-purple-700">{t('enterpriseRequired')}</Badge>}
            </div>
          </Feature>
        </div>
      </CardContent>
    </SurfaceCard>
  )
}
