export type WorkflowScriptRunId = string

export type WorkflowToolInvocation = {
  runId: WorkflowScriptRunId
  stepIndex: number
}

export type WorkflowAction = 'list' | 'run' | 'status' | 'stop'
