export type BundledWorkflow = {
  id: string
  name: string
  description: string
  command: string
  whenToUse?: string
}

const BUNDLED_WORKFLOWS: BundledWorkflow[] = [
  {
    id: 'build',
    name: 'Build Project',
    description: 'Build the current project with Bun',
    command: './scripts/bunw.sh run build',
    whenToUse: 'Use after code changes to validate compile/build status.',
  },
  {
    id: 'typecheck',
    name: 'Type Check',
    description: 'Run TypeScript type checking',
    command: './scripts/bunw.sh run typecheck',
    whenToUse: 'Use before commit to catch TS-level issues.',
  },
  {
    id: 'smoke-offline',
    name: 'Offline Smoke Test',
    description: 'Run offline smoke checks for startup basics',
    command: './scripts/bunw.sh run smoke:offline',
    whenToUse: 'Use before sharing branch to ensure baseline runtime health.',
  },
]

export function initBundledWorkflows(): void {
  // No runtime side effects required for now.
}

export function listBundledWorkflows(): BundledWorkflow[] {
  return BUNDLED_WORKFLOWS
}

export function getBundledWorkflow(id: string): BundledWorkflow | undefined {
  return BUNDLED_WORKFLOWS.find(workflow => workflow.id === id)
}

export default {
  initBundledWorkflows,
  listBundledWorkflows,
  getBundledWorkflow,
}
