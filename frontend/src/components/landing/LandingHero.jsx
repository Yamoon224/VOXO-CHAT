'use client';

import Link from 'next/link';
import { ChevronRight, Play } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { AuroraBackdrop } from '@/components/landing/AuroraBackdrop';
import { ChatMock } from '@/components/landing/mocks/ChatMock';
import { useLandingContent } from '@/hooks/use-landing-content';

export function LandingHero() {
  const t = useTranslations('LandingHero');
  const locale = useLocale();
  const { SOCIAL_PROOF } = useLandingContent();
  return (
    <section className="relative overflow-hidden bg-black">
      <AuroraBackdrop position="top" className="h-[42rem]" />
      <div className="mx-auto max-w-[88rem] px-5 pb-16 pt-14 sm:px-8 lg:pb-20 lg:pt-20">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h1 className="font-display text-[2.75rem] leading-[1.02] text-white sm:text-6xl xl:text-7xl">{t('title')}</h1>
            <p className="mt-7 max-w-lg font-grotesk text-lg leading-relaxed text-white/70">{t('subtitle')}</p>
            <div className="mt-9 flex flex-col gap-3 font-grotesk sm:flex-row">
              <Link href={`/${locale}/auth/register`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3.5 font-semibold text-white">{t('primary')}<ChevronRight className="h-4 w-4" /></Link>
              <a href="#etapes" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-6 py-3.5 font-semibold text-white">{t('secondary')}<Play className="h-3.5 w-3.5" /></a>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end"><ChatMock /></div>
        </div>
        <div className="mt-20 lg:mt-28">
          <p className="text-center font-grotesk text-sm text-white/60">{t('proof')}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-x-14 gap-y-7">{SOCIAL_PROOF.logos.map(name => <span key={name} className="font-grotesk text-lg font-bold uppercase text-white/45">{name}</span>)}</div>
        </div>
      </div>
    </section>
  );
}
