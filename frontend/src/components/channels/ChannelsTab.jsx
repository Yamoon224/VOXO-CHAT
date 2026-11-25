'use client'

import { useChannels } from '@/hooks/use-channels'
import { ChannelsSummary } from '@/components/channels/ChannelsSummary'
import { TelegramChannelCard } from '@/components/channels/TelegramChannelCard'
import { WhatsAppChannelCard } from '@/components/channels/WhatsAppChannelCard'
import { MessengerChannelCard } from '@/components/channels/MessengerChannelCard'

/**
 * Canaux de diffusion du chatbot.
 *
 * Simple assemblage : `useChannels` détient l'état partagé, chaque carte gère
 * la saisie qui lui est propre. Le fichier tenait auparavant les deux
 * formulaires en entier et dépassait 370 lignes.
 */
export function ChannelsTab({ tenant }) {
  const {
    loading,
    telegramStatus,
    whatsappStatus,
    testTelegramConnection,
    registerTelegram,
    disconnectTelegram,
    testWhatsAppConnection,
    registerWhatsApp,
    disconnectWhatsApp,
  } = useChannels(tenant)

  const activeChannelsCount = [
    telegramStatus.webhookActive,
    whatsappStatus.webhookActive,
  ].filter(Boolean).length

  return (
    <div className="space-y-6">
      <ChannelsSummary tenant={tenant} activeChannelsCount={activeChannelsCount} />

      <TelegramChannelCard
        status={telegramStatus}
        loading={loading}
        onTest={testTelegramConnection}
        onRegister={registerTelegram}
        onDisconnect={disconnectTelegram}
      />

      <WhatsAppChannelCard
        status={whatsappStatus}
        loading={loading}
        onTest={testWhatsAppConnection}
        onRegister={registerWhatsApp}
        onDisconnect={disconnectWhatsApp}
      />

      <MessengerChannelCard />
    </div>
  )
}
