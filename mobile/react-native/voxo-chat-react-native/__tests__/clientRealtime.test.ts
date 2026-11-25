import type { VoxoClient } from '../src/core/client'
import { FakeBackend, FakeSocket } from './support/fakeBackend'
import { buildClient, settle } from './support/harness'

/** Flux temps réel, pièces jointes, clôture et avis. */
describe('VoxoClient — temps réel et clôture', () => {
  let backend: FakeBackend
  let socket: FakeSocket
  let client: VoxoClient

  const build = (): VoxoClient => buildClient({ backend, socket })

  const agentEvent = (id: string, content: string): unknown => ({
    type: 'message',
    message: { id, role: 'agent', content, timestamp: new Date().toISOString() },
  })

  beforeEach(() => {
    backend = new FakeBackend()
    socket = new FakeSocket()
  })

  afterEach(() => client.dispose())

  describe('temps réel', () => {
    it('ajoute un message d’agent et bascule le statut de reprise', async () => {
      client = build()
      await client.init()

      socket.emit({
        ...(agentEvent('srv-agent-1', 'Bonjour, je prends la suite.') as object),
        handoff: { status: 'human', assignedAgent: { id: 'u-1', name: 'Moussa Fall' } },
      })
      await settle()

      const { handoff, messages } = client.getSnapshot()
      expect(handoff.status).toBe('human')
      expect(handoff.agentName).toBe('Moussa Fall')
      expect(messages[messages.length - 1]?.role).toBe('agent')
      expect(messages[messages.length - 1]?.text).toBe('Bonjour, je prends la suite.')
    })

    it('ne duplique pas un message d’agent relivré', async () => {
      client = build()
      await client.init()

      socket.emit(agentEvent('srv-agent-1', 'Bonjour'))
      await settle()
      socket.emit(agentEvent('srv-agent-1', 'Bonjour'))
      await settle()

      const matching = client
        .getSnapshot()
        .messages.filter((message) => message.serverId === 'srv-agent-1')
      expect(matching).toHaveLength(1)
    })

    it('ignore un message d’assistant : il arrive déjà par la réponse HTTP', async () => {
      client = build()
      await client.init()
      const before = client.getSnapshot().messages.length

      socket.emit({
        type: 'message',
        message: { id: 'srv-bot-99', role: 'assistant', content: 'doublon' },
      })
      await settle()

      expect(client.getSnapshot().messages).toHaveLength(before)
    })

    it('un événement illisible ne casse pas le flux', async () => {
      client = build()
      await client.init()

      socket.emitRaw('pas du json')
      await settle()
      socket.emit({ handoff: { status: 'waiting' } })
      await settle()

      expect(client.getSnapshot().handoff.status).toBe('waiting')
    })
  })

  describe('pièces jointes', () => {
    it('téléverse le fichier retenu et le rattache au message', async () => {
      client = buildClient({
        backend,
        socket,
        adapters: {
          filePicker: {
            pick: async () => [{ uri: 'file:///tmp/photo.png', name: 'photo.png', size: 2048 }],
          },
        },
      })
      await client.init()
      await client.pickAttachments()

      expect(client.getSnapshot().attachments).toHaveLength(1)
      expect(client.getSnapshot().attachments[0]?.remoteId).toBe(backend.uploadId)

      await client.sendMessage('voici la capture')

      const body = backend.sentMessages[0]!.body
      expect(body).toContain(`"attachmentIds":["${backend.uploadId}"]`)
      // La file est vidée : un second envoi ne doit pas reprendre les pièces.
      expect(client.getSnapshot().attachments).toHaveLength(0)
    })

    it('refuse un format non pris en charge sans appeler le serveur', async () => {
      client = buildClient({
        backend,
        socket,
        adapters: {
          filePicker: {
            pick: async () => [{ uri: 'file:///tmp/x.zip', name: 'archive.zip', size: 100 }],
          },
        },
      })
      await client.init()
      await client.pickAttachments()

      expect(client.getSnapshot().attachments).toHaveLength(0)
      expect(client.getSnapshot().lastError).toContain('Format non pris en charge')
      expect(backend.requests.some((request) => request.url.endsWith('/widget/upload'))).toBe(false)
    })

    it('refuse un fichier trop volumineux avec les deux tailles', async () => {
      client = buildClient({
        backend,
        socket,
        adapters: {
          filePicker: {
            pick: async () => [
              { uri: 'file:///tmp/gros.pdf', name: 'gros.pdf', size: 12 * 1024 * 1024 },
            ],
          },
        },
      })
      await client.init()
      await client.pickAttachments()

      expect(client.getSnapshot().lastError).toContain('12,0 Mo')
      expect(client.getSnapshot().lastError).toContain('10,0 Mo')
    })
  })

  describe('clôture et avis', () => {
    it('canRate reste faux tant que l’assistant n’a pas répondu', async () => {
      client = build()
      await client.init()
      expect(client.getSnapshot().canRate).toBe(false)

      await client.sendMessage('bonjour')
      expect(client.getSnapshot().canRate).toBe(true)
    })

    it('la notation clôt la session', async () => {
      client = build()
      await client.init()
      await client.sendMessage('bonjour')

      expect(await client.endConversation(5, 'Parfait')).toBe(true)
      expect(client.getSnapshot().sessionEnded).toBe(true)
    })

    it('le feedback cible le serverId, jamais l’identifiant local', async () => {
      client = build()
      await client.init()
      await client.sendMessage('bonjour')

      const { messages } = client.getSnapshot()
      const reply = messages[messages.length - 1]!
      await client.submitFeedback(reply, 'up')

      const request = backend.requests.find((item) => item.url.endsWith('/message-feedback'))!
      expect(request.body).toContain(`"messageId":"${reply.serverId}"`)
      expect(request.body).toContain('"value":"up"')
    })

    it('rejouer le même avis le retire', async () => {
      client = build()
      await client.init()
      await client.sendMessage('bonjour')

      const first = client.getSnapshot().messages.at(-1)!
      await client.submitFeedback(first, 'up')
      await client.submitFeedback(client.getSnapshot().messages.at(-1)!, 'up')

      expect(client.getSnapshot().messages.at(-1)?.feedback).toBeUndefined()
    })

    it('une nouvelle session archive la précédente et repart à vide', async () => {
      client = build()
      await client.init()
      await client.sendMessage('bonjour')
      const previous = client.getSnapshot().sessionId

      await client.startNewSession()

      expect(client.getSnapshot().sessionId).not.toBe(previous)
      expect(client.getSnapshot().messages).toHaveLength(1)
      expect(await client.history()).toHaveLength(1)
    })

    it('envoyer après une clôture rouvre automatiquement une session', async () => {
      client = build()
      await client.init()
      await client.sendMessage('bonjour')
      await client.endConversation(4)
      const closed = client.getSnapshot().sessionId

      await client.sendMessage('une autre question')

      expect(client.getSnapshot().sessionEnded).toBe(false)
      expect(client.getSnapshot().sessionId).not.toBe(closed)
      expect(client.getSnapshot().messages.map((message) => message.text)).toContain(
        'une autre question',
      )
    })
  })
})
