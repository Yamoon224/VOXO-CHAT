import { VoxoApiClient } from '../src/core/apiClient'
import { createConfig } from '../src/core/config'
import type { VoxoConfig } from '../src/core/config'
import { VoxoConversationState } from '../src/core/conversationState'
import { VoxoConversationSync } from '../src/core/conversationSync'
import { VoxoError } from '../src/core/errors'
import { VoxoPushRegistrar } from '../src/core/pushRegistrar'
import type { VoxoPushPlatform } from '../src/core/pushPlatform'
import { VoxoSessionStore } from '../src/core/sessionStore'
import { VoxoSocket } from '../src/core/socket'
import { VoxoTypingSender } from '../src/core/typingSender'
import { createMemoryStorage } from '../src/adapters/types'
import type { VoxoStorage } from '../src/adapters/types'
import type { FetchLike } from '../src/core/apiClient'
import { FakeBackend, FakeSocket } from './support/fakeBackend'
import { apiUrl, buildClient, settle, tenantId } from './support/harness'

interface Call {
  url: string
  method: string
  headers: Record<string, string>
  body: string
}

/** `fetch` programmable : file de réponses, requêtes consignées. */
function scriptedFetch(): { fetch: FetchLike; calls: Call[]; enqueue: (status: number, payload: unknown) => void } {
  const calls: Call[] = []
  const queue: Array<{ status: number; payload: unknown }> = []
  const fetchImpl: FetchLike = async (input, init) => {
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: typeof init?.body === 'string' ? init.body : '',
    })
    const next = queue.shift() ?? { status: 200, payload: { success: true, data: {} } }
    const body = JSON.stringify(next.payload)
    return { status: next.status, ok: next.status < 400, text: async () => body } as Response
  }
  return { fetch: fetchImpl, calls, enqueue: (status, payload) => queue.push({ status, payload }) }
}

const ok = (data: unknown): unknown => ({ success: true, data })

function makeConfig(appId?: string): VoxoConfig {
  return createConfig({ apiUrl, tenantId, locale: 'fr', appId })
}

function makeSync(config: VoxoConfig, fetchImpl: FetchLike, storage: VoxoStorage, state = new VoxoConversationState()) {
  const api = new VoxoApiClient(config, fetchImpl)
  const sync = new VoxoConversationSync(
    api,
    new VoxoSocket(config, () => new FakeSocket()),
    new VoxoSessionStore(config, storage),
    state,
    config,
  )
  return { api, sync, state }
}

describe('appId', () => {
  it('voyage en X-App-Id et en paramètre appId du socket, seulement s’il est connu', async () => {
    const withId = makeConfig(' com.exemple.app ')
    const first = scriptedFetch()
    first.enqueue(200, ok({ status: 'healthy' }))
    await new VoxoApiClient(withId, first.fetch).isHealthy()
    expect(first.calls[0]!.headers['X-App-Id']).toBe('com.exemple.app')
    expect(withId.conversationSocketUrl('s')).toContain('appId=com.exemple.app')

    const without = makeConfig()
    const second = scriptedFetch()
    second.enqueue(200, ok({ status: 'healthy' }))
    await new VoxoApiClient(without, second.fetch).isHealthy()
    expect(second.calls[0]!.headers['X-App-Id']).toBeUndefined()
    expect(without.conversationSocketUrl('s')).not.toContain('appId')
    expect(makeConfig('   ').appId).toBeUndefined()
  })
})

describe('notifications push', () => {
  function registrar(config: VoxoConfig, storage: VoxoStorage, session: () => string) {
    const scripted = scriptedFetch()
    const { api, sync } = makeSync(config, scripted.fetch, storage)
    return { push: new VoxoPushRegistrar(api, sync, config, session), ...scripted }
  }

  it('lie le jeton à la session courante, et une nouvelle session le déplace', async () => {
    let session = 's1'
    const { push, calls } = registrar(makeConfig(), createMemoryStorage(), () => session)
    await push.register('tok-1', 'fcm')
    expect(calls[0]!.url).toBe(`${apiUrl}/widget/push-token`)
    expect(calls[0]!.method).toBe('POST')
    expect(JSON.parse(calls[0]!.body)).toEqual({
      sessionId: 's1',
      token: 'tok-1',
      platform: 'fcm',
      locale: 'fr',
    })

    session = 's2'
    await push.syncSession()
    expect(JSON.parse(calls[1]!.body).sessionId).toBe('s2')
  })

  it('un jeton mémorisé est relié après un redémarrage', async () => {
    const storage = createMemoryStorage()
    await registrar(makeConfig(), storage, () => 's1').push.register('tok-1', 'apns')

    const restarted = registrar(makeConfig(), storage, () => 's9')
    await restarted.push.load()
    await restarted.push.syncSession()
    expect(JSON.parse(restarted.calls[0]!.body)).toMatchObject({ sessionId: 's9', platform: 'apns' })
  })

  it('PUSH_NOT_ENABLED coupe les tentatives en silence jusqu’au prochain jeton', async () => {
    const { push, calls, enqueue } = registrar(makeConfig(), createMemoryStorage(), () => 's1')
    enqueue(403, { success: false, error: 'x', code: 'PUSH_NOT_ENABLED' })
    await push.register('tok-1', 'fcm')
    expect(calls).toHaveLength(1)
    await push.syncSession()
    expect(calls).toHaveLength(1)

    await push.register('tok-2', 'fcm')
    expect(calls).toHaveLength(2)
  })

  it('une panne ne remonte jamais et ne désactive pas la fonction', async () => {
    const { push, calls, enqueue } = registrar(makeConfig(), createMemoryStorage(), () => 's1')
    enqueue(500, { success: false, error: 'Panne' })
    await expect(push.register('tok-1', 'fcm')).resolves.toBeUndefined()
    await push.syncSession()
    expect(calls).toHaveLength(2)
  })

  it('unregister oublie le jeton sur le serveur et en local', async () => {
    const { push, calls } = registrar(makeConfig(), createMemoryStorage(), () => 's1')
    await push.register('tok-1', 'fcm')
    await push.unregister()
    expect(calls[1]!.method).toBe('DELETE')
    expect(JSON.parse(calls[1]!.body)).toEqual({ token: 'tok-1' })
    await push.syncSession()
    expect(calls).toHaveLength(2)
  })

  it('le client relie le jeton à la session et à chaque nouvelle session', async () => {
    const backend = new FakeBackend()
    const client = buildClient({ backend, socket: new FakeSocket() })
    await client.init()
    await client.registerPushToken('tok-1', 'fcm' as VoxoPushPlatform)
    await client.startNewSession()
    const pushes = backend.requests.filter((r) => r.url.endsWith('/widget/push-token'))
    expect(pushes).toHaveLength(2)
    expect(JSON.parse(pushes[0]!.body).sessionId).not.toBe(JSON.parse(pushes[1]!.body).sessionId)
    await client.unregisterPushToken()
    expect(backend.requests[backend.requests.length - 1]!.method).toBe('DELETE')
    client.dispose()
  })
})

describe('aperçu de saisie', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  const sender = (sent: string[], eligible: () => boolean = () => true) =>
    new VoxoTypingSender({
      isEligible: eligible,
      send: (text) => {
        sent.push(text)
        return true
      },
    })

  it('limite à une trame par 200 ms et la dernière valeur arrive toujours', () => {
    const sent: string[] = []
    const typing = sender(sent)
    typing.submit('b')
    typing.submit('bo')
    typing.submit('bon')
    expect(sent).toEqual(['b'])
    jest.advanceTimersByTime(199)
    expect(sent).toEqual(['b'])
    jest.advanceTimersByTime(2)
    expect(sent).toEqual(['b', 'bon'])
  })

  it('vider le champ envoie une trame vide, sans répéter une valeur identique', () => {
    const sent: string[] = []
    const typing = sender(sent)
    typing.submit('salut')
    jest.advanceTimersByTime(300)
    typing.submit('salut')
    typing.submit('')
    typing.submit('')
    expect(sent).toEqual(['salut', ''])
  })

  it('rien ne part tant que ce n’est pas autorisé, et le texte est plafonné à 500 caractères', () => {
    const sent: string[] = []
    let allowed = false
    const typing = sender(sent, () => allowed)
    typing.submit('secret')
    jest.advanceTimersByTime(1000)
    expect(sent).toEqual([])

    allowed = true
    typing.submit('x'.repeat(900))
    expect(sent).toHaveLength(1)
    expect(sent[0]).toHaveLength(500)
  })

  it('une trame non envoyée n’est pas comptée comme envoyée', () => {
    let open = false
    const sent: string[] = []
    const typing = new VoxoTypingSender({
      isEligible: () => true,
      send: (text) => {
        if (!open) return false
        sent.push(text)
        return true
      },
    })
    typing.submit('a')
    open = true
    jest.advanceTimersByTime(300)
    typing.submit('ab')
    expect(sent).toEqual(['ab'])
  })

  it('le socket n’envoie la trame typing que lorsqu’il est ouvert', () => {
    const fake = new FakeSocket()
    const socket = new VoxoSocket(makeConfig(), () => fake)
    expect(socket.sendTyping('a')).toBe(false)
    socket.open('s1')
    expect(socket.sendTyping('bonjour')).toBe(true)
    expect(fake.sent).toEqual(['{"type":"typing","text":"bonjour"}'])
    fake.readyState = 0
    expect(socket.sendTyping('x')).toBe(false)
    socket.dispose()
  })

  describe('via le client', () => {
    const humanHandoff = { handoff: { status: 'human', assignedAgent: { id: 'u', name: 'Léa' } } }

    async function readyClient(options: { enableLiveTyping?: boolean }, feature: boolean) {
      const backend = new FakeBackend()
      const socket = new FakeSocket()
      const client = buildClient({
        backend,
        socket,
        options,
        fetchImpl: async (input, init) => {
          const response = await backend.fetch(input, init)
          if (!String(input).includes('/widget/config') || !feature) return response
          const payload = JSON.parse(await response.text()) as {
            data: { chatbot: { options: { features: Record<string, boolean> } } }
          }
          payload.data.chatbot.options.features.liveTypingPreview = true
          const body = JSON.stringify(payload)
          return { status: 200, ok: true, text: async () => body } as Response
        },
      })
      await client.init()
      socket.emit({ type: 'message', message: { id: 'a1', role: 'agent', content: 'Salut' }, ...humanHandoff })
      jest.useRealTimers()
      await settle()
      jest.useFakeTimers()
      return { client, socket }
    }

    it('envoie les trames pendant une reprise humaine et efface l’aperçu à l’envoi', async () => {
      const { client, socket } = await readyClient({}, true)
      client.notifyTyping('bon')
      expect(socket.sent).toEqual(['{"type":"typing","text":"bon"}'])
      jest.advanceTimersByTime(300)
      await client.sendMessage('bonjour').catch(() => undefined)
      expect(socket.sent[socket.sent.length - 1]).toBe('{"type":"typing","text":""}')
      client.dispose()
    })

    it('n’envoie rien si la fonction n’est pas activée par le propriétaire ou coupée par l’option', async () => {
      const off = await readyClient({}, false)
      off.client.notifyTyping('secret')
      expect(off.socket.sent).toEqual([])
      off.client.dispose()

      const optedOut = await readyClient({ enableLiveTyping: false }, true)
      optedOut.client.notifyTyping('secret')
      expect(optedOut.socket.sent).toEqual([])
      optedOut.client.dispose()
    })
  })
})

describe('historique archivé', () => {
  it('relit une conversation archivée sans toucher à la session active', async () => {
    const config = makeConfig()
    const scripted = scriptedFetch()
    const { sync, state } = makeSync(config, scripted.fetch, createMemoryStorage(), new VoxoConversationState('active'))
    scripted.enqueue(
      200,
      ok({
        messages: [
          { id: 'm1', role: 'user', content: 'Bonjour' },
          { id: 'm2', role: 'agent', content: 'Salut' },
        ],
        handoffStatus: 'human',
        assignedAgent: { name: 'Léa' },
      }),
    )
    const archived = await sync.loadArchived('old')
    expect(archived.messages.map((m) => m.text)).toEqual(['Bonjour', 'Salut'])
    expect(archived.handoff.agentName).toBe('Léa')
    expect(state.sessionId).toBe('active')
    expect(state.isEmpty).toBe(true)
    expect(scripted.calls[0]!.url).toContain('/widget/conversation/old?limit=100')
  })

  it('une conversation purgée devient « Historique indisponible », pas une erreur technique', async () => {
    const scripted = scriptedFetch()
    const { sync } = makeSync(makeConfig(), scripted.fetch, createMemoryStorage())
    scripted.enqueue(404, { success: false, error: 'x', code: 'CONVERSATION_NOT_FOUND' })
    const error = await sync.loadArchived('gone').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(VoxoError)
    expect((error as VoxoError).code).toBe('HISTORY_UNAVAILABLE')
    expect((error as VoxoError).statusCode).toBe(404)
    expect((error as VoxoError).message).toBe('Historique indisponible')
  })
})
