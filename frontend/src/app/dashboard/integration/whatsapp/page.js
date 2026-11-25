import Link from 'next/link'
import { DocCallout } from '@/components/docs/DocCallout'
import { DocChecklist } from '@/components/docs/DocChecklist'
import { DocSection } from '@/components/docs/DocSection'
import { IntegrationDocLayout } from '@/components/docs/IntegrationDocLayout'
import { getLocale } from 'next-intl/server'
import { EnglishIntegrationGuide } from '@/components/docs/EnglishIntegrationGuide'

const SECTIONS = [
  ['start', 'Avant de commencer'], ['meta', 'Créer Meta'], ['credentials', 'Vos identifiants'],
  ['voxo', 'Connecter VOXO'], ['webhook', 'Valider le webhook'], ['test', 'Tester'],
  ['production', 'Passer en production'], ['help', 'Dépannage'],
].map(([id, title]) => ({ id, title }))

export default async function WhatsAppIntegrationPage() {
  const locale = await getLocale()
  if (locale === 'en') return <EnglishIntegrationGuide kind="whatsapp" />
  return <IntegrationDocLayout sections={SECTIONS}>
    <DocSection id="start" title="Connecter WhatsApp Business à VOXO" description="Suivez les étapes dans cet ordre. Comptez 30 à 60 minutes pour un premier essai.">
      <DocCallout title="Ce dont vous avez besoin">Un compte Facebook, un accès administrateur à Meta Business, un numéro disponible pour WhatsApp Business et une URL VOXO publique en HTTPS. Ne communiquez jamais vos secrets par message.</DocCallout>
      <DocChecklist items={['Préparez un numéro dédié au support ; un numéro déjà utilisé dans WhatsApp doit être migré selon les règles Meta.', 'Utilisez le numéro de test Meta pour découvrir le parcours, puis votre numéro réel pour la production.', 'Conservez l’accès administrateur au compte Meta Business : il sera nécessaire pour les jetons et le webhook.']} />
    </DocSection>
    <DocSection id="meta" title="1. Créer l’application Meta" description="Cette application relie votre numéro WhatsApp à VOXO.">
      <ol className="list-decimal space-y-3 pl-5 text-sm text-gray-700"><li>Ouvrez <a className="text-blue-700 underline" href="https://developers.facebook.com/" target="_blank" rel="noreferrer">Meta for Developers</a>, puis <strong>Mes applications</strong> et <strong>Créer une application</strong>.</li><li>Choisissez <strong>Autre</strong>, puis le type <strong>Entreprise</strong>.</li><li>Dans le tableau de bord de l’application, ajoutez le produit <strong>WhatsApp</strong> et ouvrez <strong>Configuration de l’API</strong>.</li><li>Créez ou sélectionnez votre compte WhatsApp Business (WABA), puis ajoutez le numéro qui répondra aux clients.</li></ol>
      <DocCallout variant="warning" title="Numéro de test ou réel">Le numéro de test et le jeton temporaire sont parfaits pour un essai, mais expirent. Ils ne remplacent pas un numéro et un jeton de production.</DocCallout>
    </DocSection>
    <DocSection id="credentials" title="2. Obtenir les trois identifiants" description="VOXO demande trois valeurs distinctes.">
      <DocChecklist items={['Phone Number ID : dans WhatsApp > Configuration de l’API, copiez l’identifiant du numéro, pas son numéro de téléphone.', 'App Secret : dans Paramètres > Général de votre application Meta, cliquez sur Afficher à côté de l’App Secret.', 'Jeton permanent : dans Meta Business Suite > Paramètres d’entreprise > Utilisateurs > Utilisateurs système, créez un utilisateur système, attribuez-lui l’application et le WABA, puis générez un jeton.']} />
      <p className="text-sm text-gray-700">Au moment de générer le jeton, accordez au minimum <code>whatsapp_business_messaging</code> et <code>whatsapp_business_management</code>. Conservez-le dans un gestionnaire de mots de passe.</p>
    </DocSection>
    <DocSection id="voxo" title="3. Connecter le canal dans VOXO">
      <ol className="list-decimal space-y-3 pl-5 text-sm text-gray-700"><li>Ouvrez <Link className="text-blue-700 underline" href={`/${locale}/dashboard/channels`}>Canaux</Link>, puis la carte WhatsApp via Meta.</li><li>Collez le Phone Number ID, le jeton permanent et l’App Secret.</li><li>Cliquez sur <strong>Vérifier</strong>. Le nom ou le numéro professionnel doit apparaître.</li><li>Cliquez sur <strong>Enregistrer</strong>. Copiez immédiatement l’URL et le jeton de vérification affichés par VOXO.</li></ol>
      <DocCallout variant="warning" title="Copiez le jeton maintenant">Pour votre sécurité, VOXO ne réaffiche pas un secret après rechargement. Conservez le jeton de vérification jusqu’à la validation Meta.</DocCallout>
    </DocSection>
    <DocSection id="webhook" title="4. Valider le webhook dans Meta">
      <DocChecklist items={['Dans l’application Meta, ouvrez WhatsApp > Configuration.', 'Dans Webhook, cliquez sur Configurer ou Modifier.', 'Collez l’URL webhook VOXO et le jeton de vérification, puis choisissez Vérifier et enregistrer.', 'Ouvrez Gérer et cochez le champ messages.']} />
      <p className="text-sm text-gray-700">Meta appelle alors VOXO pour vérifier l’URL. Si la vérification échoue, comparez caractère par caractère l’URL et le jeton, puis vérifiez que votre instance VOXO est accessible publiquement en HTTPS.</p>
    </DocSection>
    <DocSection id="test" title="5. Tester le bot"><DocChecklist items={['Envoyez un message depuis un téléphone autorisé à votre numéro WhatsApp Business.', 'Vérifiez que le message apparaît dans Conversations dans VOXO.', 'Vérifiez que la réponse du bot arrive dans WhatsApp.', 'Testez une image ou un document si votre cas d’usage utilise des pièces jointes.']} /></DocSection>
    <DocSection id="production" title="6. Exploiter le canal en production">
      <DocCallout title="Règle des 24 heures">Après le dernier message d’un client, vous disposez d’une fenêtre de 24 heures pour répondre librement. Au-delà, utilisez un modèle de message approuvé par Meta et assurez-vous d’avoir obtenu le consentement du client.</DocCallout>
      <DocChecklist items={['Utilisez un jeton permanent plutôt qu’un jeton de test.', 'Ne donnez accès aux secrets qu’aux administrateurs.', 'Renouvelez immédiatement le jeton si vous suspectez une fuite.', 'Documentez le consentement des clients avant tout message proactif.']} />
    </DocSection>
    <DocSection id="help" title="Dépannage"><div className="space-y-3 text-sm text-gray-700"><p><strong>Jeton refusé :</strong> vérifiez les permissions, les ressources attribuées à l’utilisateur système et l’absence d’expiration.</p><p><strong>Webhook invalide :</strong> contrôlez l’HTTPS, l’URL complète et le jeton de vérification généré par VOXO.</p><p><strong>Aucun message entrant :</strong> vérifiez l’abonnement au champ <code>messages</code> et le Phone Number ID.</p><p><strong>Réponse impossible :</strong> contrôlez la fenêtre de 24 heures, l’état du numéro et les limites Meta.</p></div></DocSection>
  </IntegrationDocLayout>
}
