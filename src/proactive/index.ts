type ProactiveSource = 'command' | 'system' | 'control'

const DEFAULT_TICK_INTERVAL_MS = 30_000

let proactiveActive = false
let proactivePaused = false
let contextBlocked = false
let nextTickAt: number | null = null
let tickIntervalMs = DEFAULT_TICK_INTERVAL_MS

const listeners = new Set<() => void>()

function emitChange(): void {
  for (const listener of listeners) {
    try {
      listener()
    } catch {
      // Keep notifying remaining listeners.
    }
  }
}

function updateNextTick(): void {
  if (proactiveActive && !proactivePaused && !contextBlocked) {
    nextTickAt = Date.now() + tickIntervalMs
  } else {
    nextTickAt = null
  }
  emitChange()
}

export function subscribeToProactiveChanges(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function isProactiveActive(): boolean {
  return proactiveActive
}

export function activateProactive(_source: ProactiveSource = 'command'): void {
  proactiveActive = true
  proactivePaused = false
  contextBlocked = false
  updateNextTick()
}

export function deactivateProactive(): void {
  proactiveActive = false
  proactivePaused = false
  contextBlocked = false
  updateNextTick()
}

export function isProactivePaused(): boolean {
  return proactivePaused || contextBlocked
}

export function pauseProactive(): void {
  if (!proactiveActive) return
  proactivePaused = true
  updateNextTick()
}

export function resumeProactive(): void {
  if (!proactiveActive) return
  proactivePaused = false
  updateNextTick()
}

export function setContextBlocked(blocked: boolean): void {
  contextBlocked = blocked
  updateNextTick()
}

export function getNextTickAt(): number | null {
  return nextTickAt
}

export function setProactiveTickIntervalMs(ms: number): void {
  if (!Number.isFinite(ms) || ms <= 0) return
  tickIntervalMs = ms
  updateNextTick()
}

export default {
  subscribeToProactiveChanges,
  isProactiveActive,
  activateProactive,
  deactivateProactive,
  isProactivePaused,
  pauseProactive,
  resumeProactive,
  setContextBlocked,
  getNextTickAt,
  setProactiveTickIntervalMs,
}
