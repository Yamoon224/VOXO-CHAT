import { useEffect, useState } from 'react'
import { Palette } from 'lucide-react'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { ChatbotPreview } from '@/components/settings/ChatbotPreview'
import { ChatbotToneField } from '@/components/settings/ChatbotToneField'
import { useTranslations } from 'next-intl'

const COLORS = [
  { color: '#3b82f6', name: 'Bleu' },
  { color: '#10b981', name: 'Vert' },
  { color: '#f59e0b', name: 'Orange' },
  { color: '#ef4444', name: 'Rouge' },
  { color: '#8b5cf6', name: 'Violet' },
  { color: '#06b6d4', name: 'Cyan' }
]
const BOT_AVATARS = [
  ['orbit', 'Orbit'], ['lumen', 'Lumen'], ['nova', 'Nova'],
  ['pulse', 'Pulse'], ['cosmos', 'Cosmos'], ['flux', 'Flux']
]

export function ChatbotAppearanceCard({
  settings,
  updateSetting,
  devicePreview,
  setDevicePreview
}) {
  const t = useTranslations('ChatbotSettings')
  const [colorInput, setColorInput] = useState(settings.theme.primaryColor)
  const [colorError, setColorError] = useState('')

  useEffect(() => {
    setColorInput(settings.theme.primaryColor)
    setColorError('')
  }, [settings.theme.primaryColor])

  const commitColor = value => {
    const normalized = value.toLowerCase()
    if (!/^#[0-9a-f]{6}$/.test(normalized)) return false
    setColorInput(normalized)
    setColorError('')
    updateSetting('theme.primaryColor', normalized)
    return true
  }

  const handleColorChange = value => {
    setColorInput(value)
    if (!commitColor(value)) setColorError(t('invalidColor'))
  }

  const handleColorBlur = () => {
    if (commitColor(colorInput)) return
    setColorInput(settings.theme.primaryColor)
    setColorError(t('colorReset'))
  }

  return (
    <SurfaceCard>
      <CardHeader>
        <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5" />{t('appearanceTitle')}</CardTitle>
        <CardDescription>{t('appearanceDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label htmlFor="chatbot-name">{t('chatbotName')}</Label>
              <Input id="chatbot-name" value={settings.name} onChange={event => updateSetting('name', event.target.value)} placeholder="Assistant" />
            </div>
            <div>
              <Label htmlFor="welcome-message">{t('welcomeFr')}</Label>
              <Textarea id="welcome-message" value={settings.localizedContent?.fr?.welcomeMessage || ''} onChange={event => updateSetting('localizedContent.fr.welcomeMessage', event.target.value)} rows={3} />
              <p className="mt-1 text-xs text-gray-500">{t('characterCount', { count: settings.localizedContent?.fr?.welcomeMessage?.length || 0 })}</p>
            </div>
            <div>
              <Label htmlFor="welcome-message-en">{t('welcomeEn')}</Label>
              <Textarea id="welcome-message-en" value={settings.localizedContent?.en?.welcomeMessage || ''} onChange={event => updateSetting('localizedContent.en.welcomeMessage', event.target.value)} rows={3} />
              <p className="mt-1 text-xs text-gray-500">{t('characterCount', { count: settings.localizedContent?.en?.welcomeMessage?.length || 0 })}</p>
            </div>
            <div>
              <Label htmlFor="primary-color">{t('primaryColor')}</Label>
              <div className="flex items-center space-x-2">
                <Input id="primary-color" type="color" value={settings.theme.primaryColor} onChange={event => commitColor(event.target.value)} className="h-10 w-16" />
                <Input value={colorInput} onChange={event => handleColorChange(event.target.value)} onBlur={handleColorBlur} aria-invalid={Boolean(colorError)} aria-describedby={colorError ? 'primary-color-error' : undefined} className="flex-1" />
              </div>
              {colorError && <p id="primary-color-error" className="mt-1 text-xs text-red-600">{colorError}</p>}
              <div className="mt-3 grid grid-cols-6 gap-2">
                {COLORS.map(({ color, name }) => (
                  <button key={color} type="button" onClick={() => commitColor(color)} className={`h-8 w-full rounded border-2 transition-all ${settings.theme.primaryColor === color ? 'scale-110 border-gray-400' : 'border-gray-200 hover:border-gray-300'}`} style={{ backgroundColor: color }} title={name} />
                ))}
              </div>
            </div>
            <div>
              <Label>{t('botAvatar')}</Label>
              <p className="mb-2 text-xs text-muted-foreground">{t('botAvatarHint')}</p>
              <div className="grid grid-cols-6 gap-2">
                {BOT_AVATARS.map(([id, label]) => (
                  <button key={id} type="button" title={label} onClick={() => updateSetting('options.ui.avatarPreset', id)} className={`rounded-xl border-2 p-1 transition ${settings.options?.ui?.avatarPreset === id ? 'border-blue-600 bg-blue-50' : 'border-transparent hover:border-slate-200'}`}>
                    <img src={`/bot-avatars/voxo-${id}.png`} alt={label} className="aspect-square w-full rounded-lg object-cover" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="position">{t('sitePosition')}</Label>
              <Select value={settings.theme.position} onValueChange={value => updateSetting('theme.position', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">{t('positions.bottom-right')}</SelectItem>
                  <SelectItem value="bottom-left">{t('positions.bottom-left')}</SelectItem>
                  <SelectItem value="top-right">{t('positions.top-right')}</SelectItem>
                  <SelectItem value="top-left">{t('positions.top-left')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ChatbotToneField value={settings.tone} onChange={value => updateSetting('tone', value)} />
          </div>
          <ChatbotPreview settings={settings} devicePreview={devicePreview} setDevicePreview={setDevicePreview} />
        </div>
      </CardContent>
    </SurfaceCard>
  )
}
