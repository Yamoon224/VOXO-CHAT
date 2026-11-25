'use client';

import { FeatureCard } from '@/components/landing/FeatureCard';
import { SectionHeading } from '@/components/landing/SectionHeading';
import { useLandingContent } from '@/hooks/use-landing-content';

export function LandingFeatures() {
  const { FEATURES, FEATURES_HEADER } = useLandingContent();
  return (
    <section
      id="fonctionnalites"
      className="scroll-mt-20 rounded-t-[2.5rem] bg-gradient-to-b from-[#D9E6FB] via-[#EDF3FD] to-white py-24 sm:rounded-t-[3.5rem] sm:py-32"
    >
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
        <SectionHeading
          title={FEATURES_HEADER.title}
          accent={FEATURES_HEADER.accent}
          className="text-[#0B1220]"
        />

        <div className="mt-16 space-y-6 sm:mt-20">
          {FEATURES.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
