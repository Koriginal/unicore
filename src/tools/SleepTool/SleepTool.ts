import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { sleep } from '../../utils/sleep.js'
import { DESCRIPTION, SLEEP_TOOL_NAME, SLEEP_TOOL_PROMPT } from './prompt.js'

const MAX_SLEEP_MS = 5 * 60 * 1000

const inputSchema = lazySchema(() =>
  z.strictObject({
    duration_ms: z
      .number()
      .int()
      .min(0)
      .max(MAX_SLEEP_MS)
      .optional()
      .describe('Sleep duration in milliseconds (default: 30000, max: 300000).'),
    reason: z
      .string()
      .max(200)
      .optional()
      .describe('Optional short reason for the sleep.'),
  }),
)

type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    durationMs: z.number(),
    interrupted: z.boolean(),
    reason: z.string().optional(),
  }),
)

type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

export const SleepTool = buildTool({
  name: SLEEP_TOOL_NAME,
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return SLEEP_TOOL_PROMPT
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  maxResultSizeChars: 4_096,
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  interruptBehavior() {
    return 'cancel'
  },
  toAutoClassifierInput(input) {
    return `sleep ${input.duration_ms ?? 30_000}ms`
  },
  renderToolUseMessage(input) {
    const ms = typeof input.duration_ms === 'number' ? input.duration_ms : 30_000
    return `Sleeping for ${ms}ms`
  },
  renderToolResultMessage(output) {
    return output.interrupted
      ? `Sleep interrupted after ${output.durationMs}ms`
      : `Slept for ${output.durationMs}ms`
  },
  async call(input, context) {
    const durationMs = input.duration_ms ?? 30_000
    const startedAt = Date.now()
    await sleep(durationMs, context.abortController.signal)
    const elapsed = Date.now() - startedAt
    const output: Output = {
      durationMs: elapsed,
      interrupted: context.abortController.signal.aborted,
      ...(input.reason ? { reason: input.reason } : {}),
    }
    return { data: output }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: output.interrupted
        ? `Sleep interrupted after ${output.durationMs}ms`
        : `Slept for ${output.durationMs}ms`,
    }
  },
} satisfies ToolDef<InputSchema, Output>)

export default SleepTool
