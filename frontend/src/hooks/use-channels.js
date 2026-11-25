import { useState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/hooks/use-toast'
import { webhookAPI } from '@/lib/api'
import { mergeTelegramStatus, mergeWhatsAppStatus } from '@/lib/channel-status.mjs'

export function useChannels(tenant) {
  const t = useTranslations('Channels')
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [telegramStatus, setTelegramStatus] = useState(
    mergeTelegramStatus({}, tenant?.settings?.channels?.telegram)
  )
  const [whatsappStatus, setWhatsappStatus] = useState(
    mergeWhatsAppStatus({}, tenant?.settings?.channels?.whatsapp)
  )

  const refreshChannelStatus = useCallback(async () => {
    if (!tenant?.id) return

    try {
      const response = await webhookAPI.getChannelsStatus(tenant.id)
      if (response.success) {
        setTelegramStatus((prev) => mergeTelegramStatus(prev, response.data?.telegram))
        setWhatsappStatus((prev) => mergeWhatsAppStatus(prev, response.data?.whatsapp))
        return { success: true, data: response.data }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }, [tenant?.id])

  useEffect(() => {
    refreshChannelStatus()
  }, [refreshChannelStatus])

  const testTelegramConnection = useCallback(async (botToken) => {
    if (!tenant?.id) return

    try {
      setLoading(true)
      const response = await webhookAPI.testTelegram(tenant.id, botToken)

      if (response.success) {
        const botInfo = response.data.result || response.data
        toast.success(t('toastConnectionSuccess', { username: botInfo.username }))
        setTelegramStatus((prev) => mergeTelegramStatus(prev, {
          botToken,
          botTokenConfigured: true,
          botId: botInfo.id || null,
          botUsername: botInfo.username || null,
          botFirstName: botInfo.first_name || null,
          lastError: null,
        }))
        return { success: true, botInfo }
      }
    } catch (error) {
      toast.error(error.message || t('toastBotConnectionFailed'))
      setTelegramStatus((prev) => mergeTelegramStatus(prev, {
        botToken,
        botTokenConfigured: Boolean(botToken),
        lastError: error.message,
      }))
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }, [tenant?.id, toast, t])

  const registerTelegram = useCallback(async (botToken) => {
    if (!tenant?.id) return

    try {
      setLoading(true)
      const response = await webhookAPI.registerTelegram(tenant.id, botToken)

      if (response.success) {
        const channel = response.data?.channel || {}
        const botInfo = response.data?.botInfo || {}
        toast.success(t('toastTelegramActivated'))
        setTelegramStatus((prev) => mergeTelegramStatus(prev, {
          ...channel,
          botToken,
          botTokenConfigured: true,
          botId: botInfo.id || channel.botId || null,
          botUsername: botInfo.username || channel.botUsername || null,
          botFirstName: botInfo.first_name || channel.botFirstName || null,
          webhookActive: true,
          lastError: null,
        }))
        return { success: true, data: response.data }
      }
    } catch (error) {
      toast.error(error.message || t('toastActivationFailed'))
      setTelegramStatus((prev) => mergeTelegramStatus(prev, {
        botToken,
        botTokenConfigured: Boolean(botToken),
        webhookActive: false,
        lastError: error.message,
      }))
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }, [tenant?.id, toast, t])

  const disconnectTelegram = useCallback(async () => {
    if (!tenant?.id) return

    try {
      setLoading(true)
      const response = await webhookAPI.deleteTelegram(tenant.id)

      if (response.success) {
        toast.success(t('toastTelegramDeactivated'))
        setTelegramStatus((prev) => mergeTelegramStatus(prev, {
          webhookActive: false,
          lastError: null,
        }))
        return { success: true }
      }
    } catch (error) {
      toast.error(error.message || t('toastDeactivationFailed'))
      setTelegramStatus((prev) => mergeTelegramStatus(prev, {
        lastError: error.message,
      }))
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }, [tenant?.id, toast, t])

  const testWhatsAppConnection = useCallback(async (settings) => {
    if (!tenant?.id) return

    try {
      setLoading(true)
      const response = await webhookAPI.testWhatsApp(tenant.id, settings)

      if (response.success) {
        const phoneNumber = response.data?.phoneNumber || response.data
        toast.success(t('toastMetaConnectionVerified'))
        setWhatsappStatus((prev) => mergeWhatsAppStatus(prev, {
          provider: 'meta',
          ...response.data?.channel,
          phoneNumberId: settings.phoneNumberId,
          displayPhoneNumber: phoneNumber.display_phone_number || null,
          lastError: null,
        }))
        return { success: true, phoneNumber }
      }
    } catch (error) {
      toast.error(error.message || t('toastMetaVerificationFailed'))
      setWhatsappStatus((prev) => mergeWhatsAppStatus(prev, {
        provider: 'meta',
        phoneNumberId: settings.phoneNumberId,
        lastError: error.message,
      }))
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }, [tenant?.id, toast, t])

  const registerWhatsApp = useCallback(async (settings) => {
    if (!tenant?.id) return

    try {
      setLoading(true)
      const response = await webhookAPI.registerWhatsApp(tenant.id, settings)

      if (response.success) {
        const channel = response.data?.channel || {}
        toast.success(t('toastWhatsappConfigSaved'))
        setWhatsappStatus((prev) => mergeWhatsAppStatus(prev, {
          ...channel,
          provider: 'meta',
          phoneNumberId: settings.phoneNumberId,
          webhookActive: true,
          webhookUrl: response.webhookUrl,
          verifyToken: response.verifyToken,
          lastError: null,
        }))
        return { success: true, data: response.data }
      }
    } catch (error) {
      toast.error(error.message || t('toastWhatsappActivationFailed'))
      setWhatsappStatus((prev) => mergeWhatsAppStatus(prev, {
        provider: 'meta',
        phoneNumberId: settings.phoneNumberId,
        webhookActive: false,
        lastError: error.message,
      }))
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }, [tenant?.id, toast, t])

  const disconnectWhatsApp = useCallback(async () => {
    if (!tenant?.id) return

    try {
      setLoading(true)
      const response = await webhookAPI.deleteWhatsApp(tenant.id)

      if (response.success) {
        toast.success(t('toastWhatsappDeactivated'))
        setWhatsappStatus((prev) => mergeWhatsAppStatus(prev, {
          webhookActive: false,
          lastError: null,
        }))
        return { success: true }
      }
    } catch (error) {
      toast.error(error.message || t('toastWhatsappDeactivationFailed'))
      setWhatsappStatus((prev) => mergeWhatsAppStatus(prev, {
        lastError: error.message,
      }))
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }, [tenant?.id, toast, t])

  return {
    loading,
    telegramStatus,
    whatsappStatus,
    setTelegramStatus,
    setWhatsappStatus,
    refreshChannelStatus,
    testTelegramConnection,
    registerTelegram,
    disconnectTelegram,
    testWhatsAppConnection,
    registerWhatsApp,
    disconnectWhatsApp,
  }
}
