import { getReplBridgeHandle } from './replBridgeHandle.js'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { sendToUdsSocket } from '../utils/udsClient.js'
import { getUniCoreConfigHomeDir } from '../utils/envUtils.js'
import { isProcessRunning } from '../utils/genericProcessUtils.js'
import { errorMessage } from '../utils/errors.js'

type SessionRegistryEntry = {
  pid?: number
  bridgeSessionId?: string
  messagingSocketPath?: string
}

function getSessionsDir(): string {
  return join(getUniCoreConfigHomeDir(), 'sessions')
}

function parseSessionFileName(file: string): number | null {
  if (!/^\d+\.json$/.test(file)) return null
  const parsed = Number.parseInt(file.slice(0, -5), 10)
  return Number.isFinite(parsed) ? parsed : null
}

async function findLocalSocketPathByBridgeId(
  bridgeSessionId: string,
): Promise<string | null> {
  let files: string[]
  try {
    files = await readdir(getSessionsDir())
  } catch {
    return null
  }

  for (const file of files) {
    const pidFromName = parseSessionFileName(file)
    if (pidFromName === null) continue

    let entry: SessionRegistryEntry
    try {
      entry = JSON.parse(
        await readFile(join(getSessionsDir(), file), 'utf8'),
      ) as SessionRegistryEntry
    } catch {
      continue
    }

    const pid = entry.pid ?? pidFromName
    if (pid !== process.pid && !isProcessRunning(pid)) {
      continue
    }

    if (
      entry.bridgeSessionId === bridgeSessionId &&
      entry.messagingSocketPath
    ) {
      return entry.messagingSocketPath
    }
  }

  return null
}

export async function postInterUniCoreMessage(
  to: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const localSocketPath = await findLocalSocketPathByBridgeId(to)
  if (localSocketPath) {
    try {
      await sendToUdsSocket(localSocketPath, message)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: `Local bridge relay failed: ${errorMessage(error)}`,
      }
    }
  }

  const handle = getReplBridgeHandle()
  if (!handle) {
    return {
      ok: false,
      error:
        'Remote Control bridge is not connected. Start /remote-control and retry.',
    }
  }

  // Cross-session bridge relay requires server-side routing capability.
  // Keep the method non-throwing so SendMessageTool can surface a clean error.
  return {
    ok: false,
    error: `Cross-session bridge relay to "${to}" is not enabled in this offline build yet.`,
  }
}

export const postInterClaudeMessage = postInterUniCoreMessage

export default { postInterUniCoreMessage, postInterClaudeMessage }
