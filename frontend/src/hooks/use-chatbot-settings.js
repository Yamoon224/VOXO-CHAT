import { useCallback, useEffect, useRef, useState } from 'react'
import { getFrontendUrl } from '@/lib/app-url'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useChatbotSettingsTransfer } from '@/hooks/use-chatbot-settings-transfer'
import apiClient from '@/lib/api'
import {
  createDefaultChatbotSettings,
  getChatbotChanges,
  normalizeChatbotSettings,
  validateChatbotSettings
} from '@/lib/chatbot-settings-state.mjs'

const clone = value => JSON.parse(JSON.stringify(value))

function setNestedValue(source, path, value) {
  const next = clone(source)
  const parts = path.split('.')
  let target = next
  for (const part of parts.slice(0, -1)) {
    target[part] ||= {}
    target = target[part]
  }
  const key = parts.at(-1)
  const changed = target[key] !== value
  target[key] = value
  return { next, changed }
}

export function useChatbotSettings() {
  const { tenant } = useAuth()
  const { toast } = useToast()
  const [settings, setSettings] = useState(createDefaultChatbotSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const settingsRef = useRef(settings)
  const latestSettingsRef = useRef(settings)
  const loadedTenantIdRef = useRef(null)
  const savingRef = useRef(false)

  const loadSettings = useCallback(async () => {
    if (!tenant?.id) return
    try {
      setLoading(true)
      const response = await apiClient.get('/tenant/profile')
      if (!response.success) return
      const loaded = normalizeChatbotSettings(response.data.settings?.chatbot)
      setSettings(loaded)
      settingsRef.current = clone(loaded)
      latestSettingsRef.current = clone(loaded)
      setHasChanges(false)
    } catch {
      toast.error('Impossible de charger les paramètres du chatbot')
    } finally {
      setLoading(false)
    }
  }, [tenant?.id, toast])

  const updateSettings = useCallback(async (newSettings = null) => {
    if (savingRef.current) {
      return { success: false, error: 'Une sauvegarde est déjà en cours' }
    }
    const candidate = newSettings || settings
    const validation = validateChatbotSettings(candidate)
    if (!validation.isValid) {
      toast.error(`Erreur de validation: ${validation.errors[0]}`)
      return { success: false, error: validation.errors[0] }
    }
    try {
      savingRef.current = true
      setSaving(true)
      const response = await apiClient.put('/tenant/chatbot-settings', {
        name: candidate.name,
        welcomeMessage: candidate.welcomeMessage,
        localizedContent: candidate.localizedContent,
        tone: candidate.tone,
        ...(tenant?.features?.customAiInstructions === true
          ? { customInstructions: candidate.customInstructions }
          : {}),
        theme: candidate.theme,
        features: candidate.features,
        options: candidate.options,
        initialQuestions: candidate.initialQuestions
      })
      if (!response.success) throw new Error(response.error || 'Erreur lors de la sauvegarde')
      settingsRef.current = clone(candidate)
      setHasChanges(JSON.stringify(latestSettingsRef.current) !== JSON.stringify(candidate))
      toast.success('Paramètres sauvegardés avec succès')
      const warnings = response.data?.warnings || []
      warnings.forEach(warning => toast.warning(warning.message))
      window.dispatchEvent(new CustomEvent('chatbot-settings-updated', { detail: candidate }))
      return { success: true, data: candidate, warnings }
    } catch (error) {
      const message = error.message || 'Erreur lors de la sauvegarde des paramètres'
      toast.error(message)
      return { success: false, error: message }
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }, [settings, tenant?.features?.customAiInstructions, toast])

  const updateSetting = useCallback((path, value) => {
    setSettings(previous => {
      const { next, changed } = setNestedValue(previous, path, value)
      if (changed) setHasChanges(true)
      latestSettingsRef.current = next
      return next
    })
  }, [])

  const resetToDefaults = useCallback(() => {
    const defaults = createDefaultChatbotSettings()
    setSettings(defaults)
    latestSettingsRef.current = defaults
    setHasChanges(true)
    toast.info('Paramètres réinitialisés aux valeurs par défaut')
  }, [toast])

  const previewChanges = useCallback(
    () => getChatbotChanges(settings, settingsRef.current),
    [settings]
  )

  const testConfiguration = useCallback(async () => {
    try {
      const response = await apiClient.get('/widget/test')
      if (!response.success) throw new Error(response.error)
      toast.success('Configuration testée avec succès')
      return { success: true, data: response.data }
    } catch (error) {
      toast.error('Impossible de tester la configuration')
      return { success: false, error: error.message }
    }
  }, [toast])

  const getTestWidgetUrl = useCallback(
    () => getFrontendUrl(`/widget-test?tenantId=${tenant?.id}`),
    [tenant?.id]
  )

  const { exportSettings, importSettings } = useChatbotSettingsTransfer({
    settings,
    setSettings,
    latestSettingsRef,
    setHasChanges,
    tenantName: tenant?.name,
    toast
  })

  useEffect(() => {
    if (tenant?.id && loadedTenantIdRef.current !== tenant.id) {
      loadedTenantIdRef.current = tenant.id
      loadSettings()
    }
  }, [tenant?.id, loadSettings])

  return {
    settings,
    loading,
    saving,
    hasChanges,
    updateSettings,
    updateSetting,
    resetToDefaults,
    exportSettings,
    importSettings,
    previewChanges,
    testConfiguration,
    getTestWidgetUrl,
    reload: loadSettings,
    isValidConfiguration: () => validateChatbotSettings(settings).isValid,
    getChangesCount: () => previewChanges().length
  }
}

export default useChatbotSettings
