'use client';

import { DarkCard } from '@/components/landing/DarkCard';
import { useLandingContent } from '@/hooks/use-landing-content';
import { getLandingIcon } from '@/lib/landing-icons.mjs';

/** Couronne d'étoiles décorative (RGPD / Europe), en 12 points. */
function StarRing({ label }) {
  return (
    <span className="relative block h-20 w-20 text-white/25">
      {Array.from({ length: 12 }, (_, index) => (
        <span
          key={index}
          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-[1px] bg-current"
          style={{
            transform: `rotate(${index * 30}deg) translateY(-2.15rem)`,
          }}
        />
      ))}
      <span className="absolute inset-0 flex items-center justify-center font-grotesk text-[11px] font-semibold tracking-wider text-white/40">
        {label}
      </span>
    </span>
  );
}

export function LandingTrust() {
  const { TRUST_BADGES, locale } = useLandingContent();
  return (
    <section className="bg-black pb-24 sm:pb-32">
      <div className="mx-auto grid max-w-[88rem] gap-5 px-5 sm:px-8 lg:grid-cols-3">
        {TRUST_BADGES.map(card => {
          const Icon = getLandingIcon(card.icon);

          return (
            <DarkCard key={card.title} className="flex flex-col p-7">
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-white/40">
                  {card.badge}
                </span>
                {card.icon === 'ShieldCheck' ? (
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/[0.06]">
                    <Icon
                      className="h-7 w-7 text-white/30"
                      strokeWidth={1.25}
                      aria-hidden="true"
                    />
                  </span>
                ) : (
                  <StarRing
                    label={card.icon === 'FileLock2' ? (locale === 'en' ? 'GDPR' : 'RGPD') : (locale === 'en' ? 'EU' : 'UE')}
                  />
                )}
              </div>

              <h3 className="mt-16 font-grotesk text-lg font-semibold text-white">
                {card.title}
              </h3>
              <p className="mt-3 font-grotesk text-sm leading-relaxed text-white/65">
                {card.text}
              </p>
            </DarkCard>
          );
        })}
      </div>
    </section>
  );
}
