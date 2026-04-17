import { z } from 'zod/v4'
import type { Tool } from '../../Tool.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { execFileNoThrow } from '../../utils/execFileNoThrow.js'
import { getPlatform } from '../../utils/platform.js'
import { lazySchema } from '../../utils/lazySchema.js'
import {
  ensureSocketInitialized,
  getUniCoreSocketName,
  isSocketInitialized,
  markTmuxToolUsed,
  resetSocketState,
} from '../../utils/tmuxSocket.js'

const NAME = 'Tungsten'

const inputSchema = lazySchema(() =>
  z.strictObject({
    action: z
      .enum(['status', 'list-sessions', 'list-windows'])
      .optional()
      .default('status'),
    session: z
      .string()
      .max(128)
      .optional()
      .describe('Target session name for list-windows action'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

type SessionInfo = {
  name: string
  windows: number
  attached: boolean
}

type WindowInfo = {
  index: number
  name: string
  active: boolean
}

type Output = {
  ok: boolean
  action: 'status' | 'list-sessions' | 'list-windows'
  socket: string | null
  message: string
  sessions?: SessionInfo[]
  windows?: WindowInfo[]
}

const touchedSessions = new Set<string>()

async function execTmux(args: string[]): Promise<{
  stdout: string
  stderr: string
  code: number
}> {
  if (getPlatform() === 'windows') {
    return execFileNoThrow('wsl', ['-e', 'tmux', ...args], {
      useCwd: false,
      env: { ...process.env, WSL_UTF8: '1' },
    })
  }
  return execFileNoThrow('tmux', args, { useCwd: false })
}

function parseSessions(output: string): SessionInfo[] {
  return output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [name = '', windows = '0', attached = '0'] = line.split('\t')
      return {
        name,
        windows: Number.parseInt(windows, 10) || 0,
        attached: attached === '1',
      }
    })
}

function parseWindows(output: string): WindowInfo[] {
  return output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [index = '0', name = '', active = '0'] = line.split('\t')
      return {
        index: Number.parseInt(index, 10) || 0,
        name,
        active: active === '1',
      }
    })
}

export const TungstenTool: Tool<InputSchema, Output> = buildTool({
  name: NAME,
  maxResultSizeChars: 100_000,
  async description() {
    return 'Tmux session diagnostics for UniCore isolated socket.'
  },
  async prompt() {
    return 'Use this tool to inspect UniCore tmux socket/session/window state.'
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  userFacingName() {
    return NAME
  },
  isEnabled() {
    return true
  },
  isConcurrencySafe() {
    return false
  },
  isReadOnly() {
    return false
  },
  async checkPermissions() {
    return { behavior: 'allow' as const }
  },
  renderToolUseMessage() {
    return null
  },
  renderToolUseProgressMessage() {
    return null
  },
  renderToolUseQueuedMessage() {
    return null
  },
  renderToolUseRejectedMessage() {
    return null
  },
  renderToolResultMessage() {
    return null
  },
  renderToolUseErrorMessage() {
    return null
  },
  async call(input) {
    markTmuxToolUsed()
    await ensureSocketInitialized()

    const socket = getUniCoreSocketName()
    if (!isSocketInitialized()) {
      return {
        data: {
          ok: false,
          action: 'status',
          socket: null,
          message:
            'Tmux socket is not initialized (tmux may be missing or initialization failed).',
        },
      }
    }

    const action = input.action

    if (action === 'status' || action === 'list-sessions') {
      const sessionsRes = await execTmux([
        '-L',
        socket,
        'list-sessions',
        '-F',
        '#{session_name}\t#{session_windows}\t#{session_attached}',
      ])
      if (sessionsRes.code !== 0) {
        return {
          data: {
            ok: false,
            action,
            socket,
            message: sessionsRes.stderr || 'Failed to query tmux sessions.',
          },
        }
      }
      const sessions = parseSessions(sessionsRes.stdout)
      sessions.forEach(s => touchedSessions.add(s.name))
      return {
        data: {
          ok: true,
          action,
          socket,
          sessions,
          message:
            action === 'status'
              ? `Socket ready; ${sessions.length} session(s) detected.`
              : `Listed ${sessions.length} session(s).`,
        },
      }
    }

    const session = input.session?.trim()
    if (!session) {
      return {
        data: {
          ok: false,
          action,
          socket,
          message: 'session is required for list-windows action.',
        },
      }
    }

    const windowsRes = await execTmux([
      '-L',
      socket,
      'list-windows',
      '-t',
      session,
      '-F',
      '#{window_index}\t#{window_name}\t#{window_active}',
    ])
    if (windowsRes.code !== 0) {
      return {
        data: {
          ok: false,
          action,
          socket,
          message: windowsRes.stderr || `Failed to query windows for ${session}.`,
        },
      }
    }
    touchedSessions.add(session)
    const windows = parseWindows(windowsRes.stdout)
    return {
      data: {
        ok: true,
        action,
        socket,
        windows,
        message: `Listed ${windows.length} window(s) in session "${session}".`,
      },
    }
  },
  mapToolResultToToolResultBlockParam(result, toolUseID) {
    const sections: string[] = [
      `ok: ${result.ok}`,
      `action: ${result.action}`,
      `socket: ${result.socket ?? '(none)'}`,
      `message: ${result.message}`,
    ]
    if (result.sessions) {
      sections.push(
        `sessions:\n${result.sessions
          .map(
            s =>
              `- ${s.name} | windows=${s.windows} | attached=${s.attached ? 'yes' : 'no'}`,
          )
          .join('\n')}`,
      )
    }
    if (result.windows) {
      sections.push(
        `windows:\n${result.windows
          .map(
            w =>
              `- #${w.index} ${w.name} | active=${w.active ? 'yes' : 'no'}`,
          )
          .join('\n')}`,
      )
    }
    return {
      type: 'tool_result',
      content: sections.join('\n'),
      tool_use_id: toolUseID,
    }
  },
} satisfies ToolDef<InputSchema, Output>)

export function clearSessionsWithTungstenUsage(): void {
  touchedSessions.clear()
}

export function resetInitializationState(): void {
  touchedSessions.clear()
  resetSocketState()
}
