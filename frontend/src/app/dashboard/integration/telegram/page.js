import Link from 'next/link'
import { DocCallout } from '@/components/docs/DocCallout'
import { DocChecklist } from '@/components/docs/DocChecklist'
import { DocSection } from '@/components/docs/DocSection'
import { IntegrationDocLayout } from '@/components/docs/IntegrationDocLayout'
import { getLocale } from 'next-intl/server'
import { EnglishIntegrationGuide } from '@/components/docs/EnglishIntegrationGuide'

const SECTIONS = [['start', 'Avant de commencer'], ['bot', 'Créer le bot'], ['setup', 'Configurer VOXO'], ['test', 'Tester'], ['options', 'Personnaliser'], ['help', 'Dépannage'], ['security', 'Sécurité']].map(([id, title]) => ({ id, title }))

export default async function TelegramIntegrationPage() {
  const locale = await getLocale()
  if (locale === 'en') return <EnglishIntegrationGuide kind="telegram" />
  return <IntegrationDocLayout sections={SECTIONS}>
    <DocSection id="start" title="Créer et connecter un bot Telegram" description="Telegram permet d’ouvrir rapidement votre assistant aux utilisateurs qui préfèrent la messagerie."><DocCallout>Vous n’avez besoin que d’un compte Telegram et du droit de créer un bot. VOXO configure son webhook automatiquement.</DocCallout></DocSection>
    <DocSection id="bot" title="1. Créer votre bot avec BotFather"><ol className="list-decimal space-y-3 pl-5 text-sm text-gray-700"><li>Dans Telegram, ouvrez <a className="text-blue-700 underline" href="https://t.me/botfather" target="_blank" rel="noreferrer">@BotFather</a> ; vérifiez le compte officiel.</li><li>Envoyez <code>/newbot</code>, puis indiquez le nom visible du bot.</li><li>Choisissez son identifiant public. Il doit se terminer par <code>bot</code>.</li><li>Copiez le Bot Token affiché par BotFather et rangez-le dans un gestionnaire de mots de passe.</li></ol><DocCallout variant="warning" title="Le token est une clé">Toute personne qui possède ce token peut piloter votre bot. Ne le publiez jamais et révoquez-le dans BotFather en cas de doute.</DocCallout></DocSection>
    <DocSection id="setup" title="2. Connecter Telegram dans VOXO"><DocChecklist items={['Ouvrez Canaux > Telegram dans VOXO.', 'Collez le Bot Token obtenu dans BotFather.', 'Cliquez sur Vérifier : le nom et l’identifiant du bot doivent être affichés.', 'Cliquez sur Activer l’intégration. VOXO enregistre automatiquement le webhook Telegram.']} /><p className="mt-4 text-sm text-gray-700">Vous n’avez aucune URL de webhook à copier dans Telegram : VOXO s’en charge.</p></DocSection>
    <DocSection id="test" title="3. Tester le bot"><DocChecklist items={['Ouvrez le lien public <code>https://t.me/votre_identifiant_bot</code>.', 'Cliquez sur Démarrer ou envoyez <code>/start</code>.', 'Envoyez une question normale.', 'Vérifiez le message et la réponse dans Conversations dans VOXO.']} /></DocSection>
    <DocSection id="options" title="4. Personnaliser le bot"><DocChecklist items={['Dans BotFather, utilisez /setdescription, /setabouttext et /setuserpic pour présenter le bot.', 'Utilisez /setcommands pour ajouter des commandes visibles.', 'Pour les groupes, utilisez /setprivacy. Gardez la confidentialité activée pour un bot de support en privé ; désactivez-la seulement si le bot doit lire tous les messages de groupe.']} /></DocSection>
    <DocSection id="help" title="Dépannage"><div className="space-y-3 text-sm text-gray-700"><p><strong>Token invalide :</strong> collez de nouveau le token sans espace. S’il a été révoqué, créez-en un nouveau avec BotFather et reconnectez VOXO.</p><p><strong>Le bot ne répond pas :</strong> envoyez d’abord /start, vérifiez qu’il est actif dans VOXO et que personne n’a remplacé son webhook.</p><p><strong>Le bot ignore un groupe :</strong> vérifiez son ajout au groupe et le réglage /setprivacy dans BotFather.</p></div></DocSection>
    <DocSection id="security" title="Checklist de sécurité"><DocChecklist items={['Réservez le Bot Token aux administrateurs.', 'Révoquez et remplacez le token en cas de perte.', 'Testez le bot après chaque changement de token.', 'Vérifiez périodiquement l’état du canal dans VOXO.']} /><p className="mt-4 text-sm text-gray-700">Retournez à <Link className="text-blue-700 underline" href={`/${locale}/dashboard/channels`}>Canaux</Link> pour vérifier l’état de la connexion.</p></DocSection>
  </IntegrationDocLayout>
}
