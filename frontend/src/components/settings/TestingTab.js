import {
  TestTube,
  RefreshCw,
  Eye,
  Check,
  AlertTriangle,
  X,
  Circle,
  Shield
} from 'lucide-react'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function TestingTab({
  testWidget,
  testing,
  openWidgetTest,
  testResults,
  tenant: _tenant
}) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <Check className="h-4 w-4 text-green-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error': return <X className="h-4 w-4 text-red-500" />
      default: return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="space-y-6">
      <SurfaceCard>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TestTube className="h-5 w-5 mr-2" />
            Tests et Diagnostics
          </CardTitle>
          <CardDescription>
            Testez le fonctionnement de votre chatbot et diagnostiquez les problèmes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Boutons de test */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={testWidget} disabled={testing} className="bg-green-600 hover:bg-green-700">
              {testing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Tests en cours...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Lancer les tests
                </>
              )}
            </Button>
            <Button variant="outline" onClick={openWidgetTest}>
              <Eye className="h-4 w-4 mr-2" />
              Ouvrir le simulateur
            </Button>
          </div>

          {/* Résultats des tests */}
          {testResults && (
            <div className="space-y-4">
              <h4 className="font-semibold">Résultats des tests</h4>

              <div className="grid gap-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(testResults.api?.status)}
                    <div>
                      <span className="font-medium">API Widget</span>
                      <p className="text-sm text-gray-600">{testResults.api?.message}</p>
                    </div>
                  </div>
                  <Badge variant={testResults.api?.status === 'success' ? 'default' : 'destructive'}>
                    {testResults.api?.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(testResults.config?.status)}
                    <div>
                      <span className="font-medium">Configuration</span>
                      <p className="text-sm text-gray-600">{testResults.config?.message}</p>
                    </div>
                  </div>
                  <Badge variant={testResults.config?.status === 'success' ? 'default' : 'destructive'}>
                    {testResults.config?.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(testResults.ai?.status)}
                    <div>
                      <span className="font-medium">Intelligence Artificielle</span>
                      <p className="text-sm text-gray-600">{testResults.ai?.message}</p>
                    </div>
                  </div>
                  <Badge variant={
                    testResults.ai?.status === 'success' ? 'default' :
                      testResults.ai?.status === 'warning' ? 'secondary' : 'destructive'
                  }>
                    {testResults.ai?.status}
                  </Badge>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Tests effectués le {new Date(testResults.timestamp).toLocaleString('fr-FR')}
              </div>
            </div>
          )}

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Problèmes courants :</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Le widget n'apparaît pas : Vérifiez que le code est placé avant &lt;/body&gt;</li>
                <li>• Erreurs de configuration : Vérifiez que le tenantId est correct</li>
                <li>• IA indisponible : Le service peut être temporairement indisponible</li>
                <li>• Problèmes de style : Vérifiez qu'il n'y a pas de conflits CSS</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </SurfaceCard>
    </div>
  )
}
