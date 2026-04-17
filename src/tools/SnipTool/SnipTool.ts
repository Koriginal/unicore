import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import {
  isSnipRuntimeEnabled,
  snipCompactIfNeeded,
} from '../../services/compact/snipCompact.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { tokenCountWithEstimation } from '../../utils/tokens.js'
import { DESCRIPTION, SNIP_TOOL_NAME, SNIP_TOOL_PROMPT } from './prompt.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    force: z
      .boolean()
      .optional()
      .describe('Force a snip attempt even if heuristics would skip it.'),
    reason: z
      .string()
      .max(200)
      .optional()
      .describe('Optional short reason for diagnostics.'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    runtimeEnabled: z.boolean(),
    changed: z.boolean(),
    tokensFreed: z.number(),
    preTokens: z.number(),
    postTokens: z.number(),
    message: z.string(),
    reason: z.string().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

export const SnipTool = buildTool({
  name: SNIP_TOOL_NAME,
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return SNIP_TOOL_PROMPT
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  maxResultSizeChars: 8_000,
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  toAutoClassifierInput(input) {
    return `snip${input.force ? ' --force' : ''}`
  },
  renderToolUseMessage(input) {
    return input.force ? 'Running forced context snip' : 'Running context snip'
  },
  renderToolResultMessage(output) {
    return output.message
  },
  async call(input, context) {
    const runtimeEnabled = isSnipRuntimeEnabled()
    const preTokens = tokenCountWithEstimation(context.messages)
    const compactResult = snipCompactIfNeeded(context.messages, {
      force: input.force ?? false,
    })
    const postTokens = tokenCountWithEstimation(compactResult.messages)
    const changed = compactResult.tokensFreed > 0 || postTokens < preTokens
    const tokensFreed = Math.max(
      compactResult.tokensFreed,
      Math.max(0, preTokens - postTokens),
    )

    let message: string
    if (!runtimeEnabled) {
      message =
        'Snip runtime is disabled in this build. Use /compact for immediate context reduction.'
    } else if (!changed) {
      message =
        'No snippable history was found for this turn. Continue normally or use /compact.'
    } else {
      message = `Snip analysis completed and identified ~${tokensFreed} tokens that can be reclaimed.`
    }

    return {
      data: {
        runtimeEnabled,
        changed,
        tokensFreed,
        preTokens,
        postTokens,
        message,
        ...(input.reason ? { reason: input.reason } : {}),
      } satisfies Output,
    }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    const lines = [
      output.message,
      `runtimeEnabled: ${output.runtimeEnabled}`,
      `changed: ${output.changed}`,
      `preTokens: ${output.preTokens}`,
      `postTokens: ${output.postTokens}`,
      `tokensFreed: ${output.tokensFreed}`,
    ]
    if (output.reason) {
      lines.push(`reason: ${output.reason}`)
    }
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: lines.join('\n'),
    }
  },
} satisfies ToolDef<InputSchema, Output>)

export default SnipTool
