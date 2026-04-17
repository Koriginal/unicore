import type { TextBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import * as React from 'react'
import figures from 'figures'
import { CROSS_SESSION_MESSAGE_TAG } from '../../constants/xml.js'
import { Ansi, Box, Text } from '../../ink.js'

type Props = {
  addMargin: boolean
  param: TextBlockParam
}

function parseCrossSession(
  text: string,
): { from?: string; content: string } | null {
  const pattern = new RegExp(
    `<${CROSS_SESSION_MESSAGE_TAG}(?:\\s+from="([^"]*)")?[^>]*>([\\s\\S]*?)<\\/${CROSS_SESSION_MESSAGE_TAG}>`,
    'i',
  )
  const match = text.match(pattern)
  if (!match) return null
  return {
    from: match[1]?.trim() || undefined,
    content: (match[2] || '').trim(),
  }
}

export function UserCrossSessionMessage({
  addMargin,
  param,
}: Props): React.ReactElement | null {
  const parsed = parseCrossSession(param.text)
  if (!parsed) return null

  return (
    <Box flexDirection="column" marginTop={addMargin ? 1 : 0}>
      <Text color="cyan">
        {figures.arrowRight} Cross-session message
        {parsed.from ? ` from ${parsed.from}` : ''}
      </Text>
      {parsed.content ? (
        <Box paddingLeft={2}>
          <Text>
            <Ansi>{parsed.content}</Ansi>
          </Text>
        </Box>
      ) : null}
    </Box>
  )
}

export default UserCrossSessionMessage
