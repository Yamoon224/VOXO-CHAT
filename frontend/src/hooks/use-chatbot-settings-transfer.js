import { useCallback } from 'react'
import { mergeImportedSettings, validateChatbotSettings } from '@/lib/chatbot-settings-state.mjs'

export function useChatbotSettingsTransfer({
  settings,
  setSettings,
  latestSettingsRef,
  setHasChanges,
  tenantName,
  toast
}) {
  const exportSettings = useCallback(() => {
    const data = encodeURIComponent(JSON.stringify(settings, null, 2))
    const date = new Date().toISOString().split('T')[0]
    const link = document.createElement('a')
    link.href = `data:application/json;charset=utf-8,${data}`
    link.download = `chatbot-settings-${tenantName || 'export'}-${date}.json`
    link.click()
    toast.success('Paramètres exportés avec succès')
  }, [settings, tenantName, toast])

  const importSettings = useCallback(file => {
    const reader = new FileReader()
    reader.onload = event => {
      try {
        const imported = JSON.parse(event.target.result)
        const validation = validateChatbotSettings(imported)
        if (!validation.isValid) {
          toast.error(`Fichier invalide: ${validation.errors[0]}`)
          return
        }
        const merged = mergeImportedSettings(settings, imported)
        setSettings(merged)
        latestSettingsRef.current = merged
        setHasChanges(true)
        toast.success('Paramètres importés avec succès')
      } catch {
        toast.error('Erreur lors de l’importation du fichier')
      }
    }
    reader.readAsText(file)
  }, [latestSettingsRef, setHasChanges, setSettings, settings, toast])

  return { exportSettings, importSettings }
}
