import {
  Bot,
  Minus,
  Monitor,
  MoreHorizontal,
  Paperclip,
  Send,
  Smartphone,
  Sparkles,
  X
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { deriveAccent } from '@/lib/accent.mjs'
import { useTranslations } from 'next-intl'

export function ChatbotPreview({ settings, devicePreview, setDevicePreview }) {
  const t = useTranslations('ChatbotSettings')
  const accent = deriveAccent(settings.theme.primaryColor)
  const avatarPreset = settings.options?.ui?.avatarPreset
  const avatar = avatarPreset ? `/bot-avatars/voxo-${avatarPreset}.png` : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700">{t('preview')}</Label>
        <div className="flex space-x-2">
          <Button variant={devicePreview === 'desktop' ? 'default' : 'outline'} size="sm" onClick={() => setDevicePreview('desktop')}>
            <Monitor className="h-4 w-4" />
          </Button>
          <Button variant={devicePreview === 'mobile' ? 'default' : 'outline'} size="sm" onClick={() => setDevicePreview('mobile')}>
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className={`mx-auto flex h-[520px] flex-col overflow-hidden border border-slate-200 bg-white shadow-xl ${devicePreview === 'mobile' ? 'w-[280px] rounded-none' : 'w-full max-w-[380px] rounded-2xl'}`}>
          <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-slate-200 px-3">
            <div className="relative grid h-9 w-9 place-items-center rounded-full text-xs font-bold" style={{ backgroundColor: accent.soft, color: accent.text }}>
              {avatar ? <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" /> : <Bot className="h-4 w-4" />}
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white" style={{ backgroundColor: accent.accent }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{settings.name}</p>
              <p className="text-[11px] text-slate-500">{t('aiAssistant')}</p>
            </div>
            <button className="grid h-8 w-8 place-items-center rounded-lg text-slate-500" disabled><Minus className="h-4 w-4" /></button>
            <button className="grid h-8 w-8 place-items-center rounded-lg text-slate-500" disabled><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-hidden bg-slate-50 p-3">
            <div className="flex items-end gap-2">
              <div className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full text-[10px] font-bold" style={{ backgroundColor: accent.soft, color: accent.text }}>{avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : 'AI'}</div>
              <div className="max-w-[82%] rounded-2xl rounded-bl-md border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-sm">
                <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: accent.text }}><Sparkles className="h-3 w-3" />{t('welcome')}</div>
                {settings.welcomeMessage}
              </div>
            </div>
            <div className="flex gap-1.5 overflow-hidden pl-9">
              {[t('sampleServices'), t('samplePricing'), t('sampleContact')].map(label => <span key={label} className="whitespace-nowrap rounded-full border bg-white px-2.5 py-1.5 text-[10px] text-slate-600">{label}</span>)}
            </div>
            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl rounded-br-md px-3 py-2 text-xs" style={{ backgroundColor: accent.solid, color: '#fff' }}>{t('sampleMessage')}</div>
            </div>
          </div>
          <div className="shrink-0 bg-white p-2.5">
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 p-1 shadow-sm">
              <button className="grid h-9 w-9 place-items-center rounded-xl text-slate-500" disabled><MoreHorizontal className="h-4 w-4" /></button>
              {settings.options?.features?.attachments && (
                <button className="grid h-9 w-9 place-items-center rounded-xl text-slate-500" disabled aria-label={t('attachFile')}><Paperclip className="h-4 w-4" /></button>
              )}
              <span className="flex-1 px-1 text-xs text-slate-400">{t('writeMessage')}</span>
              <button className="grid h-9 w-9 place-items-center rounded-full" style={{ backgroundColor: accent.solid, color: '#fff' }} disabled><Send className="h-4 w-4" /></button>
            </div>
            <p className="mt-1.5 text-center text-[9px] text-slate-400">{t('poweredBy')}</p>
          </div>
        </div>
        <div className="mt-4 text-center">
          <Badge variant="outline" className="text-xs">{t('position')}: {t(`positions.${settings.theme.position}`)}</Badge>
        </div>
      </div>
    </div>
  )
}
