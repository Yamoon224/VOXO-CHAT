'use client';

import { ChevronDown, MessageSquare, Send, X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export function ChatMock() {
  const reducedMotion = useReducedMotion();
  const t = useTranslations('LandingMock');
  const messages = [
    { from: 'agent', text: t('greeting'), time: '10:00' },
    { from: 'visitor', text: t('question'), time: '10:02' },
    { from: 'agent', text: t('answer'), time: '10:02' },
  ];

  return <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/50"><div className="bg-[#2563EB] px-5 pb-5 pt-4 text-center text-white"><div className="flex items-center justify-between"><span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium"><MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />{t('messages')}</span><span className="flex gap-1.5"><ChevronDown className="h-4 w-4 opacity-70" /><X className="h-4 w-4 opacity-70" /></span></div><p className="mt-4 text-sm font-semibold">{t('assistant')}</p><p className="mt-1 text-[11px] text-white/80">● {t('connected')}</p></div><div className="space-y-3 bg-slate-50 px-4 py-5">{messages.map((message, index) => <motion.div key={index} className={message.from === 'visitor' ? 'text-right' : 'text-left'} initial={reducedMotion ? false : { opacity: 0, y: 10 }} whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.22, duration: 0.3 }}><p className={message.from === 'visitor' ? 'inline-block max-w-[85%] rounded-2xl bg-blue-100 px-3.5 py-2 text-left text-[13px] text-slate-800' : 'inline-block max-w-[85%] rounded-2xl bg-emerald-600 px-3.5 py-2 text-left text-[13px] text-white'}>{message.text}</p><p className="mt-1 text-[10px] text-slate-400">{message.time}</p></motion.div>)}</div><div className="border-t border-slate-100 px-4 py-3"><div className="flex items-center justify-between rounded-xl border-2 border-blue-500 px-3 py-2"><span className="text-[13px] text-slate-400">{t('placeholder')}</span><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2563EB]"><Send className="h-3.5 w-3.5 text-white" /></span></div><p className="mt-2 text-center text-[10px] text-slate-400">{t('poweredBy')}</p></div></div>;
}
