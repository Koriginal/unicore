/** History snip / compact helpers (feature-gated requires). */

import { randomUUID } from 'crypto'
import { feature } from '@/utils/feature.js'
import type { Message } from '../../types/message.js'
import { tokenCountWithEstimation } from '../../utils/tokens.js'

export const SNIP_NUDGE_TEXT =
  'Long session detected: context snip is available to reduce token pressure.'

export function isSnipRuntimeEnabled(): boolean {
  return feature('HISTORY_SNIP')
}

function isSystemLike(
  message: unknown,
): message is { type?: string; subtype?: string; content?: unknown } {
  return Boolean(message && typeof message === 'object')
}

export function isSnipMarkerMessage(message: unknown): boolean {
  if (!isSystemLike(message)) return false
  if (message.type !== 'system') return false
  if (message.subtype === 'snip_boundary') return true
  return (
    typeof message.content === 'string' &&
    message.content.toLowerCase().includes('history was snipped')
  )
}

export function shouldNudgeForSnips(messages: Message[]): boolean {
  if (!isSnipRuntimeEnabled()) return false
  if (messages.length < 120) return false
  const tail = messages.slice(-40)
  return !tail.some(isSnipMarkerMessage)
}

export function snipCompactIfNeeded(
  messages: Message[],
  opts?: { force?: boolean },
): {
  messages: Message[]
  tokensFreed: number
  boundaryMessage?: Message
} {
  if (!isSnipRuntimeEnabled()) {
    return { messages, tokensFreed: 0 }
  }

  const force = opts?.force === true
  const keepTail = force ? 36 : 56
  const minSnip = force ? 8 : 16
  if (messages.length <= keepTail + minSnip) {
    return { messages, tokensFreed: 0 }
  }

  const toDrop = messages.length - keepTail
  const remaining = messages.slice(toDrop)

  const preTokens = tokenCountWithEstimation(messages)
  const postTokens = tokenCountWithEstimation(remaining)
  const estimatedFreed = Math.max(0, preTokens - postTokens)

  const boundaryMessage: Message = {
    type: 'system',
    subtype: 'snip_boundary',
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
    content: `Earlier history was snipped (${toDrop} messages) to keep context focused.`,
  }

  return {
    messages: [boundaryMessage, ...remaining],
    tokensFreed: estimatedFreed,
    boundaryMessage,
  }
}
