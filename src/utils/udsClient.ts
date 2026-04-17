/** UDS client for live session discovery / send (BG_SESSIONS, SendMessageTool). */

import { getSessionId } from '../bootstrap/state.js'
import { createConnection } from 'net'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { getUniCoreConfigHomeDir } from './envUtils.js'
import { getErrnoCode } from './errors.js'
import { isProcessRunning } from './genericProcessUtils.js'

export type LiveUdsSession = {
  kind?: string
  sessionId?: string
  pid?: number
  messagingSocketPath?: string
  [key: string]: unknown
}

type SessionRegistryEntry = {
  pid?: number
  kind?: string
  sessionId?: string
  messagingSocketPath?: string
  [key: string]: unknown
}

function getSessionsDir(): string {
  return join(getUniCoreConfigHomeDir(), 'sessions')
}

function parseSessionFileName(file: string): number | null {
  if (!/^\d+\.json$/.test(file)) return null
  const parsed = Number.parseInt(file.slice(0, -5), 10)
  return Number.isFinite(parsed) ? parsed : null
}

export async function listAllLiveSessions(): Promise<LiveUdsSession[]> {
  const sessionsDir = getSessionsDir()
  let files: string[]
  try {
    files = await readdir(sessionsDir)
  } catch {
    return []
  }

  const sessions: LiveUdsSession[] = []
  for (const file of files) {
    const pidFromName = parseSessionFileName(file)
    if (pidFromName === null) continue

    let entry: SessionRegistryEntry
    try {
      entry = JSON.parse(
        await readFile(join(sessionsDir, file), 'utf8'),
      ) as SessionRegistryEntry
    } catch {
      continue
    }

    const pid = entry.pid ?? pidFromName
    if (pid !== process.pid && !isProcessRunning(pid)) {
      continue
    }

    sessions.push({
      ...entry,
      pid,
      kind: entry.kind,
      sessionId: entry.sessionId,
      messagingSocketPath: entry.messagingSocketPath,
    })
  }

  return sessions
}

export async function sendToUdsSocket(
  target: string,
  message: string,
): Promise<void> {
  if (!target || target.trim().length === 0) {
    throw new Error('UDS target socket path is empty')
  }

  if (!message || message.length === 0) {
    throw new Error('Message cannot be empty')
  }

  const payload = JSON.stringify({
    from: `session:${getSessionId()}`,
    message,
  })

  await new Promise<void>((resolve, reject) => {
    const socket = createConnection(target)
    let settled = false

    const done = (error?: unknown) => {
      if (settled) return
      settled = true
      socket.destroy()
      if (error) reject(error)
      else resolve()
    }

    socket.setTimeout(4000)
    socket.once('error', error => {
      // Treat missing/invalid socket path as a normal send failure.
      const code = getErrnoCode(error)
      if (code === 'ENOENT' || code === 'ECONNREFUSED') {
        done(
          new Error(`Target socket is unavailable: ${target} (${code})`),
        )
        return
      }
      done(error)
    })
    socket.once('timeout', () => {
      done(new Error(`Timed out sending message to socket: ${target}`))
    })
    socket.once('connect', () => {
      socket.end(`${payload}\n`, 'utf8', () => done())
    })
  })
}
