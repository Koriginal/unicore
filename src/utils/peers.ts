import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { getSessionId } from '../bootstrap/state.js'
import { getUniCoreConfigHomeDir } from './envUtils.js'
import { isProcessRunning } from './genericProcessUtils.js'
import { logForDebugging } from './debug.js'
import { errorMessage } from './errors.js'

type SessionRegistryEntry = {
  pid?: number
  sessionId?: string
  cwd?: string
  name?: string
  kind?: string
  messagingSocketPath?: string
  bridgeSessionId?: string
}

export type ReachablePeer = {
  id: string
  address: string
  kind: 'uds' | 'bridge'
  pid?: number
  name?: string
  cwd?: string
  sessionId?: string
  source: 'local'
}

function getSessionsDir(): string {
  return join(getUniCoreConfigHomeDir(), 'sessions')
}

function parseSessionFileName(file: string): number | null {
  if (!/^\d+\.json$/.test(file)) return null
  const parsed = Number.parseInt(file.slice(0, -5), 10)
  return Number.isFinite(parsed) ? parsed : null
}

export async function listReachablePeers(): Promise<ReachablePeer[]> {
  const dir = getSessionsDir()
  let files: string[]
  try {
    files = await readdir(dir)
  } catch {
    return []
  }

  const currentSessionId = getSessionId()
  const peers = new Map<string, ReachablePeer>()

  for (const file of files) {
    const pidFromName = parseSessionFileName(file)
    if (pidFromName === null) continue

    // Keep current process for completeness, but skip stale PIDs.
    if (pidFromName !== process.pid && !isProcessRunning(pidFromName)) {
      continue
    }

    let entry: SessionRegistryEntry | null = null
    try {
      const text = await readFile(join(dir, file), 'utf8')
      entry = JSON.parse(text) as SessionRegistryEntry
    } catch (error) {
      logForDebugging(
        `[peers] failed to parse ${file}: ${errorMessage(error)}`,
      )
      continue
    }

    if (!entry) continue
    if (entry.sessionId && entry.sessionId === currentSessionId) {
      continue
    }

    const pid = entry.pid ?? pidFromName
    const base = {
      pid,
      name: entry.name,
      cwd: entry.cwd,
      sessionId: entry.sessionId,
      source: 'local' as const,
    }

    if (entry.messagingSocketPath) {
      const address = `uds:${entry.messagingSocketPath}`
      peers.set(address, {
        id: address,
        address,
        kind: 'uds',
        ...base,
      })
    }

    if (entry.bridgeSessionId) {
      const address = `bridge:${entry.bridgeSessionId}`
      // If a peer has both uds and bridge addresses, keep both so caller can choose.
      peers.set(address, {
        id: address,
        address,
        kind: 'bridge',
        ...base,
      })
    }
  }

  return [...peers.values()].sort((a, b) => {
    const aName = a.name ?? ''
    const bName = b.name ?? ''
    if (aName && bName) return aName.localeCompare(bName)
    if (aName) return -1
    if (bName) return 1
    return a.address.localeCompare(b.address)
  })
}

export function formatPeersForDisplay(peers: ReachablePeer[]): string {
  if (peers.length === 0) {
    return 'No reachable peers found.'
  }

  return peers
    .map(peer => {
      const parts = [peer.address]
      if (peer.name) parts.push(`name=${peer.name}`)
      if (peer.cwd) parts.push(`cwd=${peer.cwd}`)
      return `- ${parts.join(' | ')}`
    })
    .join('\n')
}

