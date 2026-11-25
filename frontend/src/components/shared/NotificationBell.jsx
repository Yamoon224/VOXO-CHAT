'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useNotifications } from '@/hooks/use-notifications'
import { useLocale, useTranslations } from 'next-intl'

export function NotificationBell({ admin = false }) {
  const t = useTranslations('Notifications')
  const locale = useLocale()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications({ admin })
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="relative"><Bell className="h-5 w-5 text-gray-500" />{unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">{unreadCount}</span>}</Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-80"><DropdownMenuLabel className="flex justify-between">{t('title')} <button onClick={markAllRead} className="text-xs font-normal text-blue-600">{t('markAllRead')}</button></DropdownMenuLabel><DropdownMenuSeparator />
      {notifications.length === 0 && <DropdownMenuItem disabled>{t('none')}</DropdownMenuItem>}
      {notifications.slice(0, 8).map(item => <DropdownMenuItem key={item.id} asChild><Link href={item.url?.startsWith('/') && !/^\/(?:fr|en)(?:\/|$)/.test(item.url) ? `/${locale}${item.url}` : (item.url || '#')} onClick={() => markRead(item.id)} className={item.readAt ? '' : 'font-medium'}><span><span className="block">{item.title}</span><span className="block text-xs text-muted-foreground">{item.body}</span></span></Link></DropdownMenuItem>)}
    </DropdownMenuContent>
  </DropdownMenu>
}
