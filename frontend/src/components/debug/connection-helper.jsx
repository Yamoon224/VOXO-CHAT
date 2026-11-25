// frontend/src/components/debug/connection-helper.jsx - Helper pour diagnostiquer les problèmes
'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Terminal, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { diagnoseProblem } from '@/lib/api'

export function ConnectionHelper({ onClose, error }) {
  const [diagnosis, setDiagnosis] = useState(null)
  const [checking, setChecking] = useState(true)
  const [retrying, setRetrying] = useState(false)

  const runDiagnosis = async () => {
    setChecking(true)
    try {
      const result = await diagnoseProblem()
      setDiagnosis(result)
    } catch (error) {
      console.error('Erreur diagnostic:', error)
    } finally {
      setChecking(false)
    }
  }

  const retryConnection = async () => {
    setRetrying(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    await runDiagnosis()
    setRetrying(false)
  }

  useEffect(() => {
    runDiagnosis()
  }, [])

  const getStatusIcon = (status) => {
    if (status) return <CheckCircle className="h-4 w-4 text-green-500" />
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusBadge = (status) => {
    if (status) return <Badge className="bg-green-100 text-green-800">OK</Badge>
    return <Badge variant="destructive">Erreur</Badge>
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <CardTitle>Diagnostic de Connexion</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
          <CardDescription>
            Vérification de l'état de la connexion avec le serveur backend
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Erreur initiale */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="font-mono text-sm">
                {error.message || error}
              </AlertDescription>
            </Alert>
          )}

          {/* Status checks */}
          {checking ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mr-2" />
              <span>Diagnostic en cours...</span>
            </div>
          ) : diagnosis && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">État des Services</h3>
              
              <div className="grid gap-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(diagnosis.backendAccessible)}
                    <span className="font-medium">Serveur Backend</span>
                  </div>
                  {getStatusBadge(diagnosis.backendAccessible)}
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(diagnosis.authTokenPresent)}
                    <span className="font-medium">Token d'Authentification</span>
                  </div>
                  {getStatusBadge(diagnosis.authTokenPresent)}
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(diagnosis.tenantIdPresent)}
                    <span className="font-medium">ID Tenant</span>
                  </div>
                  {getStatusBadge(diagnosis.tenantIdPresent)}
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {diagnosis?.suggestions?.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Solutions Recommandées</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  {diagnosis.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-blue-800">
                      {suggestion}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* Commandes rapides */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center">
              <Terminal className="h-4 w-4 mr-2" />
              Commandes de Démarrage
            </h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <div className="space-y-2">
                <div># Dans le dossier backend :</div>
                <div className="text-white">cd backend && npm run dev</div>
                <div className="mt-4"># Dans le dossier frontend :</div>
                <div className="text-white">cd frontend && npm run dev</div>
              </div>
            </div>
          </div>

          {/* Informations de configuration */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Configuration Actuelle</h3>
            <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs space-y-1">
              <div><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}</div>
              <div><strong>Frontend URL:</strong> {process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001'}</div>
              <div><strong>Environment:</strong> {process.env.NODE_ENV || 'development'}</div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={retryConnection} disabled={retrying}>
              {retrying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Nouvelle vérification...
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 mr-2" />
                  Revérifier
                </>
              )}
            </Button>
            
            <div className="space-x-2">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Actualiser la page
              </Button>
              <Button onClick={onClose}>
                Fermer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
