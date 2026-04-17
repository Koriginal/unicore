import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import type { Command } from '../../types/command.js'
import {
  getBundledWorkflow,
  listBundledWorkflows,
} from '../../tools/WorkflowTool/bundled/index.js'

function renderWorkflowList(): string {
  const workflows = listBundledWorkflows()
  return workflows
    .map(
      workflow =>
        `- ${workflow.id}: ${workflow.description}\n  command: ${workflow.command}`,
    )
    .join('\n')
}

function listPrompt(): ContentBlockParam[] {
  return [
    {
      type: 'text',
      text: `Available workflows:
${renderWorkflowList()}

How to run:
1. Preferred: call Workflow tool with { action: "run", workflow: "<id>" }.
2. Shortcut: use /workflow:<id> (e.g. /workflow:build).
3. This command also accepts arguments: /workflows <id> [extra args].`,
    },
  ]
}

const workflowsCommand: Command = {
  type: 'prompt',
  name: 'workflows',
  description: 'List and run bundled workflow scripts',
  progressMessage: 'Preparing workflows',
  contentLength: 0,
  source: 'builtin',
  async getPromptForCommand(args: string): Promise<ContentBlockParam[]> {
    const trimmed = args.trim()
    if (!trimmed) {
      return listPrompt()
    }

    const [workflowId, ...extraArgs] = trimmed.split(/\s+/)
    if (!workflowId) {
      return listPrompt()
    }

    const workflow = getBundledWorkflow(workflowId)
    if (!workflow) {
      return [
        {
          type: 'text',
          text: `Unknown workflow "${workflowId}".

Available workflows:
${renderWorkflowList()}

Use /workflows to view usage.`,
        },
      ]
    }

    const joinedArgs = extraArgs.join(' ').trim()
    return [
      {
        type: 'text',
        text: `Run the Workflow tool with:
- action: run
- workflow: ${workflow.id}${joinedArgs ? `\n- args: [${extraArgs.map(a => JSON.stringify(a)).join(', ')}]` : ''}

If Workflow tool is unavailable, run this command in Bash with run_in_background=true:
${workflow.command}${joinedArgs ? ` ${joinedArgs}` : ''}`,
      },
    ]
  },
}

export default workflowsCommand
