'use client';

import { useLandingContent } from '@/hooks/use-landing-content';
import { getLandingIcon } from '@/lib/landing-icons.mjs';

// Positions orbitales (en %) autour du moteur central, façon diagramme.
const ORBIT = [
  { top: '12%', left: '10%', color: 'bg-[#25D366]' },
  { top: '58%', left: '4%', color: 'bg-[#229ED9]' },
  { top: '30%', left: '26%', color: 'bg-[#0084FF]' },
  { top: '14%', left: '72%', color: 'bg-[#7B61FF]' },
  { top: '56%', left: '82%', color: 'bg-[#96BF48]' },
  { top: '34%', left: '64%', color: 'bg-[#F59E0B]' },
];

export function LandingIntegrations() {
  const { INTEGRATIONS } = useLandingContent();
  return (
    <section id="integrations" className="scroll-mt-20 bg-white pb-6">
      <div className="rounded-[2.5rem] bg-black px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-[76rem]">
          <h2 className="mx-auto max-w-4xl text-balance text-center font-display text-4xl font-normal leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
            {INTEGRATIONS.title}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-center font-grotesk text-[15px] leading-relaxed text-white/60">
            {INTEGRATIONS.subtitle}
          </p>

          <div className="relative mt-16 min-h-[24rem] rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.16),transparent_65%)] p-6">
            {/* Moteur central */}
            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-[#0C0C0C] px-6 py-5 text-center shadow-2xl shadow-blue-500/20">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
                VOXO
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">
                AI Engine
              </p>
            </div>

            {/* Canaux en orbite : superposés en grand écran, empilés en mobile */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:hidden">
              {INTEGRATIONS.channels.map(channel => {
                const Icon = getLandingIcon(channel.icon);
                return (
                  <div
                    key={channel.name}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3"
                  >
                    <Icon
                      className="h-4 w-4 shrink-0 text-white/70"
                      aria-hidden="true"
                    />
                    <span className="truncate font-grotesk text-xs text-white/80">
                      {channel.name}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="hidden lg:block">
              {INTEGRATIONS.channels.map((channel, index) => {
                const Icon = getLandingIcon(channel.icon);
                const spot = ORBIT[index];

                return (
                  <div
                    key={channel.name}
                    className="absolute flex flex-col items-center gap-2"
                    style={{ top: spot.top, left: spot.left }}
                  >
                    <span
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${spot.color} shadow-lg shadow-black/50`}
                    >
                      <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </span>
                    <span className="font-grotesk text-xs text-white/60">
                      {channel.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
