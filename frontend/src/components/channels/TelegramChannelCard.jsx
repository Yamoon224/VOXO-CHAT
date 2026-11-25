'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import {
  Bot, ExternalLink, Power, RefreshCw, Search, Send, ShieldCheck, Zap,
} from 'lucide-react'
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Raccordement Telegram.
 *
 * Le jeton saisi n'est jamais renvoyé par le backend : `botToken` est un état
 * local, initialisé depuis le statut puis conservé le temps de la saisie.
 * `displayedBotInfo` préfère le résultat d'un test fraîchement lancé au statut
 * persistant, pour que « Vérifier » ait un effet visible immédiat.
 */
export function TelegramChannelCard({ status, loading, onTest, onRegister, onDisconnect }) {
  const t = useTranslations('Channels')
  const locale = useLocale()
  const [botToken, setBotToken] = useState(status.botToken || '')
  const [botInfo, setBotInfo] = useState(null)

  const displayedBotInfo = botInfo || (status.botUsername
    ? { first_name: status.botFirstName, username: status.botUsername }
    : null)

  const handleTest = async () => {
    const result = await onTest(botToken)
    if (result?.success) setBotInfo(result.botInfo)
  }

  const handleActivate = async () => {
    const result = await onRegister(botToken)
    if (result?.success && result.data?.botInfo) setBotInfo(result.data.botInfo)
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-[#0088cc]" />
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="rounded-lg bg-[#0088cc] p-2 text-white">
              <Send className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">Telegram</CardTitle>
              <CardDescription>{t('telegramDescription')}</CardDescription>
            </div>
          </div>
          <Badge
            variant={status.webhookActive ? 'success' : 'secondary'}
            className={status.webhookActive ? 'bg-green-100 text-green-700' : ''}
          >
            {status.webhookActive ? t('connected') : t('notConfigured')}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bot-token" className="flex items-center">
            Bot Token
            <span className="ml-2 text-xs font-normal text-gray-400">{t('obtainedViaBotFather')}</span>
          </Label>
          <div className="flex space-x-2">
            <Input
              id="bot-token"
              placeholder="0000000000:AAHH-xxxxxxxxxxxxxxxxxxxxxxxx"
              value={botToken}
              onChange={(event) => setBotToken(event.target.value)}
              type="password"
              className="font-mono text-sm"
            />
            <Button variant="outline" onClick={handleTest} disabled={loading || !botToken}>
              {loading
                ? <RefreshCw className="h-4 w-4 animate-spin" />
                : <Search className="mr-2 h-4 w-4" />}
              {t('verify')}
            </Button>
          </div>
        </div>

        {displayedBotInfo && (
          <div className="flex items-center justify-between rounded-lg border border-dashed bg-gray-50 p-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-full border bg-white p-2">
                <Bot className="h-5 w-5 text-[#0088cc]" />
              </div>
              <div>
                <p className="text-sm font-bold">{displayedBotInfo.first_name || t('telegramBot')}</p>
                <p className="text-xs text-gray-500">@{displayedBotInfo.username}</p>
                {status.lastError && <p className="mt-1 text-xs text-red-600">{status.lastError}</p>}
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase">{t('validToken')}</Badge>
          </div>
        )}

        {status.lastError && !displayedBotInfo && (
          <p className="text-xs text-red-600">{status.lastError}</p>
        )}

        <div className="flex items-start space-x-3 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">{t('howItWorks')}</p>
            <p className="opacity-80">
              {t('telegramHowItWorksBody')}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between border-t bg-gray-50 py-4">
        <div className="flex items-center gap-1"><Button variant="ghost" size="sm" asChild><Link href={`/${locale}/dashboard/integration/telegram`}>{t('guide')}</Link></Button><Button variant="ghost" className="text-xs" asChild><a href="https://t.me/botfather" target="_blank" rel="noopener noreferrer">BotFather <ExternalLink className="ml-1 h-3 w-3" /></a></Button></div>
        {status.webhookActive ? (
          <Button variant="destructive" onClick={onDisconnect} disabled={loading}>
            <Power className="mr-2 h-4 w-4" />{t('disconnect')}
          </Button>
        ) : (
          <Button
            onClick={handleActivate}
            disabled={loading || !botToken}
            className="bg-[#0088cc] hover:bg-[#0077bb]"
          >
            <Zap className="mr-2 h-4 w-4" />{t('activateIntegration')}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
