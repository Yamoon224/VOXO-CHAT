'use client'

import { RouteGuard } from '@/components/common/RouteGuard'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSkeleton } from '@/components/shared/PageSkeleton'
import { AgenticTab } from '@/components/agentic/AgenticTab'
import { useChatbotSettings } from '@/hooks/use-chatbot-settings'
import { usePermissions } from '@/hooks/use-permissions'

export default function AgenticPage() {
  const { canWrite } = usePermissions()
  const { settings, loading, saving, updateSetting } = useChatbotSettings()
  if (loading) return <PageSkeleton variant="form" />

  return (
    <RouteGuard resource="agentic">
      <div className="space-y-6">
        <PageHeader title="Agentic" description="Configurez les actions API que votre chatbot peut appeler pendant une conversation." />
        <AgenticTab chatbotSettings={settings} updateSetting={updateSetting} saving={saving} readOnly={!canWrite('agentic')} />
      </div>
    </RouteGuard>
  )
}
