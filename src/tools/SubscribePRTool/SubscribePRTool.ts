import { mkdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { getUniCoreConfigHomeDir } from '../../utils/envUtils.js'
import { lazySchema } from '../../utils/lazySchema.js'

const SUBSCRIBE_PR_TOOL_NAME = 'SubscribePRTool'
const DESCRIPTION =
  'Manage local pull-request watch entries (subscribe, unsubscribe, list).'

type Subscription = {
  repo: string
  pr: number
  createdAt: string
  note?: string
}

const STORE_FILE = () =>
  join(getUniCoreConfigHomeDir(), 'state', 'pr-subscriptions.json')

async function readSubscriptions(): Promise<Subscription[]> {
  try {
    const raw = await readFile(STORE_FILE(), 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is Subscription => {
      return (
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as Subscription).repo === 'string' &&
        Number.isInteger((entry as Subscription).pr)
      )
    })
  } catch {
    return []
  }
}

async function writeSubscriptions(subscriptions: Subscription[]): Promise<void> {
  const dir = join(getUniCoreConfigHomeDir(), 'state')
  await mkdir(dir, { recursive: true })
  await writeFile(STORE_FILE(), JSON.stringify(subscriptions, null, 2) + '\n')
}

const inputSchema = lazySchema(() =>
  z.strictObject({
    action: z
      .enum(['subscribe', 'unsubscribe', 'list'])
      .default('subscribe')
      .describe('Operation to perform.'),
    repo: z
      .string()
      .optional()
      .describe('Repository in owner/name format, e.g. openai/claude-code.'),
    pr: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Pull request number. Required for subscribe/unsubscribe.'),
    note: z
      .string()
      .max(200)
      .optional()
      .describe('Optional local note saved with the subscription.'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    ok: z.boolean(),
    action: z.enum(['subscribe', 'unsubscribe', 'list']),
    message: z.string(),
    subscriptions: z.array(
      z.object({
        repo: z.string(),
        pr: z.number(),
        createdAt: z.string(),
        note: z.string().optional(),
      }),
    ),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

function normalizedRepo(repo: string | undefined): string | null {
  const value = repo?.trim()
  if (!value) return null
  const slashCount = value.split('/').length - 1
  return slashCount === 1 ? value : null
}

export const SubscribePRTool = buildTool({
  name: SUBSCRIBE_PR_TOOL_NAME,
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return DESCRIPTION
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  maxResultSizeChars: 64_000,
  isConcurrencySafe() {
    return false
  },
  isReadOnly(input) {
    return input.action === 'list'
  },
  toAutoClassifierInput(input) {
    return `subscribe-pr ${input.action}`
  },
  renderToolUseMessage(input) {
    return `${input.action}${input.repo ? ` ${input.repo}` : ''}${input.pr ? `#${input.pr}` : ''}`
  },
  renderToolResultMessage(output) {
    return output.message
  },
  async call(input) {
    const subscriptions = await readSubscriptions()

    if (input.action === 'list') {
      return {
        data: {
          ok: true,
          action: 'list',
          message: `Loaded ${subscriptions.length} PR subscription(s).`,
          subscriptions,
        } satisfies Output,
      }
    }

    const repo = normalizedRepo(input.repo)
    if (!repo || !input.pr) {
      return {
        data: {
          ok: false,
          action: input.action,
          message:
            'repo (owner/name) and pr are required for subscribe/unsubscribe.',
          subscriptions,
        } satisfies Output,
      }
    }

    const key = `${repo}#${input.pr}`
    const index = subscriptions.findIndex(
      entry => `${entry.repo}#${entry.pr}` === key,
    )

    if (input.action === 'unsubscribe') {
      if (index >= 0) {
        subscriptions.splice(index, 1)
        await writeSubscriptions(subscriptions)
        return {
          data: {
            ok: true,
            action: 'unsubscribe',
            message: `Unsubscribed from ${key}.`,
            subscriptions,
          } satisfies Output,
        }
      }
      return {
        data: {
          ok: false,
          action: 'unsubscribe',
          message: `No subscription found for ${key}.`,
          subscriptions,
        } satisfies Output,
      }
    }

    if (index >= 0) {
      subscriptions[index] = {
        ...subscriptions[index]!,
        ...(input.note ? { note: input.note } : {}),
      }
      await writeSubscriptions(subscriptions)
      return {
        data: {
          ok: true,
          action: 'subscribe',
          message: `Updated existing subscription for ${key}.`,
          subscriptions,
        } satisfies Output,
      }
    }

    subscriptions.push({
      repo,
      pr: input.pr,
      createdAt: new Date().toISOString(),
      ...(input.note ? { note: input.note } : {}),
    })
    await writeSubscriptions(subscriptions)

    return {
      data: {
        ok: true,
        action: 'subscribe',
        message: `Subscribed to ${key}.`,
        subscriptions,
      } satisfies Output,
    }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: JSON.stringify(output, null, 2),
    }
  },
} satisfies ToolDef<InputSchema, Output>)

export default SubscribePRTool
