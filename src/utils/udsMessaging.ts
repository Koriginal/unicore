/** Unix domain socket messaging server (UDS_INBOX feature). */

import { randomUUID } from 'crypto'
import { mkdir, unlink } from 'fs/promises'
import net from 'net'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { getSessionId } from '../bootstrap/state.js'
import { CROSS_SESSION_MESSAGE_TAG } from '../constants/xml.js'
import { enqueue } from './messageQueueManager.js'
import { registerCleanup } from './cleanupRegistry.js'
import { logForDebugging } from './debug.js'
import { errorMessage, getErrnoCode } from './errors.js'

type InboundPayload = {
  message: string
  from?: string
}

let udsServer: net.Server | null = null
let udsSocketPath: string | undefined
let onEnqueueCallback: (() => void) | null = null

function escapeXmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function formatCrossSessionMessage(from: string | undefined, text: string): string {
  const fromAttr = from ? ` from="${escapeXmlAttribute(from)}"` : ''
  return `<${CROSS_SESSION_MESSAGE_TAG}${fromAttr}>\n${text}\n</${CROSS_SESSION_MESSAGE_TAG}>`
}

function parseInboundPayload(raw: string): InboundPayload | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (typeof parsed === 'string') {
      return { message: parsed }
    }
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      const message = obj.message ?? obj.text
      const from = obj.from
      if (typeof message === 'string' && message.length > 0) {
        return {
          message,
          from: typeof from === 'string' && from.trim().length > 0 ? from : undefined,
        }
      }
    }
  } catch {
    // Accept plain text payloads for compatibility with external scripts.
  }

  return { message: trimmed }
}

function handleInbound(raw: string): void {
  const parsed = parseInboundPayload(raw)
  if (!parsed) return

  const wrapped = formatCrossSessionMessage(parsed.from, parsed.message)
  enqueue({
    mode: 'prompt',
    value: wrapped,
    uuid: randomUUID(),
    skipSlashCommands: true,
  })
  onEnqueueCallback?.()
}

async function safeUnlink(path: string): Promise<void> {
  try {
    await unlink(path)
  } catch (error) {
    if (getErrnoCode(error) !== 'ENOENT') {
      throw error
    }
  }
}

async function stopUdsServer(): Promise<void> {
  if (!udsServer) {
    return
  }

  const server = udsServer
  udsServer = null
  const oldPath = udsSocketPath
  udsSocketPath = undefined
  delete process.env.UNICORE_CODE_MESSAGING_SOCKET

  await new Promise<void>(resolve => {
    server.close(() => resolve())
  })

  if (oldPath) {
    await safeUnlink(oldPath).catch(() => {})
  }
}

function createServer(): net.Server {
  const server = net.createServer(socket => {
    socket.setEncoding('utf8')
    let buffer = ''

    socket.on('data', chunk => {
      buffer += chunk
    })

    socket.on('end', () => {
      try {
        handleInbound(buffer)
      } catch (error) {
        logForDebugging(
          `[udsMessaging] failed to process inbound payload: ${errorMessage(error)}`,
        )
      }
    })

    socket.on('error', error => {
      logForDebugging(
        `[udsMessaging] socket error: ${errorMessage(error)}`,
      )
    })
  })

  server.on('error', error => {
    logForDebugging(
      `[udsMessaging] server error: ${errorMessage(error)}`,
    )
  })

  return server
}

async function listenOnce(
  server: net.Server,
  socketPath: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening)
      reject(error)
    }
    const onListening = () => {
      server.off('error', onError)
      resolve()
    }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(socketPath)
  })
}

export function getDefaultUdsSocketPath(): string {
  return join(tmpdir(), `unicore-msg-${process.pid}.sock`)
}

export function getUdsMessagingSocketPath(): string | undefined {
  return udsSocketPath
}

export async function startUdsMessaging(
  socketPath: string,
  _options?: { isExplicit?: boolean; [key: string]: unknown },
): Promise<void> {
  if (process.platform === 'win32') {
    return
  }

  const targetPath =
    socketPath && socketPath.trim().length > 0
      ? socketPath
      : getDefaultUdsSocketPath()

  if (udsServer && udsSocketPath === targetPath) {
    process.env.UNICORE_CODE_MESSAGING_SOCKET = targetPath
    return
  }

  await stopUdsServer()

  await mkdir(dirname(targetPath), { recursive: true })
  await safeUnlink(targetPath)

  const server = createServer()
  try {
    await listenOnce(server, targetPath)
  } catch (error) {
    // One retry for stale sockets that appeared between unlink/listen.
    if (getErrnoCode(error) === 'EADDRINUSE') {
      await safeUnlink(targetPath)
      await listenOnce(server, targetPath)
    } else {
      throw error
    }
  }

  udsServer = server
  udsSocketPath = targetPath
  process.env.UNICORE_CODE_MESSAGING_SOCKET = targetPath

  logForDebugging(
    `[udsMessaging] listening on ${targetPath} (session=${getSessionId()})`,
  )
}

export function setOnEnqueue(callback: () => void): void {
  onEnqueueCallback = callback
}

registerCleanup(async () => {
  await stopUdsServer()
})
