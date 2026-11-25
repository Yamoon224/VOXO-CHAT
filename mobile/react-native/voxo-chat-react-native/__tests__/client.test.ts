import type { VoxoClient } from '../src/core/client'
import { VoxoLimits } from '../src/core/limits'
import { FakeBackend, FakeSocket } from './support/fakeBackend'
import {
  buildClient,
  clientMessageIdOf,
  deadFetch,
  settle,
  tenantId,
  uuidV4Pattern,
} from './support/harness'

/**
 * Démarrage et envoi de messages, contre un backend qui reproduit les enveloppes
 * réelles de `/widget/*`.
 */
describe('VoxoClient', () => {
  let backend: FakeBackend
  let socket: FakeSocket
  let client: VoxoClient

  const build = (): VoxoClient => buildClient({ backend, socket })

  beforeEach(() => {
    backend = new FakeBackend()
    socket = new FakeSocket()
  })

  afterEach(() => client.dispose())

  describe('init', () => {
    it('charge la configuration du tenant et pose le message d’accueil', async () => {
      backend.suggestions = ['Vos tarifs ?', 'Où êtes-vous ?']
      client = build()
      await client.init()

      const snapshot = client.getSnapshot()
      expect(snapshot.chatbot.name).toBe('Assistant Acme')
      expect(snapshot.chatbot.primaryColor).toBe('#7c3aed')
      expect(snapshot.connectivity).toBe('available')
      expect(snapshot.messages).toHaveLength(1)
      expect(snapshot.messages[0]?.text).toBe('Bonjour ! Comment puis-je vous aider ?')
      expect(snapshot.messages[0]?.suggestions).toHaveLength(2)
    })

    it('pose X-Tenant-ID sur chaque requête', async () => {
      client = build()
      await client.init()
      await client.sendMessage('bonjour')

      expect(backend.requests.length).toBeGreaterThan(0)
      for (const request of backend.requests) {
        expect(request.headers['X-Tenant-ID']).toBe(tenantId)
      }
    })

    it('un historique absent (404) n’est pas une erreur affichée', async () => {
      backend.conversationExists = false
      client = build()
      await client.init()
      await settle()

      expect(client.getSnapshot().lastError).toBeUndefined()
      expect(client.getSnapshot().isReady).toBe(true)
    })

    it('une configuration injoignable garde des valeurs par défaut', async () => {
      // Toutes les requêtes échouent en transport : un thème générique vaut
      // mieux qu'un écran vide.
      client = buildClient({ backend, socket, fetchImpl: deadFetch })
      await client.init()
      await settle()

      const snapshot = client.getSnapshot()
      expect(snapshot.connectivity).toBe('unavailable')
      expect(snapshot.chatbot.name).toBe('Assistant')
      expect(snapshot.isReady).toBe(true)
    })

    it('remplace l’instantané plutôt que de le muter', async () => {
      client = build()
      const listener = jest.fn()
      client.subscribe(listener)
      const before = client.getSnapshot()

      await client.init()

      expect(listener).toHaveBeenCalled()
      // C'est le changement de référence qui déclenche le rendu côté React.
      expect(client.getSnapshot()).not.toBe(before)
    })

    it('ne notifie plus après dispose', async () => {
      client = build()
      await client.init()
      const listener = jest.fn()
      client.subscribe(listener)

      client.dispose()
      client.reportError('trop tard')

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('envoi', () => {
    it('envoie un clientMessageId en UUID v4, comme l’exige le backend', async () => {
      client = build()
      await client.init()
      await client.sendMessage('bonjour')

      const id = clientMessageIdOf(backend.sentMessages[0]!)
      expect(uuidV4Pattern.test(id!)).toBe(true)
    })

    it('affiche la réponse et marque le message comme répondu', async () => {
      backend.assistantReply = 'Nos horaires sont 9h-18h.'
      client = build()
      await client.init()
      await client.sendMessage('vos horaires ?')

      const { messages } = client.getSnapshot()
      expect(messages[messages.length - 1]?.text).toBe('Nos horaires sont 9h-18h.')
      expect(messages[messages.length - 1]?.role).toBe('assistant')

      const sent = messages.find((message) => message.text === 'vos horaires ?')
      expect(sent?.deliveryStatus).toBe('answered')
      expect(sent?.serverId).toBeDefined()
    })

    it('un message vide sans pièce jointe ne part pas', async () => {
      client = build()
      await client.init()
      await client.sendMessage('   ')
      expect(backend.sentMessages).toHaveLength(0)
    })

    it('un message trop long est refusé avant tout appel réseau', async () => {
      client = build()
      await client.init()
      await client.sendMessage('a'.repeat(VoxoLimits.maxMessageLength + 1))

      expect(backend.sentMessages).toHaveLength(0)
      expect(client.getSnapshot().lastError).toContain('trop long')
    })

    it('un échec serveur relaie le message français et permet un retry', async () => {
      backend.failMessageWithStatus = 429
      backend.failMessageError = 'Trop de messages envoyés. Veuillez patienter.'
      backend.failMessageCode = 'RATE_LIMIT_EXCEEDED'
      client = build()
      await client.init()
      await client.sendMessage('bonjour')

      expect(client.getSnapshot().lastError).toBe('Trop de messages envoyés. Veuillez patienter.')
      const failed = client.getSnapshot().messages.find((message) => message.role === 'user')
      expect(failed?.deliveryStatus).toBe('failed')

      client.clearError()
      await client.retry(failed!.id)
      expect(
        client.getSnapshot().messages.find((message) => message.role === 'user')?.deliveryStatus,
      ).toBe('answered')
    })

    it('un retry conserve le clientMessageId : pas de double traitement', async () => {
      backend.failMessageWithStatus = 500
      client = build()
      await client.init()
      await client.sendMessage('bonjour')

      const failed = client.getSnapshot().messages.find((message) => message.role === 'user')
      await client.retry(failed!.id)

      const ids = backend.sentMessages.map(clientMessageIdOf)
      expect(ids).toHaveLength(2)
      expect(ids[0]).toBe(ids[1])
    })

    it('adopte la session renvoyée par le serveur quand elle change', async () => {
      client = build()
      await client.init()
      const previous = client.getSnapshot().sessionId

      backend.nextSessionId = 'b1c2d3e4-1111-4222-8333-444455556666'
      await client.sendMessage('bonjour')

      expect(client.getSnapshot().sessionId).toBe('b1c2d3e4-1111-4222-8333-444455556666')
      expect(client.getSnapshot().sessionId).not.toBe(previous)
    })
  })
})
