'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

import { LandingLogo } from '@/components/landing/LandingLogo';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { useLandingContent } from '@/hooks/use-landing-content';
import { useLocale, useTranslations } from 'next-intl';

const PRIMARY =
  'rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1d4fd8]';
const SECONDARY =
  'rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.18]';

export function LandingNav() {
  const t = useTranslations('Navigation');
  const locale = useLocale();
  const { NAV_LINKS } = useLandingContent();
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-black/85 font-grotesk backdrop-blur-xl">
      <nav className="mx-auto flex h-[4.5rem] max-w-[88rem] items-center justify-between px-5 sm:px-8">
        <LandingLogo />

        <div className="hidden items-center gap-8 xl:flex">
          {NAV_LINKS.map((link, index) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-white/85 transition-colors hover:text-white"
            >
              {t(`links.${index}`)}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2.5 xl:flex">
          <LanguageSwitcher className="text-white" />
          <Link href={`/${locale}/auth/login`} className={SECONDARY}>
            {t('login')}
          </Link>
          <Link href={`/${locale}/auth/register`} className={PRIMARY}>
            {t('register')}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(open => !open)}
          aria-expanded={isOpen}
          aria-label={isOpen ? t('closeMenu') : t('openMenu')}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white xl:hidden"
        >
          {isOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </nav>

      {isOpen ? (
        <div className="landing-mobile-menu border-t border-white/10 bg-black px-5 pb-6 pt-4 xl:hidden">
          <div className="flex flex-col">
            {NAV_LINKS.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/85 hover:bg-white/5 hover:text-white"
              >
                {t(`links.${index}`)}
              </a>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            <LanguageSwitcher className="text-white" />
            <Link
              href={`/${locale}/auth/login`}
              onClick={closeMenu}
              className={`${SECONDARY} text-center`}
            >
              {t('login')}
            </Link>
            <Link
              href={`/${locale}/auth/register`}
              onClick={closeMenu}
              className={`${PRIMARY} text-center`}
            >
              {t('register')}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
