'use client';

import { useLandingContent } from '@/hooks/use-landing-content';
import { getLandingIcon } from '@/lib/landing-icons.mjs';

// Chaque ligne du titre s'éclaircit vers le gris, comme sur le design.
const LINE_TONE = ['text-white', 'text-white/70', 'text-white/45'];

export function LandingSolutions() {
  const { SECTION_HEADERS, SOLUTION_CARDS } = useLandingContent();
  return (
    <section id="solutions" className="scroll-mt-20 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
        <h2 className="font-display text-5xl font-normal leading-[1.05] tracking-tight sm:text-6xl xl:text-7xl">
          {SECTION_HEADERS.solutions.map((line, index) => (
            <span key={line} className={`block ${LINE_TONE[index]}`}>
              {line}
            </span>
          ))}
        </h2>

        <div className="mt-20 grid gap-10 lg:grid-cols-3 lg:gap-14">
          {SOLUTION_CARDS.map(card => {
            const Icon = getLandingIcon(card.icon);

            return (
              <div key={card.title}>
                <Icon
                  className="h-6 w-6 text-white/70"
                  strokeWidth={1.25}
                  aria-hidden="true"
                />
                <p className="mt-6 font-grotesk text-[15px] leading-relaxed text-white/65">
                  <span className="font-semibold text-white">{card.title}</span>{' '}
                  {card.text}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-20 border-t border-dashed border-white/20" />
      </div>
    </section>
  );
}
