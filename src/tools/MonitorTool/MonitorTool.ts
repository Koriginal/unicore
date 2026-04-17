import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { z } from 'zod/v4'
import { findToolByName, buildTool, type ToolDef } from '../../Tool.js'
import { updateTaskState } from '../../utils/task/framework.js'
import type { LocalShellTaskState } from '../../tasks/LocalShellTask/guards.js'
import { BASH_TOOL_NAME } from '../BashTool/toolName.js'

const inputSchema = z.strictObject({
  command: z.string().min(1),
  description: z.string().optional(),
  timeout: z.number().int().positive().max(600000).optional(),
})

type Input = z.infer<typeof inputSchema>
type Output = {
  ok: boolean
  message: string
  taskId?: string
  delegatedTool?: string
  raw?: unknown
}

export const MonitorTool = buildTool({
  name: 'Monitor',
  maxResultSizeChars: 64_000,
  isConcurrencySafe: () => true,
  isReadOnly: () => true,
  get inputSchema() {
    return inputSchema
  },
  async description(input: Input) {
    return `Start monitor command: ${input.description ?? input.command}`
  },
  async prompt() {
    return 'Run a long-lived command in background and monitor its output lifecycle.'
  },
  renderToolUseMessage(input: Input) {
    return input.command
  },
  mapToolResultToToolResultBlockParam(
    output: Output,
    toolUseID: string,
  ): ToolResultBlockParam {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: JSON.stringify(output, null, 2),
    }
  },
  async call(input, context, canUseTool, assistantMessage): Promise<{ data: Output }> {
    const bashTool = findToolByName(context.options.tools, BASH_TOOL_NAME)
    if (!bashTool) {
      return {
        data: {
          ok: false,
          message: 'Bash tool is unavailable, cannot start monitor command',
        },
      }
    }

    const result = await bashTool.call(
      {
        command: input.command,
        description: input.description?.trim() || `monitor: ${input.command}`,
        timeout: input.timeout,
        run_in_background: true,
      },
      context,
      canUseTool,
      assistantMessage,
    )

    const taskId = (result as any)?.data?.backgroundTaskId as string | undefined
    if (taskId) {
      updateTaskState<LocalShellTaskState>(taskId, context.setAppState, task => ({
        ...task,
        kind: 'monitor',
      }))
    }

    return {
      data: {
        ok: true,
        message: taskId
          ? `monitor running in background: ${taskId}`
          : 'monitor command executed',
        taskId,
        delegatedTool: BASH_TOOL_NAME,
        raw: (result as any)?.data,
      },
    }
  },
} satisfies ToolDef<typeof inputSchema, Output>)
