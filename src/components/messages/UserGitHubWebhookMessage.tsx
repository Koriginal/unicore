import type { TextBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import * as React from 'react'
import figures from 'figures'
import { Box, Text } from '../../ink.js'

type Props = {
  addMargin: boolean
  param: TextBlockParam
}

function parseWebhook(text: string): string {
  const match = text.match(
    /<github-webhook-activity>([\s\S]*?)<\/github-webhook-activity>/i,
  )
  if (!match) return text.trim()
  return (match[1] || '').trim()
}

export function UserGitHubWebhookMessage({
  addMargin,
  param,
}: Props): React.ReactElement {
  const body = parseWebhook(param.text)
  return (
    <Box flexDirection="column" marginTop={addMargin ? 1 : 0}>
      <Text color="yellow">
        {figures.bullet} GitHub webhook activity
      </Text>
      <Box paddingLeft={2}>
        <Text>{body || 'Webhook event received.'}</Text>
      </Box>
    </Box>
  )
}

export default UserGitHubWebhookMessage
