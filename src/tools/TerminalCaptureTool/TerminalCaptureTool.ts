import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { getDebugLogPath } from '../../utils/debug.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { DESCRIPTION, TERMINAL_CAPTURE_TOOL_NAME } from './prompt.js'

const DEFAULT_LINES = 120
const HARD_MAX_LINES = 800

const inputSchema = lazySchema(() =>
  z.strictObject({
    path: z
      .string()
      .optional()
      .describe('Optional explicit log file path. Defaults to current session debug log.'),
    lines: z
      .number()
      .int()
      .min(1)
      .max(HARD_MAX_LINES)
      .optional()
      .describe(`How many recent lines to capture (default: ${DEFAULT_LINES}).`),
  }),
)

type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    sourcePath: z.string(),
    linesCaptured: z.number(),
    truncated: z.boolean(),
    content: z.string(),
  }),
)

type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

export const TerminalCaptureTool = buildTool({
  name: TERMINAL_CAPTURE_TOOL_NAME,
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
  maxResultSizeChars: 120_000,
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  toAutoClassifierInput(input) {
    return `terminal-capture ${input.lines ?? DEFAULT_LINES}`
  },
  renderToolUseMessage(input) {
    return `Capturing terminal diagnostics (${input.lines ?? DEFAULT_LINES} lines)`
  },
  renderToolResultMessage(output) {
    return `Captured ${output.linesCaptured} lines from ${output.sourcePath}${output.truncated ? ' (truncated)' : ''}`
  },
  async call(input) {
    const fs = getFsImplementation()
    const sourcePath = input.path?.trim() || getDebugLogPath()
    const limit = input.lines ?? DEFAULT_LINES

    let content = ''
    try {
      content = await fs.readFile(sourcePath, 'utf8')
    } catch {
      const output: Output = {
        sourcePath,
        linesCaptured: 0,
        truncated: false,
        content: 'No terminal/debug log content available for this session yet.',
      }
      return { data: output }
    }

    const allLines = content.split(/\r?\n/)
    const nonEmpty = allLines.filter(line => line.length > 0)
    const truncated = nonEmpty.length > limit
    const selected = truncated ? nonEmpty.slice(-limit) : nonEmpty

    const output: Output = {
      sourcePath,
      linesCaptured: selected.length,
      truncated,
      content: selected.join('\n'),
    }

    return { data: output }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    const header = `Terminal capture from ${output.sourcePath} (${output.linesCaptured} lines${output.truncated ? ', truncated' : ''})`
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: `${header}\n${output.content}`,
    }
  },
} satisfies ToolDef<InputSchema, Output>)

export default TerminalCaptureTool
