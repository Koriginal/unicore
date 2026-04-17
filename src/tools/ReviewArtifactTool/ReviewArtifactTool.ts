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
import { expandPath } from '../../utils/path.js'
import { checkReadPermissionForTool } from '../../utils/permissions/filesystem.js'
import type { PermissionDecision } from '../../utils/permissions/PermissionResult.js'
import { matchWildcardPattern } from '../../utils/permissions/shellRuleMatching.js'

const REVIEW_ARTIFACT_TOOL_NAME = 'ReviewArtifactTool'
const DESCRIPTION =
  'Load a text artifact (file or inline text) and return a compact review-oriented summary.'
const DEFAULT_MAX_BYTES = 64 * 1024
const HARD_MAX_BYTES = 512 * 1024

const inputSchema = lazySchema(() =>
  z.strictObject({
    artifact_path: z
      .string()
      .optional()
      .describe('Path to a local artifact file to inspect.'),
    artifact_text: z
      .string()
      .max(HARD_MAX_BYTES)
      .optional()
      .describe('Inline artifact text when path is not used.'),
    max_bytes: z
      .number()
      .int()
      .min(256)
      .max(HARD_MAX_BYTES)
      .optional()
      .describe(`Maximum bytes to load from file artifacts (default: ${DEFAULT_MAX_BYTES}).`),
    focus: z
      .string()
      .max(200)
      .optional()
      .describe('Optional short focus area for review context.'),
  }),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    source: z.enum(['path', 'inline']),
    path: z.string().optional(),
    loadedBytes: z.number(),
    truncated: z.boolean(),
    lineCount: z.number(),
    quickFindings: z.array(z.string()),
    preview: z.string(),
    focus: z.string().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

function computeQuickFindings(content: string): string[] {
  const findings: string[] = []
  if (/TODO|FIXME/.test(content)) {
    findings.push('Contains TODO/FIXME markers that may indicate unfinished work.')
  }
  if (/console\.log\(/.test(content)) {
    findings.push('Contains console.log statements that may be debug leftovers.')
  }
  if (content.length < 80) {
    findings.push('Artifact content is very short; review confidence may be limited.')
  }
  if (findings.length === 0) {
    findings.push('No immediate heuristic red flags detected in quick scan.')
  }
  return findings
}

function splitLines(content: string): number {
  if (!content) return 0
  return content.split(/\r?\n/).length
}

export const ReviewArtifactTool = buildTool({
  name: REVIEW_ARTIFACT_TOOL_NAME,
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
    return `review-artifact ${input.artifact_path ?? 'inline'}`
  },
  getPath(input) {
    return input.artifact_path ? expandPath(input.artifact_path) : undefined
  },
  async preparePermissionMatcher(input) {
    if (!input.artifact_path) return null
    return rulePattern => matchWildcardPattern(rulePattern, input.artifact_path!)
  },
  async validateInput(input): Promise<ValidationResult> {
    if (!input.artifact_path && !input.artifact_text) {
      return {
        result: false,
        message: 'Either artifact_path or artifact_text must be provided.',
        errorCode: 1,
      }
    }
    if (!input.artifact_path) {
      return { result: true }
    }
    const fs = getFsImplementation()
    const absolutePath = expandPath(input.artifact_path)
    try {
      const stats = await fs.stat(absolutePath)
      if (!stats.isFile()) {
        return {
          result: false,
          message: `Path is not a file: ${input.artifact_path}`,
          errorCode: 2,
        }
      }
      return { result: true }
    } catch (e: unknown) {
      if (isENOENT(e)) {
        const cwdSuggestion = await suggestPathUnderCwd(absolutePath)
        let message = `File does not exist: ${input.artifact_path}. ${FILE_NOT_FOUND_CWD_NOTE} ${getCwd()}.`
        if (cwdSuggestion) message += ` Did you mean ${cwdSuggestion}?`
        return { result: false, message, errorCode: 3 }
      }
      throw e
    }
  },
  async checkPermissions(input, context): Promise<PermissionDecision> {
    if (!input.artifact_path) {
      return { behavior: 'allow', updatedInput: input }
    }
    return checkReadPermissionForTool(
      ReviewArtifactTool,
      input,
      context.getAppState().toolPermissionContext,
    )
  },
  renderToolUseMessage(input) {
    return input.artifact_path
      ? `Reviewing artifact ${input.artifact_path}`
      : 'Reviewing inline artifact'
  },
  renderToolResultMessage(output) {
    return `Reviewed artifact (${output.loadedBytes} bytes, ${output.lineCount} lines)`
  },
  async call(input) {
    const fs = getFsImplementation()
    const maxBytes = input.max_bytes ?? DEFAULT_MAX_BYTES

    let content = ''
    let source: Output['source'] = 'inline'
    let path: string | undefined
    let loadedBytes = 0
    let truncated = false

    if (input.artifact_path) {
      source = 'path'
      path = expandPath(input.artifact_path)
      const buffer = await fs.readFileBytes(path)
      loadedBytes = buffer.length
      truncated = loadedBytes > maxBytes
      const sliced = truncated ? buffer.subarray(0, maxBytes) : buffer
      content = sliced.toString('utf8')
    } else {
      const inline = input.artifact_text ?? ''
      loadedBytes = Buffer.byteLength(inline, 'utf8')
      truncated = loadedBytes > maxBytes
      content = truncated ? inline.slice(0, maxBytes) : inline
    }

    const output: Output = {
      source,
      ...(path ? { path } : {}),
      loadedBytes,
      truncated,
      lineCount: splitLines(content),
      quickFindings: computeQuickFindings(content),
      preview: content,
      ...(input.focus ? { focus: input.focus } : {}),
    }
    return { data: output }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    const lines = [
      `source: ${output.source}`,
      ...(output.path ? [`path: ${output.path}`] : []),
      `loadedBytes: ${output.loadedBytes}`,
      `truncated: ${output.truncated}`,
      `lineCount: ${output.lineCount}`,
      ...(output.focus ? [`focus: ${output.focus}`] : []),
      'quickFindings:',
      ...output.quickFindings.map(finding => `- ${finding}`),
      'preview:',
      output.preview,
    ]

    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: lines.join('\n'),
    }
  },
} satisfies ToolDef<InputSchema, Output>)

export default ReviewArtifactTool
