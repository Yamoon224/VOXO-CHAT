'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bot, BookOpen, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { tenantAPI } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const EMPTY_ACTION = { name: '', description: '', method: 'GET', endpointUrl: '', timeoutMs: 5000, isActive: true, parametersSchema: '{"type":"object","properties":{}}', headersTemplate: '{}', authSecret: '' }

function safeJson(value, label) {
  try { return JSON.parse(value || '{}') } catch { throw new Error(`${label} doit être un JSON valide`) }
}

export function AgenticTab({ chatbotSettings, updateSetting, saving, readOnly }) {
  const t = useTranslations('Agentic')
  const locale = useLocale()
  const { toast } = useToast()
  const [actions, setActions] = useState([])
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_ACTION)
  const [editingId, setEditingId] = useState(null)
  const [days, setDays] = useState(30)
  const [testResult, setTestResult] = useState(null)
  const enabled = Boolean(chatbotSettings.options?.features?.agentActions)

  const saveEnabled = async () => {
    try { await tenantAPI.updateAgenticSettings(enabled); toast.success(t('saved')) } catch (error) { toast.error(error.message) }
  }

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [actionResponse, usageResponse] = await Promise.all([tenantAPI.listAgentActions(), tenantAPI.getAgentUsage({ days })])
      setActions(actionResponse.data.actions || [])
      setUsage(usageResponse.data)
    } catch (error) { toast.error(error.message || t('loadFailed')) } finally { setLoading(false) }
  }, [days, toast, t])
  useEffect(() => {
    const timer = setTimeout(() => { reload() }, 0)
    return () => clearTimeout(timer)
  }, [reload])

  const create = async event => {
    event.preventDefault()
    try {
      const payload = { ...form, timeoutMs: Number(form.timeoutMs), parametersSchema: safeJson(form.parametersSchema, t('schema')), headersTemplate: safeJson(form.headersTemplate, t('headers')) }
      const response = editingId ? await tenantAPI.updateAgentAction(editingId, payload) : await tenantAPI.createAgentAction(payload)
      setActions(current => (editingId ? current.map(action => action.id === editingId ? response.data.action : action) : [...current, response.data.action]).sort((a, b) => a.name.localeCompare(b.name)))
      setForm(EMPTY_ACTION)
      setEditingId(null)
      toast.success(editingId ? t('actionUpdated') : t('actionCreated'))
    } catch (error) { toast.error(error.message) }
  }

  const remove = async id => {
    if (!window.confirm(t('confirmDelete'))) return
    try { await tenantAPI.deleteAgentAction(id); setActions(current => current.filter(action => action.id !== id)); toast.success(t('deleted')) } catch (error) { toast.error(error.message) }
  }

  const test = async action => {
    try { const response = await tenantAPI.testAgentAction(action.id, {}); setTestResult({ name: action.name, result: response.data.result }); toast.success(t('testCompleted')) } catch (error) { toast.error(error.message) }
  }

  const edit = action => {
    setEditingId(action.id)
    setForm({ name: action.name, description: action.description, method: action.method, endpointUrl: action.endpointUrl, timeoutMs: action.timeoutMs, isActive: action.isActive, parametersSchema: JSON.stringify(action.parametersSchema, null, 2), headersTemplate: JSON.stringify(action.headersTemplate, null, 2), authSecret: '' })
  }

  return <div className="space-y-6">
    <SurfaceCard><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />{t('title')}</CardTitle><CardDescription>{t('description')}</CardDescription></div><Button asChild variant="outline" size="sm"><Link href={`/${locale}/dashboard/agentic-guide`}><BookOpen className="mr-2 h-4 w-4" />{t('guide')}</Link></Button></CardHeader><CardContent className="space-y-4">
      <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={enabled} disabled={readOnly} onChange={event => updateSetting('options.features.agentActions', event.target.checked)} />{t('enable')}</label>
      {enabled && actions.filter(action => action.isActive).length === 0 && <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">{t('noActiveAction')}</p>}
      <Button onClick={saveEnabled} disabled={readOnly || saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{t('saveEnablement')}</Button>
    </CardContent></SurfaceCard>

    <SurfaceCard><CardHeader><CardTitle>{t('actionsTitle')}</CardTitle><CardDescription>{t('actionsDescription')}</CardDescription></CardHeader><CardContent className="space-y-3">
      {loading ? <Loader2 className="animate-spin" /> : actions.map(action => <div key={action.id} className="rounded border p-3 text-sm"><div className="flex items-start justify-between gap-3"><div><strong>{action.name}</strong> · {action.method} · {new URL(action.endpointUrl).host}<p className="text-muted-foreground">{action.description} — {t('delay')} {action.timeoutMs} ms — {action.isActive ? t('active') : t('inactive')}</p></div>{!readOnly && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => test(action)}>{t('test')}</Button><Button size="sm" variant="outline" onClick={() => edit(action)}>{t('edit')}</Button><Button size="sm" variant="destructive" aria-label={t('delete')} onClick={() => remove(action.id)}><Trash2 className="h-4 w-4" /></Button></div>}</div></div>)}
      {!loading && actions.length === 0 && <p className="text-sm text-muted-foreground">{t('none')}</p>}
      {testResult && <pre className="max-h-40 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">{testResult.name}: {JSON.stringify(testResult.result, null, 2)}</pre>}
      {!readOnly && <form onSubmit={create} className="grid gap-3 border-t pt-4"><h3 className="font-medium">{editingId ? t('editAction') : t('newAction')}</h3><Input required placeholder="check_order_status" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /><Input required placeholder={t('descriptionPlaceholder')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /><Input required placeholder="https://api.example.com/orders/{id}" value={form.endpointUrl} onChange={e => setForm({ ...form, endpointUrl: e.target.value })} /><div className="grid grid-cols-2 gap-3"><Input value={form.method} onChange={e => setForm({ ...form, method: e.target.value.toUpperCase() })} /><Input type="number" value={form.timeoutMs} onChange={e => setForm({ ...form, timeoutMs: e.target.value })} /></div><label className="text-sm"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> {t('activeAction')}</label><Textarea value={form.parametersSchema} onChange={e => setForm({ ...form, parametersSchema: e.target.value })} /><Textarea value={form.headersTemplate} onChange={e => setForm({ ...form, headersTemplate: e.target.value })} /><Input type="password" placeholder={t('optionalSecret')} value={form.authSecret} onChange={e => setForm({ ...form, authSecret: e.target.value })} /><Button type="submit"><Plus className="mr-2 h-4 w-4" />{editingId ? t('save') : t('addAction')}</Button></form>}
    </CardContent></SurfaceCard>

    <SurfaceCard><CardHeader><CardTitle>{t('usageTitle')}</CardTitle><CardDescription>{t('usageDescription')}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex gap-2">{[7, 30, 90].map(value => <Button key={value} size="sm" variant={days === value ? 'default' : 'outline'} onClick={() => setDays(value)}>{t('dayCount', { count: value })}</Button>)}</div>{usage ? <><div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4"><div><strong>{usage.summary.tokensUsed}</strong><br />{t('tokens')}</div><div><strong>{usage.summary.llmCalls}</strong><br />{t('llmCalls')}</div><div><strong>{usage.summary.toolCalls}</strong><br />{t('tools')}</div><div><strong>{usage.summary.limitedTurns}</strong><br />{t('limitedTurns')}</div></div><div className="max-h-48 overflow-auto text-xs">{usage.history?.map(item => <div key={item.id} className="border-t py-2">{new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))} · {item.tokensUsed} {t('tokens')} · {t('toolCount', { count: item.toolCalls })} · {item.stopReason}</div>)}</div></> : <span className="text-sm text-muted-foreground">{t('noData')}</span>}</CardContent></SurfaceCard>
  </div>
}
