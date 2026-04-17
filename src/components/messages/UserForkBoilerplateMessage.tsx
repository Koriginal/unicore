import type { TextBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import * as React from 'react'
import figures from 'figures'
import { FORK_BOILERPLATE_TAG, FORK_DIRECTIVE_PREFIX } from '../../constants/xml.js'
import { Box, Text } from '../../ink.js'

type Props = {
  addMargin: boolean
  param: TextBlockParam
}

function parseDirective(text: string): string {
  const pattern = new RegExp(
    `<${FORK_BOILERPLATE_TAG}>([\\s\\S]*?)<\\/${FORK_BOILERPLATE_TAG}>`,
    'i',
  )
  const match = text.match(pattern)
  const raw = (match?.[1] || text).trim()
  return raw.startsWith(FORK_DIRECTIVE_PREFIX)
    ? raw.slice(FORK_DIRECTIVE_PREFIX.length).trim()
    : raw
}

export function UserForkBoilerplateMessage({
  addMargin,
  param,
}: Props): React.ReactElement {
  const directive = parseDirective(param.text)
  return (
    <Box flexDirection="column" marginTop={addMargin ? 1 : 0}>
      <Text color="magenta">
        {figures.pointer} Fork directive
      </Text>
      <Box paddingLeft={2}>
        <Text>{directive || 'No directive text provided.'}</Text>
      </Box>
    </Box>
  )
}

export default UserForkBoilerplateMessage
