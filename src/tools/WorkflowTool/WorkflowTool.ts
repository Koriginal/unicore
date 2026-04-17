import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { z } from 'zod/v4'
import { findToolByName, buildTool, type ToolDef } from '../../Tool.js'
import { stopTask, StopTaskError } from '../../tasks/stopTask.js'
import { BASH_TOOL_NAME } from '../BashTool/toolName.js'
import { getTaskOutputPath } from '../../utils/task/diskOutput.js'
import { WORKFLOW_TOOL_NAME } from './constants.js'
import {
  getBundledWorkflow,
  listBundledWorkflows,
} from './bundled/index.js'
import type { WorkflowAction } from './types.js'

const inputSchema = z.strictObject({
  action: z.enum(['list', 'run', 'status', 'stop']).default('list'),
  workflow: z.string().optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  task_id: z.string().optional(),
  timeout: z.number().int().positive().max(600000).optional(),
  description: z.string().optional(),
})

type Input = z.infer<typeof inputSchema>

type Output = {
  action: WorkflowAction
  ok: boolean
  message: string
  workflows?: Array<{ id: string; name: string; description: string }>
  taskId?: string
  taskStatus?: string
  outputPath?: string
  delegatedTool?: string
  raw?: unknown
}

function resolveWorkflowCommand(input: Input): { command: string; label: string } {
  if (input.command?.trim()) {
    return {
      command: input.command.trim(),
      label: input.description?.trim() || 'custom workflow command',
    }
  }

  const workflowName = input.workflow?.trim()
  if (!workflowName) {
    throw new Error('workflow or command is required when action=run')
  }

  const workflow = getBundledWorkflow(workflowName)
  if (!workflow) {
    throw new Error(`unknown workflow: ${workflowName}`)
  }

  const args = (input.args ?? []).join(' ').trim()
  return {
    command: args ? `${workflow.command} ${args}` : workflow.command,
    label: workflow.name,
  }
}

export const WorkflowTool = buildTool({
  name: WORKFLOW_TOOL_NAME,
  maxResultSizeChars: 64_000,
  isConcurrencySafe: () => false,
  isReadOnly: () => false,
  get inputSchema() {
    return inputSchema
  },
  async description(input: Input) {
    switch (input.action) {
      case 'list':
        return 'List bundled workflows'
      case 'status':
        return `Check workflow task status (${input.task_id ?? 'missing task id'})`
      case 'stop':
        return `Stop workflow task (${input.task_id ?? 'missing task id'})`
      case 'run':
      default:
        return `Run workflow ${input.workflow ?? 'custom command'}`
    }
  },
  async prompt() {
    return 'Manage lightweight bundled workflows: list, run, status, stop.'
  },
  renderToolUseMessage(input: Input) {
    if (input.action === 'run') return input.workflow ?? input.command ?? 'run'
    return input.action
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
  async call(
    input,
    context,
    canUseTool,
    assistantMessage,
  ): Promise<{ data: Output }> {
    if (input.action === 'list') {
      const workflows = listBundledWorkflows().map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
      }))
      return {
        data: {
          action: 'list',
          ok: true,
          message: `Found ${workflows.length} bundled workflows`,
          workflows,
        },
      }
    }

    if (input.action === 'status') {
      if (!input.task_id) {
        return {
          data: {
            action: 'status',
            ok: false,
            message: 'task_id is required for action=status',
          },
        }
      }
      const task = context.getAppState().tasks[input.task_id]
      if (!task) {
        return {
          data: {
            action: 'status',
            ok: false,
            message: `task not found: ${input.task_id}`,
          },
        }
      }
      return {
        data: {
          action: 'status',
          ok: true,
          message: `task ${input.task_id} is ${task.status}`,
          taskId: input.task_id,
          taskStatus: task.status,
          outputPath: getTaskOutputPath(input.task_id),
        },
      }
    }

    if (input.action === 'stop') {
      if (!input.task_id) {
        return {
          data: {
            action: 'stop',
            ok: false,
            message: 'task_id is required for action=stop',
          },
        }
      }
      try {
        const result = await stopTask(input.task_id, {
          getAppState: context.getAppState,
          setAppState: context.setAppState,
        })
        return {
          data: {
            action: 'stop',
            ok: true,
            message: `stopped task ${result.taskId} (${result.taskType})`,
            taskId: result.taskId,
          },
        }
      } catch (error) {
        if (error instanceof StopTaskError) {
          return {
            data: {
              action: 'stop',
              ok: false,
              message: error.message,
              taskId: input.task_id,
            },
          }
        }
        throw error
      }
    }

    const { command, label } = resolveWorkflowCommand(input)
    const bashTool = findToolByName(context.options.tools, BASH_TOOL_NAME)
    if (!bashTool) {
      return {
        data: {
          action: 'run',
          ok: false,
          message: 'Bash tool is unavailable, cannot execute workflow command',
        },
      }
    }

    const bashResult = await bashTool.call(
      {
        command,
        description: input.description?.trim() || `workflow: ${label}`,
        timeout: input.timeout,
        run_in_background: true,
      },
      context,
      canUseTool,
      assistantMessage,
    )

    const backgroundTaskId = (bashResult as any)?.data?.backgroundTaskId as
      | string
      | undefined

    return {
      data: {
        action: 'run',
        ok: true,
        message: backgroundTaskId
          ? `workflow started in background: ${backgroundTaskId}`
          : 'workflow command executed',
        taskId: backgroundTaskId,
        delegatedTool: BASH_TOOL_NAME,
        raw: (bashResult as any)?.data,
      },
    }
  },
} satisfies ToolDef<typeof inputSchema, Output>)
