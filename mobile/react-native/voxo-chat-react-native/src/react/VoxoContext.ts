import { createContext } from 'react'

import type { VoxoClient } from '../core/client'

/**
 * Contexte portant le client.
 *
 * `null` par défaut : `useVoxoClient` lève un message explicite plutôt que de
 * laisser un `undefined` se propager jusqu'à un plantage lointain.
 */
export const VoxoContext = createContext<VoxoClient | null>(null)
