'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ScreenshotFrame } from '@/components/landing/ScreenshotFrame';
import { LandingReveal } from '@/components/landing/LandingReveal';
import { useLandingContent } from '@/hooks/use-landing-content';

export function LandingHowItWorks() {
  const { HERO, STEPS, STEPS_CTA, STEPS_HEADER, locale } = useLandingContent();
  return <section id="etapes" className="scroll-mt-20 bg-gradient-to-b from-white to-[#FAFAFA] py-24 sm:py-32"><div className="mx-auto max-w-[88rem] px-5 sm:px-8"><div className="grid gap-14 lg:grid-cols-[0.8fr_2.2fr]"><h2 className="font-display text-4xl font-normal leading-[1.05] tracking-tight text-[#0B1220] sm:text-5xl">{STEPS_HEADER.title}<span className="block opacity-40">{STEPS_HEADER.accent}</span></h2><ol className="grid gap-x-8 gap-y-12 sm:grid-cols-2">{STEPS.map((step, index) => <LandingReveal key={step.title} delay={index * 0.08}><li><div className="flex items-center gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111] font-mono text-xs font-semibold text-white">{String(index + 1).padStart(2, '0')}</span><span aria-hidden="true" className="h-px flex-1 bg-slate-200" /></div><h3 className="mt-6 font-grotesk text-lg font-semibold text-[#0B1220]">{step.title}</h3><p className="mt-2.5 max-w-sm font-grotesk text-sm leading-relaxed text-slate-500">{step.text}</p><div className="mt-7 overflow-hidden rounded-2xl bg-slate-100 p-5"><ScreenshotFrame src={step.shot} alt={step.alt} tilt={index % 2 === 0 ? 'left' : 'right'} /></div></li></LandingReveal>)}</ol></div><div className="mt-20 max-w-md"><p className="font-display text-3xl font-normal leading-[1.1] tracking-tight text-[#0B1220] sm:text-4xl">{STEPS_CTA.title}<span className="block opacity-40">{STEPS_CTA.accent}</span></p><Link href={`/${locale}/auth/register`} className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3.5 font-grotesk text-[15px] font-semibold text-white transition-colors hover:bg-[#1d4fd8]">{HERO.primaryCta}<ChevronRight className="h-4 w-4" aria-hidden="true" /></Link></div></div></section>;
}
