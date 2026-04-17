export type ContextCollapseStats = {
  collapsedSpans: number
  collapsedMessages: number
  stagedSpans: number
  health: {
    totalSpawns: number
    totalErrors: number
    totalEmptySpawns: number
    emptySpawnWarningEmitted: boolean
    lastError?: string
  }
}

const EMPTY_STATS: ContextCollapseStats = {
  collapsedSpans: 0,
  collapsedMessages: 0,
  stagedSpans: 0,
  health: {
    totalSpawns: 0,
    totalErrors: 0,
    totalEmptySpawns: 0,
    emptySpawnWarningEmitted: false,
  },
}

export function isContextCollapseEnabled(): boolean {
  return false
}

export function initContextCollapse(): void {
  // no-op fallback for rebuilds missing full context-collapse implementation
}

export async function applyCollapsesIfNeeded(
  messages: unknown[],
): Promise<{ messages: unknown[] }> {
  return { messages }
}

export function isWithheldPromptTooLong(): boolean {
  return false
}

export function isWithheldMediaSizeError(): boolean {
  return false
}

export function recoverFromOverflow(messages: unknown[]): {
  committed: number
  messages: unknown[]
} {
  return {
    committed: 0,
    messages,
  }
}

export function isContextCollapsePausedByError(): boolean {
  return false
}

export function resetContextCollapse(): void {
  // no-op fallback
}

export function clearContextCollapseError(): void {
  // no-op fallback
}

export function getWithheldCount(): number {
  return 0
}

export function getStagedCount(): number {
  return 0
}

export function isWithheldPromptTooLongForTurn(): boolean {
  return false
}

export function snapshotContextCollapseState(): null {
  return null
}

export function getStats(): ContextCollapseStats {
  return EMPTY_STATS
}

export default {
  initContextCollapse,
  applyCollapsesIfNeeded,
  isWithheldPromptTooLong,
  isWithheldMediaSizeError,
  recoverFromOverflow,
  isContextCollapsePausedByError,
  resetContextCollapse,
  clearContextCollapseError,
  getWithheldCount,
  getStagedCount,
  isWithheldPromptTooLongForTurn,
  snapshotContextCollapseState,
  isContextCollapseEnabled,
  getStats,
}
