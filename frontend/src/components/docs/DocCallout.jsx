import { AlertTriangle, Info } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const ICONS = { nutshell: Info, warning: AlertTriangle }
const DEFAULT_TITLES = { nutshell: 'En bref', warning: 'Attention' }

/**
 * Encadré de documentation : « nutshell » (résumé/note) ou « warning »
 * (avertissement). Compose `Alert` plutôt que de le dupliquer — seules les
 * couleurs (`ui/alert.jsx`) et l'icône par défaut sont propres à la doc.
 */
export function DocCallout({ variant = 'nutshell', title, children }) {
  const Icon = ICONS[variant] ?? Info

  return (
    <Alert variant={variant}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{title ?? DEFAULT_TITLES[variant]}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}
