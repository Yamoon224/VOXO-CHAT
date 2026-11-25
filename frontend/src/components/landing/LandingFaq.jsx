'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useLandingContent } from '@/hooks/use-landing-content';

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const { SECTION_HEADERS, FAQ_ITEMS, FAQ_CONTACT, locale } = useLandingContent();
  return <section id="faq" className="scroll-mt-20 bg-black py-24 sm:py-32"><div className="mx-auto grid max-w-[88rem] gap-14 px-5 sm:px-8 lg:grid-cols-[0.8fr_2.2fr]"><div><h2 className="font-display text-4xl font-normal leading-[1.05] tracking-tight text-white sm:text-5xl">{SECTION_HEADERS.faq.title}<span className="block opacity-40">{SECTION_HEADERS.faq.accent}</span></h2><Link href={`/${locale}/auth/register`} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-3 font-grotesk text-sm font-semibold text-white transition-colors hover:bg-[#1d4fd8]">{FAQ_CONTACT}<ChevronRight className="h-4 w-4" aria-hidden="true" /></Link></div><div className="divide-y divide-white/10 border-y border-white/10">{FAQ_ITEMS.map((item, index) => { const open = index === openIndex; const panelId = `faq-panel-${index}`; return <div key={item.question}><button type="button" onClick={() => setOpenIndex(open ? -1 : index)} aria-expanded={open} aria-controls={panelId} className="flex w-full items-center justify-between gap-6 py-5 text-left font-grotesk text-base font-medium text-white transition-colors hover:text-blue-300"><span>{item.question}</span><ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${open ? 'rotate-180 text-blue-300' : ''}`} aria-hidden="true" /></button><AnimatePresence initial={false}>{open && <motion.div id={panelId} role="region" initial={reducedMotion ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={reducedMotion ? undefined : { height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden"><p className="max-w-2xl pb-6 font-grotesk text-sm leading-relaxed text-white/65">{item.answer}</p></motion.div>}</AnimatePresence></div>})}</div></div></section>;
}
