import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import type { Message } from '../../types/message.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { tokenCountWithEstimation } from '../../utils/tokens.js'

const CTX_INSPECT_TOOL_NAME = 'CtxInspectTool'
const DESCRIPTION =
  'Inspect current conversation context stats (message counts, token estimate, recent message types).'

const inputSchema = lazySchema(() =>
  z.strictObject({
    include_recent: z
      .boolean()
      .optional()
      .describe('Include a compact list of recent messages (default: true).'),
    recent_count: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('How many recent messages to include (default: 10).'),
  }),
)

type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    messageCount: z.number(),
    estimatedTokens: z.number(),
    byType: z.record(z.string(), z.number()),
    recent: z.array(z.string()).optional(),
  }),
)

type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

function summarizeMessage(message: Message, index: number): string {
  const type = message.type
  if (type === 'assistant' || type === 'user') {
    const blocks = message.message?.content ?? []
    const blockType = blocks[0]?.type ?? 'empty'
    return `#${index} ${type}:${blockType}`
  }
  if (type === 'attachment') {
    return `#${index} attachment:${message.attachment.type}`
  }
  if (type === 'system') {
    return `#${index} system:${message.subtype}`
  }
  return `#${index} ${type}`
}

export const CtxInspectTool = buildTool({
  name: CTX_INSPECT_TOOL_NAME,
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
  maxResultSizeChars: 40_000,
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  toAutoClassifierInput() {
    return 'inspect-context'
  },
  renderToolUseMessage() {
    return 'Inspecting context state'
  },
  renderToolResultMessage(output) {
    return `Context: ${output.messageCount} messages, ~${output.estimatedTokens} tokens`
  },
  async call(input, context) {
    const messages = context.messages
    const byType: Record<string, number> = {}
    for (const message of messages) {
      byType[message.type] = (byType[message.type] ?? 0) + 1
    }

    const includeRecent = input.include_recent ?? true
    const recentCount = input.recent_count ?? 10
    const start = Math.max(0, messages.length - recentCount)
    const recent = includeRecent
      ? messages.slice(start).map((message, i) => summarizeMessage(message, start + i))
      : undefined

    const output: Output = {
      messageCount: messages.length,
      estimatedTokens: tokenCountWithEstimation(messages),
      byType,
      ...(recent ? { recent } : {}),
    }

    return { data: output }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    const lines = [
      `messageCount: ${output.messageCount}`,
      `estimatedTokens: ${output.estimatedTokens}`,
      `byType: ${JSON.stringify(output.byType)}`,
    ]
    if (output.recent && output.recent.length > 0) {
      lines.push('recent:')
      lines.push(...output.recent)
    }
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: lines.join('\n'),
    }
  },
} satisfies ToolDef<InputSchema, Output>)

export default CtxInspectTool
