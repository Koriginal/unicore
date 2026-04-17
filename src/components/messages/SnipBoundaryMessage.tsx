import * as React from 'react'
import figures from 'figures'
import { Box, Text } from '../../ink.js'

type Props = {
  message: {
    content?: unknown
  }
}

function normalizeText(content: unknown): string {
  if (typeof content === 'string') return content
  if (content && typeof content === 'object') {
    const maybeText = (content as { text?: unknown }).text
    if (typeof maybeText === 'string') return maybeText
  }
  return 'Earlier history was snipped to keep context focused.'
}

export function SnipBoundaryMessage({ message }: Props): React.ReactElement {
  return (
    <Box marginTop={1}>
      <Text dimColor>
        {figures.ellipsis} {normalizeText(message.content)}
      </Text>
    </Box>
  )
}

export default SnipBoundaryMessage
