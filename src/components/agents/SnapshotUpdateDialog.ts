import * as React from 'react'
import { Box, Text } from '../../ink.js'
import type { AgentMemoryScope } from '../../tools/AgentTool/agentMemory.js'
import { Select } from '../CustomSelect/index.js'
import { Dialog } from '../design-system/Dialog.js'

export function buildMergePrompt(
  agentType: string,
  scope: AgentMemoryScope,
): string {
  const scopeText =
    scope === 'user'
      ? 'user memory'
      : scope === 'project'
        ? 'project memory'
        : 'local memory'
  return `Agent "${agentType}" has a newer snapshot in ${scopeText}. Choose how to apply it.`
}

export type SnapshotUpdateDialogProps = {
  agentType: string
  scope: AgentMemoryScope
  snapshotTimestamp: string
  onComplete: (choice: 'merge' | 'keep' | 'replace') => void
  onCancel: () => void
}

export function SnapshotUpdateDialog(props: SnapshotUpdateDialogProps): React.ReactElement {
  const subtitle = `Scope: ${props.scope} · Snapshot: ${props.snapshotTimestamp}`
  const hint = buildMergePrompt(props.agentType, props.scope)

  return React.createElement(
    Dialog,
    {
      title: 'Agent Memory Snapshot Update',
      subtitle,
      color: 'warning',
      onCancel: props.onCancel,
    },
    React.createElement(
      Box,
      { flexDirection: 'column', gap: 1 },
      React.createElement(Text, { dimColor: true }, hint),
      React.createElement(Select, {
        defaultValue: 'merge',
        options: [
          {
            label: 'Merge (recommended)',
            value: 'merge',
            description:
              'Keep local memory and merge in new snapshot entries.',
          },
          {
            label: 'Keep local',
            value: 'keep',
            description: 'Ignore snapshot and keep current local memory.',
          },
          {
            label: 'Replace with snapshot',
            value: 'replace',
            description:
              'Discard current local memory and replace with the snapshot.',
          },
        ],
        onChange: value =>
          props.onComplete(value as 'merge' | 'keep' | 'replace'),
      }),
    ),
  )
}
