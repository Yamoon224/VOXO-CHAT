'use client';

import { MessageCircle, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LandingLogo } from '@/components/landing/LandingLogo';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';

function AuthConversationPreview({ t }) {
  return (
    <div className="mt-10 w-full max-w-md rounded-[1.75rem] bg-white/15 p-4 shadow-2xl ring-1 ring-white/20">
      <div className="rounded-[1.2rem] bg-white p-5 text-slate-900 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2563EB] text-white"><MessageCircle className="h-4 w-4" /></span>
          <div><p className="text-sm font-semibold">Assistant VOXO</p><p className="text-xs text-emerald-600">● {t('online')}</p></div>
        </div>
        <div className="space-y-3 py-5 text-sm">
          <p className="max-w-[85%] rounded-2xl bg-slate-100 px-3.5 py-2.5">{t('previewGreeting')}</p>
          <p className="ml-auto max-w-[85%] rounded-2xl bg-blue-600 px-3.5 py-2.5 text-white">{t('previewQuestion')}</p>
          <p className="max-w-[85%] rounded-2xl bg-slate-100 px-3.5 py-2.5">{t('previewAnswer')}</p>
        </div>
        <div className="flex items-center justify-between rounded-xl border px-3 py-2 text-xs text-slate-400">{t('placeholder')}<Send className="h-4 w-4 text-[#2563EB]" /></div>
      </div>
    </div>
  );
}

function AuthContactsPreview() {
  const contacts = ['Camille Martin', 'Lora Adams', 'Adam Pierson', 'Evelina O’Brien'];
  return <div className="mt-10 overflow-hidden rounded-[1.75rem] bg-white text-slate-900 shadow-2xl">{contacts.map(contact => <div key={contact} className="border-b px-6 py-4 font-medium">{contact}</div>)}</div>;
}

export function AuthLayout({ title, subtitle, children, asideTitle, asideText, asideVariant = 'chat' }) {
  const t = useTranslations('Auth');
  return (
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(28rem,0.75fr)]">
      <section className="flex min-h-screen flex-col px-5 py-7 sm:px-10 lg:px-[clamp(3rem,8vw,10rem)]">
        <div className="flex items-center justify-between"><LandingLogo tone="dark" /><LanguageSwitcher /></div>
        <div className="mx-auto flex w-full max-w-[30rem] flex-1 flex-col justify-center py-12">
          <div className="mb-9"><p className="mb-3 text-sm font-semibold text-[#2563EB]">{t('space')}</p><h1 className="text-4xl font-bold text-slate-950">{title}</h1><p className="mt-3 text-slate-500">{subtitle}</p></div>{children}
        </div>
      </section>
      <aside className="relative hidden overflow-hidden bg-[#2563EB] px-10 py-14 text-white lg:flex lg:flex-col lg:justify-center">
        <div className="relative mx-auto max-w-md"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">{t('augmentedSupport')}</p><h2 className="mt-5 text-4xl font-bold">{asideTitle}</h2><p className="mt-5 text-lg text-blue-100">{asideText}</p>{asideVariant === 'contacts' ? <AuthContactsPreview /> : <AuthConversationPreview t={t} />}</div>
      </aside>
    </main>
  );
}
