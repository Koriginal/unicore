import type { Message } from '../../types/message.js'

function isSystemMessageLike(message: Message): message is Message & {
  type: 'system'
  subtype?: string
  content?: unknown
} {
  return Boolean(message && typeof message === 'object' && message.type === 'system')
}

export function isSnipBoundaryMessage(message: Message): boolean {
  if (!isSystemMessageLike(message)) return false
  if (message.subtype === 'snip_boundary') return true

  const content = message.content
  return (
    typeof content === 'string' &&
    content.toLowerCase().includes('history was snipped')
  )
}

export function projectSnippedView<T extends Message>(messages: T[]): T[] {
  // Keep at most one adjacent snip-boundary marker to avoid visual noise.
  const out: T[] = []
  let lastWasBoundary = false
  for (const message of messages) {
    const isBoundary = isSnipBoundaryMessage(message)
    if (isBoundary && lastWasBoundary) {
      continue
    }
    out.push(message)
    lastWasBoundary = isBoundary
  }
  return out
}
