// frontend/src/app/dashboard/settings/page.js
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { Tabs, TabsContent } from '@/components/ui/tabs'

import { useAuth } from '@/hooks/use-auth'
import { useChatbotSettings } from '@/hooks/use-chatbot-settings'
import { useWidgetTest } from '@/hooks/use-widget-test'
import { useSettingsForms } from '@/hooks/use-settings-forms'
import { useSettingsTabs } from '@/hooks/use-settings-tabs'
import { useToast } from '@/hooks/use-toast'

import { ReadOnlyFieldset } from '@/components/common/ReadOnlyFieldset'
import { PageHeader } from '@/components/shared/PageHeader'
import { SettingsTabsList } from '@/components/settings/SettingsTabsList'
import { ChatbotTab } from '@/components/settings/ChatbotTab'
import { TestingTab } from '@/components/settings/TestingTab'
import { ProfileTab } from '@/components/settings/ProfileTab'
import { CompanyTab } from '@/components/settings/CompanyTab'
import { ConversationExportRecipientsCard } from '@/components/settings/ConversationExportRecipientsCard'
import { useConversationExportSettings } from '@/hooks/use-conversation-export-settings'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { useLocale, useTranslations } from 'next-intl'

export default function SettingsPage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('SettingsPage')
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user, tenant, updateProfile, updateTenant } = useAuth()
  const tabs = useSettingsTabs()
  const conversationExportSettings = useConversationExportSettings(Boolean(user?.permissions?.company === 'write'))

  // Hook existant pour les paramètres du chatbot
  const {
    settings: chatbotSettings,
    loading: settingsLoading,
    saving: settingsSaving,
    hasChanges: chatbotHasChanges,
    updateSettings,
    updateSetting
  } = useChatbotSettings()

  // Aperçu de l'apparence du chatbot. Cet état venait de `useIntegration`, qui
  // n'a plus lieu d'être appelé ici depuis que le code d'intégration vit dans
  // sa propre section — et l'aperçu n'a jamais eu de rapport avec lui.
  const [devicePreview, setDevicePreview] = useState('desktop')

  const {
    testResults,
    testing,
    testWidget,
    openWidgetTest
  } = useWidgetTest(tenant)

  const {
    profileSettings,
    setProfileSettings,
    profileSaving,
    companySettings,
    setCompanySettings,
    companySaving,
    handleSaveProfile,
    handleSaveCompany
  } = useSettingsForms(user, tenant, updateProfile, updateTenant)

  const handleSaveChatbot = async () => {
    await updateSettings()
  }

  const requestedTab = searchParams.get('tab')
  const activeTab = tabs.isVisible(requestedTab)
    ? requestedTab
    : (tabs.isVisible('chatbot') ? 'chatbot' : 'profile')
  const handleTabChange = (tab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'chatbot') params.delete('tab')
    else params.set('tab', tab)
    router.replace(`/${locale}/dashboard/settings${params.size ? `?${params}` : ''}`)
  }

  // Le dialog a déjà purgé la session locale : il ne reste qu'à sortir du dashboard.
  const handleAccountDeleted = () => {
    toast.success(t('accountDeleted'))
    router.replace(`/${locale}/auth/login`)
  }

  if (settingsLoading) {
    return <PageSkeleton variant="form" />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <SettingsTabsList isVisible={tabs.isVisible} />

        {tabs.isVisible('chatbot') && (
          <TabsContent value="chatbot">
            {/* ChatbotTab dépasse déjà la limite de 250 lignes : on l'enveloppe
                au lieu d'y ajouter des props `disabled`. */}
            <ReadOnlyFieldset active={tabs.isReadOnly('chatbot')}>
              <ChatbotTab
                chatbotSettings={chatbotSettings}
                updateSetting={updateSetting}
                devicePreview={devicePreview}
                setDevicePreview={setDevicePreview}
                tenant={tenant}
                handleSaveChatbot={handleSaveChatbot}
                settingsSaving={settingsSaving}
                hasChanges={chatbotHasChanges}
                readOnly={tabs.isReadOnly('chatbot')}
              />
            </ReadOnlyFieldset>
          </TabsContent>
        )}

        {tabs.isVisible('testing') && (
          <TabsContent value="testing">
            <TestingTab
              testWidget={testWidget}
              testing={testing}
              openWidgetTest={openWidgetTest}
              testResults={testResults}
              tenant={tenant}
            />
          </TabsContent>
        )}

        <TabsContent value="profile">
          <ProfileTab
            profileSettings={profileSettings}
            setProfileSettings={setProfileSettings}
            handleSaveProfile={handleSaveProfile}
            profileSaving={profileSaving}
            onAccountDeleted={handleAccountDeleted}
          />
        </TabsContent>

        {tabs.isVisible('company') && (
          <TabsContent value="company">
            <CompanyTab
              companySettings={companySettings}
              setCompanySettings={setCompanySettings}
              companySaving={companySaving}
              handleSaveCompany={handleSaveCompany}
              tenant={tenant}
              readOnly={tabs.isReadOnly('company')}
            />
            <ConversationExportRecipientsCard
              recipients={conversationExportSettings.recipients}
              saving={conversationExportSettings.saving}
              onSave={conversationExportSettings.saveRecipients}
              readOnly={tabs.isReadOnly('company')}
            />
          </TabsContent>
        )}


      </Tabs>
    </div>
  )
}
