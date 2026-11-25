'use client';

import { DarkCard } from '@/components/landing/DarkCard';
import { SectionHeading } from '@/components/landing/SectionHeading';
import { useLandingContent } from '@/hooks/use-landing-content';

export function LandingTestimonials() {
  const { SECTION_HEADERS, TESTIMONIALS, locale } = useLandingContent();
  return (
    <section id="clients" className="scroll-mt-20 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
        <SectionHeading
          title={SECTION_HEADERS.testimonials.title}
          accent={SECTION_HEADERS.testimonials.accent}
        />

        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {TESTIMONIALS.map(item => (
            <DarkCard key={item.company} className="flex flex-col p-7">
              <blockquote className="flex-1 font-display text-xl font-normal leading-snug text-white">
                {locale === 'fr' ? `« ${item.quote} »` : `“${item.quote}”`}
              </blockquote>

              <div className="mt-8 border-t border-white/10 pt-5">
                <p className="font-display text-3xl font-normal text-white">
                  {item.metric}
                </p>
                <p className="mt-1 font-grotesk text-xs uppercase tracking-wider text-white/40">
                  {item.metricLabel}
                </p>
              </div>

              <div className="mt-5 font-grotesk">
                <p className="text-sm font-medium text-white">{item.company}</p>
                <p className="text-xs text-white/45">{item.person}</p>
              </div>
            </DarkCard>
          ))}
        </div>
      </div>
    </section>
  );
}
