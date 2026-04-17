import { z } from 'zod/v4'
import type { ValidationResult } from '../../Tool.js'
import { buildTool, type ToolDef } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import { isENOENT } from '../../utils/errors.js'
import {
  FILE_NOT_FOUND_CWD_NOTE,
  suggestPathUnderCwd,
} from '../../utils/file.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { expandPath, toRelativePath } from '../../utils/path.js'
import { checkReadPermissionForTool } from '../../utils/permissions/filesystem.js'
import type { PermissionDecision } from '../../utils/permissions/PermissionResult.js'
import { matchWildcardPattern } from '../../utils/permissions/shellRuleMatching.js'
import { DESCRIPTION, SEND_USER_FILE_TOOL_NAME } from './prompt.js'

const DEFAULT_MAX_BYTES = 16 * 1024
const HARD_MAX_BYTES = 256 * 1024

const inputSchema = lazySchema(() =>
  z.strictObject({
    path: z.string().describe('Absolute or relative local file path.'),
    include_content: z
      .boolean()
      .optional()
      .describe('Whether to include a UTF-8 preview in the result (default: true).'),
    max_bytes: z
      .number()
      .int()
      .min(256)
      .max(HARD_MAX_BYTES)
      .optional()
      .describe(`Maximum preview bytes when include_content=true (default: ${DEFAULT_MAX_BYTES}).`),
  }),
)

type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    path: z.string(),
    relativePath: z.string(),
    sizeBytes: z.number(),
    truncated: z.boolean(),
    contentPreview: z.string().optional(),
  }),
)

type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

export const SendUserFileTool = buildTool({
  name: SEND_USER_FILE_TOOL_NAME,
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
  maxResultSizeChars: 100_000,
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  toAutoClassifierInput(input) {
    return `send-user-file ${input.path}`
  },
  getPath(input) {
    return expandPath(input.path)
  },
  async preparePermissionMatcher(input) {
    return rulePattern => matchWildcardPattern(rulePattern, input.path)
  },
  async validateInput(input): Promise<ValidationResult> {
    const fs = getFsImplementation()
    const absolutePath = expandPath(input.path)

    let stats
    try {
      stats = await fs.stat(absolutePath)
    } catch (e: unknown) {
      if (isENOENT(e)) {
        const cwdSuggestion = await suggestPathUnderCwd(absolutePath)
        let message = `File does not exist: ${input.path}. ${FILE_NOT_FOUND_CWD_NOTE} ${getCwd()}.`
        if (cwdSuggestion) {
          message += ` Did you mean ${cwdSuggestion}?`
        }
        return {
          result: false,
          message,
          errorCode: 1,
        }
      }
      throw e
    }

    if (!stats.isFile()) {
      return {
        result: false,
        message: `Path is not a file: ${input.path}`,
        errorCode: 2,
      }
    }

    return { result: true }
  },
  async checkPermissions(input, context): Promise<PermissionDecision> {
    const appState = context.getAppState()
    return checkReadPermissionForTool(
      SendUserFileTool,
      input,
      appState.toolPermissionContext,
    )
  },
  renderToolUseMessage(input) {
    return `Preparing file ${input.path}`
  },
  renderToolResultMessage(output) {
    return `Prepared ${output.relativePath} (${output.sizeBytes} bytes${output.truncated ? ', preview truncated' : ''})`
  },
  async call(input) {
    const fs = getFsImplementation()
    const absolutePath = expandPath(input.path)
    const stats = await fs.stat(absolutePath)
    const maxBytes = input.max_bytes ?? DEFAULT_MAX_BYTES
    const includeContent = input.include_content ?? true

    let preview = ''
    let truncated = false
    if (includeContent) {
      const buf = await fs.readFile(absolutePath)
      truncated = buf.length > maxBytes
      const sliced = truncated ? buf.subarray(0, maxBytes) : buf
      preview = sliced.toString('utf8')
    }

    const output: Output = {
      path: absolutePath,
      relativePath: toRelativePath(absolutePath),
      sizeBytes: stats.size,
      truncated,
      ...(includeContent ? { contentPreview: preview } : {}),
    }

    return { data: output }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    const lines = [
      `Prepared file: ${output.relativePath}`,
      `Size: ${output.sizeBytes} bytes`,
    ]
    if (output.contentPreview !== undefined) {
      lines.push('--- Preview ---')
      lines.push(output.contentPreview)
      if (output.truncated) {
        lines.push('--- Preview truncated ---')
      }
    }
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: lines.join('\n'),
    }
  },
} satisfies ToolDef<InputSchema, Output>)

export default SendUserFileTool
