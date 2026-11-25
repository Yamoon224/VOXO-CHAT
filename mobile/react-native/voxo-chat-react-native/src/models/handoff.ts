import type { JsonObject } from '../core/envelope'
import { isJsonObject, stringAt } from '../core/envelope'
import { voxoText, type VoxoLocale } from '../i18n'

/**
 * État de la reprise de la conversation par un humain.
 *
 * - `none`    : l'assistant répond seul
 * - `waiting` : un conseiller a été sollicité mais n'a pas encore pris la main
 * - `human`   : un conseiller échange en direct avec l'utilisateur
 */
export type VoxoHandoffStatus = 'none' | 'waiting' | 'human'

export function handoffStatusFromApi(value: unknown): VoxoHandoffStatus {
  if (value === 'waiting') return 'waiting'
  if (value === 'human') return 'human'
  return 'none'
}

/**
 * Vue de la reprise humaine, telle qu'elle arrive par le WebSocket (`handoff`
 * sur n'importe quel événement) ou par l'historique.
 */
export interface VoxoHandoff {
  status: VoxoHandoffStatus
  /** Nom affichable du conseiller, une fois qu'il a pris la main. */
  agentName?: string
  reason?: string
}

export const NO_HANDOFF: VoxoHandoff = { status: 'none' }

export function handoffFromApi(json: JsonObject): VoxoHandoff {
  const agent = json.assignedAgent
  return {
    status: handoffStatusFromApi(json.status ?? json.handoffStatus),
    agentName: isJsonObject(agent) ? stringAt(agent, 'name') : undefined,
    reason: stringAt(json, 'reason') ?? stringAt(json, 'handoffReason'),
  }
}

export function isHandledByHuman(handoff: VoxoHandoff): boolean {
  return handoff.status === 'human'
}

/**
 * Sous-titre à afficher dans l'en-tête du chat. `undefined` quand l'assistant
 * répond seul : c'est alors l'état de connectivité qui s'affiche.
 */
export function handoffLabel(handoff: VoxoHandoff, locale: VoxoLocale = 'fr'): string | undefined {
  if (handoff.status === 'human') {
    const agent = handoff.agentName ?? voxoText(locale, 'handoffDefaultAgent')
    return voxoText(locale, 'handoffActive', { name: agent })
  }
  if (handoff.status === 'waiting') return voxoText(locale, 'handoffWaiting')
  return undefined
}
