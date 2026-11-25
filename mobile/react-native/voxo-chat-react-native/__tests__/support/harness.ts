import type { VoxoAdapters } from '../../src/adapters/types'
import { createMemoryStorage } from '../../src/adapters/types'
import { VoxoClient } from '../../src/core/client'
import type { VoxoOptions } from '../../src/core/config'
import type { FetchLike } from '../../src/core/apiClient'
import type { FakeBackend, FakeSocket, RecordedRequest } from './fakeBackend'

export const tenantId = '9f8b7c6d-1e2f-4a3b-8c9d-0e1f2a3b4c5d'
export const apiUrl = 'https://api.voxo.test/api'

/** Motif du validateur backend, recopié depuis `widgetMessageValidator.js`. */
export const uuidV4Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function clientMessageIdOf(request: RecordedRequest): string | undefined {
  return /"clientMessageId":"([^"]+)"/.exec(request.body)?.[1]
}

/**
 * Adaptateurs de test : aucun module natif n'est chargé. C'est ce que permet
 * l'architecture — le core ne connaît que ces interfaces.
 */
export function testAdapters(overrides: Partial<VoxoAdapters> = {}): Partial<VoxoAdapters> {
  return {
    storage: createMemoryStorage(),
    filePicker: { pick: async () => [] },
    imageCompressor: { compress: async (file) => file },
    linking: { openUrl: async () => true },
    ...overrides,
  }
}

export interface HarnessOptions {
  backend: FakeBackend
  /** Remplace le `fetch` du backend simulé, pour simuler une panne réseau. */
  fetchImpl?: FetchLike
  socket: FakeSocket
  options?: VoxoOptions
  adapters?: Partial<VoxoAdapters>
}

/**
 * Monte un client branché sur le backend et le socket simulés.
 *
 * La surveillance d'inactivité est coupée par défaut : elle poserait un timer
 * périodique qui survivrait au test. Elle a son propre jeu de tests.
 */
export function buildClient({
  backend,
  socket,
  options,
  adapters,
  fetchImpl,
}: HarnessOptions): VoxoClient {
  return new VoxoClient({
    apiUrl,
    tenantId,
    user: { name: 'Awa', email: 'awa@example.com' },
    options: { enableInactivityMonitor: false, ...options },
    adapters: testAdapters(adapters),
    fetchImpl: fetchImpl ?? backend.fetch,
    socketConnector: () => socket,
  })
}

/** `fetch` qui échoue systématiquement, pour éprouver les chemins hors ligne. */
export const deadFetch: FetchLike = () => Promise.reject(new Error('hors ligne'))

/** Laisse le tour de boucle nécessaire à la remontée d'un événement socket. */
export function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
