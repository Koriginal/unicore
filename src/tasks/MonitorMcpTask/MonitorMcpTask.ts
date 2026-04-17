import {
  OUTPUT_FILE_TAG,
  STATUS_TAG,
  SUMMARY_TAG,
  TASK_ID_TAG,
  TASK_NOTIFICATION_TAG,
} from '../../constants/xml.js'
import type { AgentId } from '../../types/ids.js'
import type { AppState } from '../../state/AppState.js'
import type { SetAppState, Task, TaskStateBase } from '../../Task.js'
import { enqueuePendingNotification } from '../../utils/messageQueueManager.js'
import { getTaskOutputPath } from '../../utils/task/diskOutput.js'
import { updateTaskState } from '../../utils/task/framework.js'

export type MonitorMcpTaskState = TaskStateBase & {
  type: 'monitor_mcp'
  isBackgrounded?: boolean
  agentId?: AgentId
  lastMessage?: string
  error?: string
}

export const MonitorMcpTask: Task = {
  name: 'MonitorMcp',
  type: 'monitor_mcp',
  async kill(taskId: string, setAppState: SetAppState): Promise<void> {
    killMonitorMcp(taskId, setAppState)
  },
}

export function killMonitorMcp(taskId: string, setAppState: SetAppState): void {
  updateTaskState<MonitorMcpTaskState>(taskId, setAppState, task => {
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
<${SUMMARY_TAG}>Monitor task was stopped</${SUMMARY_TAG}>
</${TASK_NOTIFICATION_TAG}>`,
    mode: 'task-notification',
  })
}

export function killMonitorMcpTasksForAgent(
  agentId: AgentId,
  getAppState: () => AppState,
  setAppState: SetAppState,
): void {
  const tasks = Object.values(getAppState().tasks)
  for (const task of tasks) {
    if (
      task.type === 'monitor_mcp' &&
      (task as MonitorMcpTaskState).agentId === agentId &&
      (task.status === 'running' || task.status === 'pending')
    ) {
      killMonitorMcp(task.id, setAppState)
    }
  }
}
