'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Globe, MessageCircle, Send, ShoppingCart, Smartphone } from 'lucide-react'

const GROUPS = [
  { titleKey: 'navGroupWeb', items: [{ href: '/dashboard/integration', label: 'Website', icon: Globe, hintKey: 'navAllWebsites' }, { href: '/dashboard/integration/wordpress', label: 'WordPress', icon: ShoppingCart, hintKey: 'navAndWoocommerce' }] },
  { titleKey: 'navGroupMobile', items: [{ href: '/dashboard/integration/flutter', label: 'Flutter', icon: Smartphone, hintKey: 'navIosAndroid' }, { href: '/dashboard/integration/react-native', label: 'React Native', icon: Smartphone, hintKey: 'navIosAndroid' }, { href: '/dashboard/integration/kotlin', label: 'Kotlin', icon: Smartphone, hintKey: 'navAndroid' }] },
  { titleKey: 'navGroupChannels', items: [{ href: '/dashboard/integration/whatsapp', label: 'WhatsApp Business', icon: MessageCircle, hintKey: 'navMetaOfficialApi' }, { href: '/dashboard/integration/telegram', label: 'Telegram', icon: Send, hintKey: 'navCreateConnectBot' }] },
]

export function IntegrationNav() {
  const t = useTranslations('Integration')
  const pathname = usePathname()
  return <nav className="space-y-6">{GROUPS.map(group => <div key={group.titleKey}><p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t(group.titleKey)}</p><ul className="space-y-1">{group.items.map(({ href, label, icon: Icon, hintKey }) => { const active = pathname === href; return <li key={href}><Link href={href} aria-current={active ? 'page' : undefined} className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} /><span>{label}<span className="block text-xs font-normal text-slate-400">{t(hintKey)}</span></span></Link></li> })}</ul></div>)}</nav>
}
