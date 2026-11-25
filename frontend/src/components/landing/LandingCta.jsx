'use client';

import Link from 'next/link';
import { ChevronRight, Play } from 'lucide-react';
import { AuroraBackdrop } from '@/components/landing/AuroraBackdrop';
import { useLandingContent } from '@/hooks/use-landing-content';

export function LandingCta() {
  const { FINAL_CTA, HERO, locale } = useLandingContent();
  return <section className="relative overflow-hidden bg-black py-28 sm:py-36"><AuroraBackdrop position="bottom" className="h-[30rem]" /><div className="relative mx-auto grid max-w-[88rem] items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1.4fr_1fr]"><h2 className="font-display text-5xl font-normal leading-[1.02] tracking-tight text-white sm:text-6xl xl:text-7xl">{FINAL_CTA.title}</h2><div className="lg:justify-self-end"><div className="flex flex-col gap-3 font-grotesk sm:flex-row lg:flex-col"><Link href={`/${locale}/auth/register`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#1d4fd8]">{HERO.primaryCta}<ChevronRight className="h-4 w-4" aria-hidden="true" /></Link><a href="#etapes" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-white/[0.18]">{HERO.secondaryCta}<Play className="h-3.5 w-3.5" aria-hidden="true" /></a></div></div><p className="max-w-lg font-grotesk text-lg text-white/70 lg:col-span-2">{FINAL_CTA.subtitle}</p></div></section>;
}
