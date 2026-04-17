import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import type { Command } from '../../types/command.js'
import type { ToolUseContext } from '../../Tool.js'
import {
  type BundledWorkflow,
  listBundledWorkflows,
} from './bundled/index.js'

export function createWorkflowCommand(workflow: BundledWorkflow): Command {
  return {
    type: 'prompt',
    name: `workflow:${workflow.id}`,
    description: workflow.description,
    progressMessage: `Preparing workflow ${workflow.id}`,
    contentLength: workflow.command.length,
    source: 'builtin',
    async getPromptForCommand(
      args: string,
      _context: ToolUseContext,
    ): Promise<ContentBlockParam[]> {
      const extra = args.trim()
      const suffix = extra ? `\nAdditional args from user: ${extra}` : ''
      return [
        {
          type: 'text',
          text: `Run the Workflow tool with:
- action: run
- workflow: ${workflow.id}${suffix}

If Workflow tool is unavailable, run this command using Bash with run_in_background=true:
${workflow.command}`,
        },
      ]
    },
  }
}

export async function getWorkflowCommands(_cwd: string): Promise<Command[]> {
  return listBundledWorkflows().map(createWorkflowCommand)
}

export default createWorkflowCommand
