import { DocSection } from '@/components/docs/DocSection'
import { DocTable } from '@/components/docs/DocTable'

const ROWS = [
  ["URL interne refusée à l'enregistrement", "L'URL cible une adresse locale/privée", "Utilisez l'URL publique de votre API (pas localhost ni une IP interne)"],
  ['Une action portant ce nom existe déjà', 'Le nom choisi est déjà utilisé dans votre compte', 'Choisissez un nom différent'],
  ['Le test renvoie network_error ou timeout', 'Votre API est injoignable ou trop lente', "Vérifiez que l'URL est accessible depuis internet ; augmentez le délai si votre API est simplement lente"],
  ["L'authentification semble échouer côté de votre API", "Le secret n'a pas été (re)saisi, ou {{secret}} est absent des en-têtes", "Vérifiez la présence de {{secret}} dans les en-têtes et resaisissez le secret si nécessaire"],
  ["Le chatbot n'utilise jamais l'action alors qu'elle est active", "Description trop vague, ou question du visiteur trop éloignée du cas décrit", "Reformulez la description en étant plus explicite sur le cas d'usage couvert"],
  ['Beaucoup de tours limités dans la consommation', "Réponses d'API trop volumineuses ou descriptions ambiguës", 'Simplifiez la réponse renvoyée par votre endpoint, clarifiez les descriptions'],
]

export function TroubleshootingSection() {
  return (
    <DocSection id="depannage" title="Dépannage">
      <DocTable columns={['Symptôme', 'Cause probable', 'À faire']} rows={ROWS} />
    </DocSection>
  )
}
