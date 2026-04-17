import React from 'react'
import type { DeepImmutable } from 'src/types/utils.js'
import { Box, Text } from '../../ink.js'
import { Dialog } from '../design-system/Dialog.js'
import { Byline } from '../design-system/Byline.js'
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js'
import type { MonitorMcpTaskState } from '../../tasks/MonitorMcpTask/MonitorMcpTask.js'

type Props = {
  task: DeepImmutable<MonitorMcpTaskState>
  onKill?: () => void
  onBack?: () => void
}

export function MonitorMcpDetailDialog({
  task,
  onKill,
  onBack,
}: Props): React.ReactNode {
  return (
    <Dialog
      title="Monitor MCP"
      subtitle={`Status: ${task.status}`}
      onCancel={onBack ?? (() => {})}
      inputGuide={
        <Byline>
          {onBack && <KeyboardShortcutHint shortcut="←" action="go back" />}
          <KeyboardShortcutHint shortcut="Esc/Enter/Space" action="close" />
          {task.status === 'running' && onKill && (
            <KeyboardShortcutHint shortcut="x" action="stop" />
          )}
        </Byline>
      }
    >
      <Box flexDirection="column">
        <Text dimColor={true}>Task ID: {task.id}</Text>
        <Text wrap="wrap">{task.description}</Text>
        {task.lastMessage && <Text dimColor={true}>{task.lastMessage}</Text>}
        {task.error && <Text color="error">{task.error}</Text>}
      </Box>
    </Dialog>
  )
}

export default MonitorMcpDetailDialog
