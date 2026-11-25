import { RefreshCw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AllowedDomainsCard } from '@/components/settings/AllowedDomainsCard'
import { AllowedAppsCard } from '@/components/settings/AllowedAppsCard'
import { MobilePushCard } from '@/components/settings/MobilePushCard'
import { ChatbotAppearanceCard } from '@/components/settings/ChatbotAppearanceCard'
import { ChatbotFeaturesCard } from '@/components/settings/ChatbotFeaturesCard'
import { InitialQuestionsCard } from '@/components/settings/InitialQuestionsCard'
import { CustomAiInstructionsCard } from '@/components/settings/CustomAiInstructionsCard'

// `AllowedDomainsCard` a suivi le retrait de l'onglet Intégration, devenu une
// section de documentation en lecture seule. Restreindre les sites autorisés
// est un réglage qui s'écrit : sa place est ici, avec le reste de la
// configuration du chatbot.
export function ChatbotTab({
  chatbotSettings,
  updateSetting,
  devicePreview,
  setDevicePreview,
  tenant,
  handleSaveChatbot,
  settingsSaving,
  hasChanges,
  readOnly = false
}) {
  return (
    <div className="space-y-6">
      <ChatbotAppearanceCard
        settings={chatbotSettings}
        updateSetting={updateSetting}
        devicePreview={devicePreview}
        setDevicePreview={setDevicePreview}
      />
      <ChatbotFeaturesCard
        settings={chatbotSettings}
        updateSetting={updateSetting}
        tenant={tenant}
      />
      <InitialQuestionsCard
        questions={chatbotSettings.localizedContent?.fr?.initialQuestions}
        updateSetting={updateSetting}
        path="localizedContent.fr.initialQuestions"
        locale="FR"
      />
      <InitialQuestionsCard
        questions={chatbotSettings.localizedContent?.en?.initialQuestions}
        updateSetting={updateSetting}
        path="localizedContent.en.initialQuestions"
        locale="EN"
      />
      <CustomAiInstructionsCard
        settings={chatbotSettings}
        updateSetting={updateSetting}
        enabled={tenant?.features?.customAiInstructions === true}
        readOnly={readOnly}
      />
      <AllowedDomainsCard tenant={tenant} readOnly={readOnly} />
      <AllowedAppsCard tenant={tenant} readOnly={readOnly} />
      <MobilePushCard readOnly={readOnly} />
      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-sm text-gray-500">
          Dernière sauvegarde: {new Date().toLocaleString('fr-FR')}
        </div>
        <Button
          onClick={handleSaveChatbot}
          disabled={settingsSaving || !hasChanges}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {settingsSaving ? (
            <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Sauvegarde...</>
          ) : (
            <><Save className="mr-2 h-4 w-4" />Sauvegarder les paramètres</>
          )}
        </Button>
      </div>
    </div>
  )
}
