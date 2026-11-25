import './globals.css';
import { AppProviders } from '@/components/layout/AppProviders';
import { headers } from 'next/headers';
import { normalizeLocale } from '@/i18n/config';
import frMessages from '@/messages/fr.json';
import enMessages from '@/messages/en.json';

export async function generateMetadata() {
  const locale = normalizeLocale((await headers()).get('x-voxo-locale'));
  const copy = (locale === 'en' ? enMessages : frMessages).Metadata;
  return {
    title: { default: copy.title, template: '%s · VOXO' },
    description: copy.description,
    alternates: { languages: { fr: '/fr', en: '/en' } },
    openGraph: { type: 'website', locale: locale === 'en' ? 'en_US' : 'fr_FR', siteName: 'VOXO' },
  };
}

export default async function RootLayout({ children }) {
  const locale = normalizeLocale((await headers()).get('x-voxo-locale'));
  const messages = locale === 'en' ? enMessages : frMessages;
  return (
    <html lang={locale}>
      <body className="font-sans">
        <AppProviders locale={locale} messages={messages}>{children}</AppProviders>
      </body>
    </html>
  );
}
