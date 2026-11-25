import { Instrument_Sans, Instrument_Serif } from 'next/font/google';

import { LandingNav } from '@/components/landing/LandingNav';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingWhy } from '@/components/landing/LandingWhy';
import { LandingSolutions } from '@/components/landing/LandingSolutions';
import { LandingTrust } from '@/components/landing/LandingTrust';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingHowItWorks } from '@/components/landing/LandingHowItWorks';
import { LandingIntegrations } from '@/components/landing/LandingIntegrations';
import { LandingTestimonials } from '@/components/landing/LandingTestimonials';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingCta } from '@/components/landing/LandingCta';
import { LandingFooter } from '@/components/landing/LandingFooter';

// Polices scopées à la landing : ne pas les charger dans le layout racine,
// sinon tout le dashboard en hérite.
const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
});
const grotesk = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-grotesk',
});


/**
 * Landing page publique.
 *
 * Volontairement 100 % statique : le healthcheck Docker sonde `GET /` et
 * échoue au-delà de 500. Aucun appel API, aucun état, aucun accès `window`.
 *
 * Le thème sombre est porté en classes explicites sur ce conteneur — les
 * tokens shadcn de `globals.css` restent clairs pour tout le reste de
 * l'application (dashboard, authentification, administration).
 */
export default function LandingPage() {
  return (
    <div
      className={`${display.variable} ${grotesk.variable} min-h-screen bg-black text-white antialiased`}
    >
      <LandingNav />
      <main>
        <LandingHero />
        <LandingWhy />
        <LandingSolutions />
        <LandingTrust />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingIntegrations />
        <LandingTestimonials />
        <LandingPricing />
        <LandingFaq />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
