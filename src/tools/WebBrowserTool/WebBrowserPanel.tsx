import React from 'react'
import { Box, Text } from '../../ink.js'
import { useAppState } from '../../state/AppState.js'

export function WebBrowserPanel(): React.ReactNode {
  const active = useAppState(s => s.bagelActive ?? false)
  const visible = useAppState(s => s.bagelPanelVisible ?? false)
  const url = useAppState(s => s.bagelUrl)

  if (!active || !visible) {
    return null
  }

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1} marginTop={1}>
      <Text bold={true}>Web Browser</Text>
      <Text dimColor={true}>URL: {url ?? '(none)'}</Text>
      <Text dimColor={true}>Use WebBrowser tool again to navigate to another URL.</Text>
    </Box>
  )
}

export default WebBrowserPanel
