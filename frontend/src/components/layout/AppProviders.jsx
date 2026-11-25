'use client';

import { useAuthInit } from '@/hooks/use-auth';
import { ToastProvider } from '@/components/ui/toast-provider';
import { OneSignalIdentity } from '@/components/notifications/OneSignalIdentity';
import { NextIntlClientProvider } from 'next-intl';

/**
 * Fournisseurs applicatifs côté client.
 *
 * Extrait du layout racine pour que celui-ci reste un Server Component :
 * l'API Metadata de Next n'est supportée que dans les Server Components,
 * ce dont la landing publique a besoin pour son référencement.
 */
export function AppProviders({ children, locale, messages }) {
  useAuthInit(); // Initialiser l'authentification au chargement

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
      <OneSignalIdentity />
      <ToastProvider />
    </NextIntlClientProvider>
  );
}
