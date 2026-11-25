'use client'

import { useEffect, useState } from 'react'
import { BellRing, CheckCircle2, ExternalLink } from 'lucide-react'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/shared/SurfaceCard'
import { Button } from '@/components/ui/button'
import { getOneSignalStatus, requestOneSignalPermission } from '@/lib/onesignal'

export function NotificationPreferencesCard() {
  const [status, setStatus] = useState(null)
  const [requesting, setRequesting] = useState(false)
  useEffect(() => { getOneSignalStatus().then(setStatus) }, [])
  const activate = async () => { setRequesting(true); try { setStatus(await requestOneSignalPermission()) } finally { setRequesting(false) } }
  const denied = status?.permission === 'denied'
  return <SurfaceCard><CardHeader><CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5" />Notifications navigateur</CardTitle><CardDescription>Recevez les alertes VOXO même lorsque le tableau de bord est fermé.</CardDescription></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-muted-foreground">{!status ? 'Vérification…' : !status.available ? 'Les notifications ne sont pas disponibles dans ce navigateur.' : status.subscribed ? <span className="inline-flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" />Notifications activées</span> : denied ? 'L’autorisation a été refusée dans le navigateur.' : 'Les notifications sont désactivées.'}</p>{status?.available && !status.subscribed && !denied && <Button onClick={activate} disabled={requesting}>{requesting ? 'Activation…' : 'Activer les notifications'}</Button>}{denied && <Button variant="outline" asChild><a href="https://support.google.com/chrome/answer/3220216" target="_blank" rel="noreferrer">Gérer dans le navigateur <ExternalLink className="h-4 w-4" /></a></Button>}</CardContent></SurfaceCard>
}
