'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PricingCard } from '@/components/landing/PricingCard';
import { SectionHeading } from '@/components/landing/SectionHeading';
import { LandingReveal } from '@/components/landing/LandingReveal';
import { usePublicPlans } from '@/hooks/use-public-plans';
import { useLandingContent } from '@/hooks/use-landing-content';
import { buildLandingPlans } from '@/lib/landing-plan-view.mjs';

const CURRENCIES = ['EUR', 'USD', 'XOF'];
const names = { EUR: 'EUR', USD: 'USD', XOF: 'FCFA' };

export function LandingPricing() {
  const [currency, setCurrency] = useState('EUR');
  const { plans: remotePlans } = usePublicPlans();
  const { PRICING_ENTERPRISE, PRICING_HEADER, PRICING_PLANS, PRICING_COPY, locale } = useLandingContent();
  const plans = buildLandingPlans({
    remotePlans, staticPlans: PRICING_PLANS, copy: PRICING_COPY, currency, locale,
  });

  return <section id="tarifs" className="scroll-mt-20 bg-gradient-to-b from-[#FDEEE8] to-[#FEF7F3] py-24 sm:py-32">
    <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
      <SectionHeading title={PRICING_HEADER.title} accent={PRICING_HEADER.accent} className="text-[#0B1220]" />
      <div className="mt-8 flex justify-center sm:justify-end">
        <label className="flex items-center gap-2 font-grotesk text-sm font-medium text-slate-700">
          {PRICING_COPY.currency}
          <select value={currency} onChange={event => setCurrency(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-950">
            {CURRENCIES.map(item => <option key={item} value={item}>{names[item]}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-3">
        {plans.map((plan, index) => <LandingReveal key={plan.id} delay={index * 0.1}><PricingCard plan={plan} featuredLabel={PRICING_COPY.featured} registerHref={`/${locale}/auth/register`} /></LandingReveal>)}
      </div>
      <div className="mt-10 flex flex-col items-center justify-between gap-5 rounded-2xl border border-black/5 bg-white/70 p-7 sm:flex-row">
        <div><p className="font-grotesk text-lg font-semibold text-[#0B1220]">{PRICING_ENTERPRISE.name}</p><p className="mt-1.5 max-w-2xl font-grotesk text-sm text-slate-600">{PRICING_ENTERPRISE.text}</p></div>
        <Link href={`/${locale}/auth/register`} className="shrink-0 rounded-lg border border-black/10 bg-white px-6 py-2.5 font-grotesk text-sm font-semibold text-[#0B1220] transition-colors hover:bg-black/[0.03]">{PRICING_ENTERPRISE.ctaLabel}</Link>
      </div>
    </div>
  </section>;
}
