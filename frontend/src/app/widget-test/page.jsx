// frontend/src/app/widget-test/page.js - Page de test du widget
'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { notFound, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  Settings, 
  Palette, 
  Monitor, 
  Smartphone, 
  RefreshCw,
  Code,
  Eye
} from 'lucide-react'

function WidgetTestContent() {
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId')
  
  const [widgetLoaded, setWidgetLoaded] = useState(false)
  const [deviceView, setDeviceView] = useState('desktop')
  const [widgetConfig, setWidgetConfig] = useState({
    tenantId: tenantId || 'demo-tenant',
    name: 'Assistant Demo',
    welcomeMessage: 'Bonjour ! Ceci est une démonstration du widget. Comment puis-je vous aider ?',
    theme: {
      primaryColor: '#3b82f6',
      textColor: '#333333',
      position: 'bottom-right'
    },
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
    options: {
      ui: {
        colorScheme: 'light',
        shadows: true,
        animations: true,
        mobileFullScreen: true,
        avatarUrl: null,
        launcherIconUrl: null,
        showUserAvatar: false
      },
      a11y: { trapFocus: 'auto', announceMessages: true }
    }
  })

  const loadWidget = useCallback(() => {
    window.ChatBotWidget?.destroy?.()

    const existingWidget = document.getElementById('chatbot-widget-script')
    if (existingWidget) existingWidget.remove()

    document.getElementById('voxo-chat')?.remove()

    window.ChatBotConfig = widgetConfig

    const script = document.createElement('script')
    script.id = 'chatbot-widget-script'
    // Le script est servi à la racine du backend, pas sous /api
    const scriptBaseUrl = widgetConfig.apiUrl.replace('/api', '')
    script.src = `${scriptBaseUrl}/widget.js`
    script.async = true
    script.onload = () => setWidgetLoaded(true)
    script.onerror = () => {
      console.error('Erreur chargement widget');
      setWidgetLoaded(false)
    }

    document.body.appendChild(script)
  }, [widgetConfig])

  useEffect(() => {
    loadWidget()
  }, [loadWidget])

  const updateConfig = (key, value) => {
    setWidgetConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const updateTheme = (key, value) => {
    setWidgetConfig(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        [key]: value
      }
    }))
  }

  const updateUi = (key, value) => {
    setWidgetConfig(prev => ({
      ...prev,
      options: {
        ...prev.options,
        ui: { ...prev.options.ui, [key]: value }
      }
    }))
  }

  const reloadWidget = () => {
    setWidgetLoaded(false)
    loadWidget()
  }

  const openWidget = () => {
    const widget = window.ChatBotInstance || window.ChatBotWidget
    if (widget && typeof widget.open === 'function') {
      widget.open()
    } else {
      console.warn('Widget instance not found or open method missing')
    }
  }


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold">Test du Widget ChatBot</h1>
                <p className="text-sm text-gray-500">
                  Testez et personnalisez votre chatbot en temps réel
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={widgetLoaded ? 'default' : 'secondary'}>
                {widgetLoaded ? 'Widget chargé' : 'Chargement...'}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => window.close()}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Panel de configuration */}
          <div className="space-y-6">
            {/* Configuration de base */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nom du chatbot
                  </label>
                  <input
                    type="text"
                    value={widgetConfig.name}
                    onChange={(e) => updateConfig('name', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Message d'accueil
                  </label>
                  <textarea
                    value={widgetConfig.welcomeMessage}
                    onChange={(e) => updateConfig('welcomeMessage', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Position
                  </label>
                  <select
                    value={widgetConfig.theme.position}
                    onChange={(e) => updateTheme('position', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="bottom-right">Bas droite</option>
                    <option value="bottom-left">Bas gauche</option>
                    <option value="top-right">Haut droite</option>
                    <option value="top-left">Haut gauche</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Thème */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  Apparence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Couleur principale
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={widgetConfig.theme.primaryColor}
                      onChange={(e) => updateTheme('primaryColor', e.target.value)}
                      className="w-12 h-8 border rounded"
                    />
                    <input
                      type="text"
                      value={widgetConfig.theme.primaryColor}
                      onChange={(e) => updateTheme('primaryColor', e.target.value)}
                      className="flex-1 px-3 py-1 border rounded text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { color: '#3b82f6', name: 'Bleu' },
                    { color: '#10b981', name: 'Vert' },
                    { color: '#f59e0b', name: 'Orange' },
                    { color: '#ef4444', name: 'Rouge' },
                    { color: '#8b5cf6', name: 'Violet' },
                    { color: '#06b6d4', name: 'Cyan' }
                  ].map(({ color, name }) => (
                    <button
                      key={color}
                      onClick={() => updateTheme('primaryColor', color)}
                      className={`w-full p-2 rounded text-xs text-white font-medium ${
                        widgetConfig.theme.primaryColor === color ? 'ring-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {name}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Thème du widget</label>
                  <select
                    value={widgetConfig.options.ui.colorScheme}
                    onChange={(e) => updateUi('colorScheme', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="auto">Automatique</option>
                    <option value="light">Clair</option>
                    <option value="dark">Sombre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Avatar de l’assistant</label>
                  <input
                    type="url"
                    value={widgetConfig.options.ui.avatarUrl || ''}
                    onChange={(e) => updateUi('avatarUrl', e.target.value || null)}
                    placeholder="URL facultative"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Icône du lanceur</label>
                  <input
                    type="url"
                    value={widgetConfig.options.ui.launcherIconUrl || ''}
                    onChange={(e) => updateUi('launcherIconUrl', e.target.value || null)}
                    placeholder="Icône VOXO par défaut"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>

                <label className="flex items-center justify-between gap-3 text-sm">
                  Ombres
                  <input type="checkbox" checked={widgetConfig.options.ui.shadows} onChange={(e) => updateUi('shadows', e.target.checked)} />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm">
                  Animations
                  <input type="checkbox" checked={widgetConfig.options.ui.animations} onChange={(e) => updateUi('animations', e.target.checked)} />
                </label>
                <label className="flex items-center justify-between gap-3 text-sm">
                  Plein écran mobile
                  <input type="checkbox" checked={widgetConfig.options.ui.mobileFullScreen} onChange={(e) => updateUi('mobileFullScreen', e.target.checked)} />
                </label>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={reloadWidget} className="w-full" disabled={!widgetLoaded}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recharger le widget
                </Button>
                <Button onClick={openWidget} variant="outline" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Ouvrir le chat
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Zone de prévisualisation */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sélecteur de vue */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium">Vue:</span>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant={deviceView === 'desktop' ? 'default' : 'outline'}
                        onClick={() => setDeviceView('desktop')}
                      >
                        <Monitor className="h-4 w-4 mr-2" />
                        Desktop
                      </Button>
                      <Button
                        size="sm"
                        variant={deviceView === 'mobile' ? 'default' : 'outline'}
                        onClick={() => setDeviceView('mobile')}
                      >
                        <Smartphone className="h-4 w-4 mr-2" />
                        Mobile
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Eye className="h-4 w-4" />
                    <span>Le widget apparaît en {
                      widgetConfig.theme.position === 'bottom-right' ? 'bas à droite' :
                      widgetConfig.theme.position === 'bottom-left' ? 'bas à gauche' :
                      widgetConfig.theme.position === 'top-right' ? 'haut à droite' :
                      'haut à gauche'
                    }</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Simulation de site web */}
            <Card className="min-h-[600px]">
              <CardContent className="p-0">
                <div className={`relative bg-white overflow-hidden ${
                  deviceView === 'mobile' ? 'max-w-sm mx-auto' : ''
                } ${
                  deviceView === 'mobile' ? 'h-[700px]' : 'h-[600px]'
                }`}>
                  {/* Simulation header de site */}
                  <div className="bg-gray-900 text-white p-4">
                    <div className="flex items-center justify-between">
                      <h1 className="text-lg font-bold">Mon Site Web</h1>
                      <nav className="hidden md:flex space-x-4 text-sm">
                        <a href="#" className="hover:text-gray-300">Accueil</a>
                        <a href="#" className="hover:text-gray-300">Services</a>
                        <a href="#" className="hover:text-gray-300">Contact</a>
                      </nav>
                    </div>
                  </div>

                  {/* Contenu de la page */}
                  <div className="p-6 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Bienvenue sur notre site</h2>
                      <p className="text-gray-600 mb-4">
                        Ceci est une simulation d'un site web pour tester l'intégration du widget de chatbot.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-medium mb-2">Service 1</h3>
                          <p className="text-sm text-gray-600">Description du service...</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-medium mb-2">Service 2</h3>
                          <p className="text-sm text-gray-600">Description du service...</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-medium mb-2">Service 3</h3>
                          <p className="text-sm text-gray-600">Description du service...</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-900 mb-2">
                        💬 Testez le chatbot !
                      </h3>
                      <p className="text-sm text-blue-700 mb-3">
                        Le widget de chatbot est maintenant intégré sur cette page. 
                        Cliquez sur l'icône {widgetConfig.theme.position.includes('right') ? 'en bas à droite' : 'en bas à gauche'} 
                        pour commencer une conversation.
                      </p>
                      <Button size="sm" onClick={openWidget}>
                        Ouvrir le chat
                      </Button>
                    </div>

                    {/* Informations de debug */}
                    {widgetLoaded && (
                      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center">
                          <Code className="h-4 w-4 mr-2" />
                          Configuration actuelle
                        </h4>
                        <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                          {JSON.stringify(widgetConfig, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Status du widget */}
                  <div className="absolute top-4 right-4">
                    <Badge variant={widgetLoaded ? 'default' : 'secondary'} className="text-xs">
                      {widgetLoaded ? '✓ Widget actif' : '⏳ Chargement...'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comment tester le widget</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Modifiez les paramètres dans le panneau de gauche</li>
                  <li>Le widget se recharge automatiquement avec vos modifications</li>
                  <li>Cliquez sur l'icône du chatbot pour ouvrir la conversation</li>
                  <li>Testez différentes questions pour voir les réponses</li>
                  <li>Changez la vue entre Desktop et Mobile pour tester la responsivité</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WidgetTestPage() {
  // Outil de développement interne : il ne fait pas partie des surfaces produit
  // localisées et ne doit jamais être exposé dans un build de production.
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <WidgetTestContent />
    </Suspense>
  )
}
