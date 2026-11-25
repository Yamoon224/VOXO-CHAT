'use client';

import Link from 'next/link';

import { LandingLogo } from '@/components/landing/LandingLogo';
import { useLandingContent } from '@/hooks/use-landing-content';

function FooterLink({ href, label, locale }) {
  const className =
    'font-grotesk text-sm text-slate-500 transition-colors hover:text-black';

  if (href.startsWith('#')) {
    return (
      <a href={href} className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link href={`/${locale}${href}`} className={className}>
      {label}
    </Link>
  );
}

export function LandingFooter() {
  const year = new Date().getFullYear();
  const { FOOTER_LINKS, FOOTER_COPY, locale } = useLandingContent();

  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-[88rem] px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div>
            <LandingLogo tone="dark" />
            <p className="mt-4 max-w-xs font-grotesk text-sm leading-relaxed text-slate-500">
              {FOOTER_COPY.description}
            </p>
          </div>

          {FOOTER_LINKS.map(column => (
            <div key={column.title}>
              <p className="font-grotesk text-sm font-semibold text-black">
                {column.title}
              </p>
              <ul className="mt-4 space-y-3">
                {column.links.map(link => (
                  <li key={link.label}>
                    <FooterLink href={link.href} label={link.label} locale={locale} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-black/5 pt-7 sm:flex-row">
          <p className="font-grotesk text-xs text-slate-400">
            © {year} VOXO. {FOOTER_COPY.rights}
          </p>
          <div className="flex items-center gap-6">
            <span className="font-grotesk text-xs text-slate-400">
              {FOOTER_COPY.terms}
            </span>
            <span className="font-grotesk text-xs text-slate-400">
              {FOOTER_COPY.privacy}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
