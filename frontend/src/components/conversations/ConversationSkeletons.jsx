import { Skeleton } from '@/components/ui/skeleton'

export function ConversationsPageSkeleton() {
  return <div className="space-y-6 pb-8"><div className="flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-8 w-44" /><Skeleton className="h-4 w-80 max-w-full" /></div><div className="flex gap-3"><Skeleton className="h-9 w-24" /><Skeleton className="h-9 w-28" /></div></div><div className="grid gap-6 md:grid-cols-4">{[1, 2, 3, 4].map(item => <Skeleton key={item} className="h-24" />)}</div><Skeleton className="h-20 w-full" /><div className="overflow-hidden rounded-xl border bg-white">{[1, 2, 3, 4, 5, 6].map(row => <div key={row} className="flex gap-5 border-b p-5 last:border-0"><Skeleton className="h-4 w-5" /><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-16" /></div>)}</div></div>
}

export function ConversationListSkeleton() {
  return <aside className="flex w-80 shrink-0 flex-col border-r bg-gray-50"><div className="space-y-3 border-b bg-white p-4"><Skeleton className="h-5 w-32" /><Skeleton className="h-10 w-full" /></div>{[1, 2, 3, 4, 5].map(item => <div key={item} className="space-y-3 border-b p-4"><div className="flex gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 flex-1" /></div><Skeleton className="h-3 w-4/5" /><Skeleton className="h-3 w-2/5" /></div>)}</aside>
}

export function MessageListSkeleton() {
  return <div className="flex-1 space-y-6 overflow-hidden bg-gray-50/30 p-6"><Skeleton className="mx-auto h-6 w-44 rounded-full" />{[1, 2, 3, 4].map(item => <div key={item} className={item % 2 ? 'flex justify-start' : 'flex justify-end'}><Skeleton className={`h-16 ${item % 2 ? 'w-3/5' : 'w-2/5'}`} /></div>)}</div>
}

export function ConversationInboxSkeleton() {
  return <div className="flex h-full min-h-0 overflow-hidden bg-white"><ConversationListSkeleton /><div className="flex flex-1 flex-col border-r"><div className="flex items-center justify-between border-b p-4"><div className="flex gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56" /></div></div><Skeleton className="h-9 w-24" /></div><MessageListSkeleton /><div className="border-t p-3"><Skeleton className="h-10 w-full" /></div></div><aside className="hidden w-64 space-y-5 border-l bg-gray-50 p-4 lg:block"><Skeleton className="h-5 w-32" />{[1, 2, 3, 4].map(item => <div key={item} className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-4 w-full" /></div>)}</aside></div>
}
