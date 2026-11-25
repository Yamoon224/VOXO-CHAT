'use client'

import { useEffect, useState } from 'react'
import { List } from 'lucide-react'

export function IntegrationDocLayout({ sections, children }) {
  const [active, setActive] = useState(sections[0]?.id)
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id) }), { rootMargin: '-20% 0px -70% 0px' })
    sections.forEach(section => { const element = document.getElementById(section.id); if (element) observer.observe(element) })
    return () => observer.disconnect()
  }, [sections])
  const links = <ul className="space-y-1">{sections.map(section => <li key={section.id}><a href={`#${section.id}`} className={`block rounded-md px-3 py-2 text-sm transition-colors ${active === section.id ? 'bg-blue-50 font-medium text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}>{section.title}</a></li>)}</ul>
  return <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_13rem]"><article className="min-w-0 space-y-10 rounded-2xl border bg-white p-5 shadow-sm sm:p-8">{children}</article><aside className="hidden xl:block"><div className="sticky top-24"><p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><List className="h-4 w-4" />Sur cette page</p>{links}</div></aside><details className="rounded-xl border bg-white p-4 xl:hidden"><summary className="cursor-pointer text-sm font-semibold text-slate-800">Sur cette page</summary><div className="mt-3">{links}</div></details></div>
}
