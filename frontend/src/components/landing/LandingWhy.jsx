'use client';

import { useLandingContent } from '@/hooks/use-landing-content';

// Inclinaisons et décalages appliqués seulement à partir de `lg` : en dessous,
// les cartes restent droites et empilées, sinon elles deviennent illisibles.
const PLACEMENT = [
  'lg:-rotate-[7deg] lg:translate-y-6',
  'lg:rotate-[2deg] lg:-translate-y-4',
  'lg:rotate-[6deg] lg:translate-y-2',
  'lg:-rotate-[4deg] lg:translate-y-16',
  'lg:rotate-[5deg] lg:translate-y-24',
];

export function LandingWhy() {
  const { WHY_ITEMS, SECTION_HEADERS } = useLandingContent();
  return (
    <section
      id="pourquoi"
      className="relative scroll-mt-20 overflow-hidden bg-black py-24 sm:py-32"
    >
      {/* Typographie fantôme : le mot de la section, en très grand, derrière les cartes */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none bg-gradient-to-b from-[#9DB9E8] via-[#4A6FA8] to-transparent bg-clip-text text-center font-display text-[26vw] leading-none text-transparent opacity-30"
      >
        {SECTION_HEADERS.why.ghost}
      </span>

      <div className="relative mx-auto max-w-[82rem] px-5 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-2">
          {WHY_ITEMS.map((item, index) => (
            <div
              key={item.title}
              className={`rounded-2xl bg-[#1E1E1E]/95 p-6 shadow-2xl shadow-black/60 ring-1 ring-white/[0.06] backdrop-blur-sm ${PLACEMENT[index]}`}
            >
              <h3 className="font-grotesk text-lg font-semibold text-white">
                {item.title}
              </h3>
              <p className="mt-3 font-grotesk text-sm leading-relaxed text-white/65">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
