import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { getFrontendUrl } from '@/lib/app-url'

export function useWidgetTest(tenant) {
  const { toast } = useToast()
  const [testResults, setTestResults] = useState(null)
  const [testing, setTesting] = useState(false)

  const testWidget = async () => {
    setTesting(true)
    try {
      // Test 1: Connectivité API
      const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/widget/health`)
      const apiHealth = await apiResponse.json()

      // Test 2: Configuration du widget
      const configResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/widget/config`, {
        headers: {
          'X-Tenant-ID': tenant.id
        }
      })
      const configData = await configResponse.json()

      // Test 3: Test IA (optionnel)
      let aiTest = null
      try {
        const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/widget/test?testAI=true`, {
          headers: {
            'X-Tenant-ID': tenant.id
          }
        })
        const aiData = await aiResponse.json()
        aiTest = aiData.data?.aiTest
      } catch (error) {
        console.warn('AI test failed:', error)
      }

      setTestResults({
        api: {
          status: apiHealth.data?.status === 'healthy' ? 'success' : 'error',
          message: apiHealth.data?.status === 'healthy' ? 'API accessible' : 'API inaccessible'
        },
        config: {
          status: configData.success ? 'success' : 'error',
          message: configData.success ? 'Configuration chargée' : 'Erreur de configuration',
          data: configData.data
        },
        ai: aiTest ? {
          status: aiTest.success ? 'success' : 'warning',
          message: aiTest.success ? `IA fonctionnelle (${aiTest.model})` : 'IA indisponible',
          model: aiTest.model
        } : {
          status: 'warning',
          message: 'Test IA non effectué'
        },
        timestamp: new Date().toISOString()
      })

      toast.success('Tests terminés avec succès')
    } catch (error) {
      console.error('Test error:', error)
      setTestResults({
        api: {
          status: 'error',
          message: `Erreur: ${error.message}`
        },
        config: {
          status: 'error',
          message: 'Impossible de tester la configuration'
        },
        ai: {
          status: 'error',
          message: 'Impossible de tester l\'IA'
        }
      })
      toast.error('Erreur lors des tests')
    } finally {
      setTesting(false)
    }
  }

  const openWidgetTest = () => {
    const testUrl = getFrontendUrl(`/widget-test?tenantId=${tenant?.id}`)
    window.open(testUrl, '_blank', 'width=1200,height=800,resizable=yes,scrollbars=yes')
  }

  return {
    testResults,
    testing,
    testWidget,
    openWidgetTest
  }
}
