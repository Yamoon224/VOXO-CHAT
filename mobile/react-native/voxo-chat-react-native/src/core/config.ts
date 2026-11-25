import type { VoxoAdapters } from '../adapters/types'
import { VoxoError } from './errors'
import { isUuidV4 } from './uuid'
import { normalizeLocale, voxoText } from '../i18n'

/**
 * Identité de l'utilisateur, quand l'application hôte la connaît déjà.
 *
 * Fournie, elle évite le formulaire de pré-chat : c'est le cas courant dans une
 * application mobile où l'utilisateur est authentifié.
 */
export interface VoxoUser {
  name?: string
  email?: string
  /**
   * Identifiant stable côté application hôte. À défaut, le SDK génère et
   * persiste un identifiant anonyme.
   */
  externalId?: string
}

/**
 * Réglages locaux du SDK. Tout ce qui relève de l'apparence et des
 * fonctionnalités activées vient de `GET /widget/config`, décidé par le
 * propriétaire du chatbot depuis son dashboard : on ne le duplique pas ici.
 */
export interface VoxoOptions {
  /** Indicateur « en train d'écrire » pendant l'attente de la réponse. */
  enableTyping?: boolean
  /**
   * Relances puis clôture automatique après 10 minutes de silence. À couper si
   * l'application gère elle-même le cycle de vie de la conversation.
   */
  enableInactivityMonitor?: boolean
  /** Restauration de la conversation au redémarrage de l'application. */
  persistSession?: boolean
  /** Journalise les échanges réseau. À laisser à `false` en production. */
  debug?: boolean
  /**
   * Affiche le bouton de bascule FR/EN dans l'en-tête du chat
   * (`VoxoChatView`/`ChatHeader`). Actif par défaut ; à couper si
   * l'application hôte impose déjà sa propre langue et ne veut pas laisser le
   * choix à l'utilisateur.
   */
  showLanguageSwitcher?: boolean
  /**
   * Aperçu de la saisie envoyé au conseiller pendant une reprise humaine. N'a
   * d'effet que si le propriétaire a aussi activé
   * `options.features.liveTypingPreview` ; à couper pour ne jamais rien
   * transmettre avant l'envoi du message.
   */
  enableLiveTyping?: boolean
}

export interface VoxoConfigInput {
  /** Racine de l'API, terminée par `/api`. Exemple : `https://api.voxo.chat/api`. */
  apiUrl: string
  /** UUID v4 du tenant. Envoyé en header `X-Tenant-ID` sur chaque requête. */
  tenantId: string
  /**
   * Langue de l'interface : `'fr'` ou `'en'`. À défaut, déduite de la locale
   * de l'appareil (`Intl.DateTimeFormat().resolvedOptions().locale`), avec
   * repli sur `'fr'` pour toute langue non couverte. Un choix explicite fait
   * par l'utilisateur via `client.setLocale()` est persisté (voir
   * `VoxoOptions.persistSession`) et prime sur cette valeur au prochain
   * démarrage.
   */
  locale?: 'fr' | 'en'
  /**
   * Identifiant de l'application (package name Android / bundle identifier
   * iOS), envoyé en `X-App-Id` et en paramètre `appId` du WebSocket pour le
   * contrôle d'applications autorisées du propriétaire. React Native ne le
   * détecte pas seul : passez-le (par exemple via `react-native-device-info`,
   * côté application hôte). Espaces retirés ; vide = non envoyé.
   */
  appId?: string
  user?: VoxoUser
  options?: VoxoOptions
  /**
   * Remplace les capacités natives par défaut — stockage, sélecteur de
   * fichiers, compression, ouverture de liens. C'est ce qui permet à une
   * application Expo d'apporter les siennes, et aux tests de n'en charger
   * aucune.
   */
  adapters?: Partial<VoxoAdapters>
}

const DEFAULT_OPTIONS: Required<VoxoOptions> = {
  enableTyping: true,
  enableInactivityMonitor: true,
  persistSession: true,
  debug: false,
  showLanguageSwitcher: true,
  enableLiveTyping: true,
}

export interface VoxoConfig {
  readonly apiUrl: string
  readonly tenantId: string
  /**
   * Mutable : `client.setLocale()` la réassigne en place, ce qui suffit à
   * relocaliser tout ce qui la lit au moment de l'appel (textes de l'UI,
   * `Accept-Language`, messages d'erreur) sans reconstruire le client.
   */
  locale: 'fr' | 'en'
  /** Identifiant d'application normalisé ; `undefined` s'il n'est pas renseigné. */
  readonly appId?: string
  readonly user?: VoxoUser
  readonly options: Required<VoxoOptions>
  readonly adapters: Partial<VoxoAdapters>
  /** URL du flux temps réel de la conversation. */
  conversationSocketUrl(sessionId: string): string
}

/**
 * Valide et normalise la configuration d'initialisation.
 *
 * `apiUrl` et `tenantId` sont fournis par l'intégrateur — ils figurent dans
 * l'onglet Intégration du dashboard VOXO. Le `tenantId` n'est pas un secret : il
 * est déjà public dans le `<script>` du widget web. Aucun autre secret ne doit
 * transiter par une application cliente.
 */
export function createConfig(input: VoxoConfigInput): VoxoConfig {
  const locale = normalizeLocale(input.locale ?? Intl.DateTimeFormat().resolvedOptions().locale)
  const apiUrl = normalizeApiUrl(input.apiUrl, locale)
  const appId = input.appId?.trim() || undefined

  if (!isUuidV4(input.tenantId)) {
    throw new VoxoError(voxoText(locale, 'invalidTenant'), {
      code: 'INVALID_CONFIG',
    })
  }

  return {
    apiUrl,
    tenantId: input.tenantId,
    locale,
    appId,
    user: input.user,
    options: { ...DEFAULT_OPTIONS, ...input.options },
    adapters: input.adapters ?? {},
    conversationSocketUrl(sessionId: string): string {
      // Le schéma HTTP est remplacé par son équivalent WebSocket, et
      // l'autorisation passe par le paramètre `tenantId` : le handshake
      // WebSocket ne transporte pas de header `X-Tenant-ID`.
      const base = apiUrl.replace(/^http/, 'ws')
      const path = `/widget/conversation/${encodeURIComponent(sessionId)}/socket`
      const app = appId === undefined ? '' : `&appId=${encodeURIComponent(appId)}`
      return `${base}${path}?tenantId=${encodeURIComponent(input.tenantId)}${app}`
    },
  }
}

/**
 * `URL` et `URLSearchParams` sont incomplets en React Native : on découpe à la
 * main plutôt que de dépendre d'un polyfill. On retire la query et le fragment,
 * qu'un intégrateur peut avoir collés avec l'adresse.
 */
function normalizeApiUrl(value: string, locale: 'fr' | 'en'): string {
  const trimmed = (value ?? '').trim()
  const match = /^(https?:)\/\/([^/?#]+)([^?#]*)/i.exec(trimmed)

  if (!match) {
    throw new VoxoError(voxoText(locale, 'invalidApiUrl'), { code: 'INVALID_CONFIG' })
  }

  const scheme = match[1]!.toLowerCase()
  const authority = match[2]!
  const path = (match[3] ?? '').replace(/\/+$/, '')
  return `${scheme}//${authority}${path}`
}
