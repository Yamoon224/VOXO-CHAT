import Link from 'next/link';
import { Check } from 'lucide-react';

export function PricingCard({ plan, featuredLabel, registerHref }) {
  const featured = plan.featured;
  const features = Array.isArray(plan.features) ? plan.features : [];
  return <article className={`relative flex min-h-full flex-col rounded-[1.75rem] border p-7 shadow-xl ${featured ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-blue-500/25 lg:-translate-y-3' : 'border-slate-200 bg-white text-slate-950 shadow-slate-900/10'}`}>
    {featured && <span className="absolute right-6 top-0 -translate-y-1/2 rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">{featuredLabel}</span>}
    <p className={`font-grotesk text-sm font-semibold uppercase tracking-wide ${featured ? 'text-blue-100' : 'text-slate-500'}`}>{plan.name}</p>
    <p className="mt-6 font-display text-6xl font-normal leading-none tracking-tight">{plan.price}</p><p className={`mt-2 font-grotesk text-sm ${featured ? 'text-blue-100' : 'text-slate-500'}`}>{plan.period}</p>
    <p className={`mt-5 font-grotesk text-sm leading-relaxed ${featured ? 'text-white/85' : 'text-slate-600'}`}>{plan.tagline}</p>
    <ul className="mt-7 flex-1 space-y-3">{features.map(feature => <li key={feature} className={`flex items-start gap-2.5 font-grotesk text-sm ${featured ? 'text-white' : 'text-slate-700'}`}><Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{feature}</li>)}</ul>
    <Link href={registerHref} className={`mt-8 rounded-xl px-5 py-3 text-center font-grotesk text-sm font-semibold transition-transform hover:-translate-y-0.5 ${featured ? 'bg-white text-[#1d4fd8]' : 'bg-slate-950 text-white hover:bg-slate-800'}`}>{plan.ctaLabel}</Link>
  </article>;
}
