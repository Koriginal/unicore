import {
  OUTPUT_FILE_TAG,
  STATUS_TAG,
  SUMMARY_TAG,
  TASK_ID_TAG,
  TASK_NOTIFICATION_TAG,
} from '../../constants/xml.js'
import type { SetAppState, Task, TaskStateBase } from '../../Task.js'
import { enqueuePendingNotification } from '../../utils/messageQueueManager.js'
import { getTaskOutputPath } from '../../utils/task/diskOutput.js'
import { updateTaskState } from '../../utils/task/framework.js'

export type LocalWorkflowTaskState = TaskStateBase & {
  type: 'local_workflow'
  isBackgrounded?: boolean
  workflowName?: string
  summary?: string
  agentCount?: number
  error?: string
}

export const LocalWorkflowTask: Task = {
  name: 'LocalWorkflow',
  type: 'local_workflow',
  async kill(taskId: string, setAppState: SetAppState): Promise<void> {
    killWorkflowTask(taskId, setAppState)
  },
}

export function killWorkflowTask(taskId: string, setAppState: SetAppState): void {
  updateTaskState<LocalWorkflowTaskState>(taskId, setAppState, task => {
    if (task.status !== 'running' && task.status !== 'pending') return task
    return {
      ...task,
      status: 'killed',
      endTime: Date.now(),
      notified: true,
    }
  })

  enqueuePendingNotification({
    value: `<${TASK_NOTIFICATION_TAG}>
<${TASK_ID_TAG}>${taskId}</${TASK_ID_TAG}>
<${OUTPUT_FILE_TAG}>${getTaskOutputPath(taskId)}</${OUTPUT_FILE_TAG}>
<${STATUS_TAG}>killed</${STATUS_TAG}>
<${SUMMARY_TAG}>Workflow task was stopped</${SUMMARY_TAG}>
</${TASK_NOTIFICATION_TAG}>`,
    mode: 'task-notification',
  })
}

export function skipWorkflowAgent(
  workflowId: string,
  agentId: string,
  setAppState: SetAppState,
): void {
  updateTaskState<LocalWorkflowTaskState>(workflowId, setAppState, task => ({
    ...task,
    summary: `Agent ${agentId} skipped by user`,
  }))
}

export function retryWorkflowAgent(
  workflowId: string,
  agentId: string,
  setAppState: SetAppState,
): void {
  updateTaskState<LocalWorkflowTaskState>(workflowId, setAppState, task => ({
    ...task,
    summary: `Agent ${agentId} retry requested by user`,
  }))
}
