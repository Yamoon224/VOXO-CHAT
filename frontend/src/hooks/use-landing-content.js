'use client';

import { useLocale } from 'next-intl';
import * as frContent from '@/lib/landing-content.mjs';
import * as enContent from '@/lib/landing-content-en.mjs';
import * as frFeatures from '@/lib/landing-features.mjs';
import * as enFeatures from '@/lib/landing-features-en.mjs';
import * as frPricing from '@/lib/landing-pricing.mjs';
import * as enPricing from '@/lib/landing-pricing-en.mjs';
import { FAQ_ITEMS as frFaq } from '@/lib/landing-faq.mjs';
import { FAQ_ITEMS as enFaq } from '@/lib/landing-faq-en.mjs';

export function useLandingContent() {
  const isEnglish = useLocale() === 'en';
  return {
    ...(isEnglish ? enContent : frContent), ...(isEnglish ? enFeatures : frFeatures), ...(isEnglish ? enPricing : frPricing),
    FAQ_ITEMS: isEnglish ? enFaq : frFaq,
    locale: isEnglish ? 'en' : 'fr',
  };
}
