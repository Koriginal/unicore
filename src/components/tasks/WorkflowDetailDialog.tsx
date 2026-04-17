import React from 'react'
import type { DeepImmutable } from 'src/types/utils.js'
import { Box, Text } from '../../ink.js'
import { Dialog } from '../design-system/Dialog.js'
import { Byline } from '../design-system/Byline.js'
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js'
import type { LocalWorkflowTaskState } from '../../tasks/LocalWorkflowTask/LocalWorkflowTask.js'

type Props = {
  workflow: DeepImmutable<LocalWorkflowTaskState>
  onDone: () => void
  onKill?: () => void
  onSkipAgent?: (agentId: string) => void
  onRetryAgent?: (agentId: string) => void
  onBack?: () => void
}

export function WorkflowDetailDialog({
  workflow,
  onDone,
  onKill,
  onBack,
}: Props): React.ReactNode {
  return (
    <Dialog
      title={`Workflow: ${workflow.workflowName ?? workflow.description}`}
      subtitle={`Status: ${workflow.status}`}
      onCancel={onDone}
      inputGuide={
        <Byline>
          {onBack && <KeyboardShortcutHint shortcut="←" action="go back" />}
          <KeyboardShortcutHint shortcut="Esc/Enter/Space" action="close" />
          {workflow.status === 'running' && onKill && (
            <KeyboardShortcutHint shortcut="x" action="stop" />
          )}
        </Byline>
      }
    >
      <Box flexDirection="column">
        <Text dimColor={true}>Task ID: {workflow.id}</Text>
        <Text dimColor={true}>Agents: {workflow.agentCount ?? 0}</Text>
        {workflow.summary && <Text wrap="wrap">{workflow.summary}</Text>}
        {workflow.error && <Text color="error">{workflow.error}</Text>}
      </Box>
    </Dialog>
  )
}

export default WorkflowDetailDialog
