import * as React from 'react'
import { Box, Text } from '../../ink.js'

export type ClawdPose =
  | 'default'
  | 'arms-up'
  | 'look-left'
  | 'look-right'

type Props = {
  pose?: ClawdPose
}

function getFaceByPose(pose: ClawdPose): string {
  switch (pose) {
    case 'look-left':
      return '( O.o )'
    case 'look-right':
      return '( o.O )'
    default:
      return '( o.o )'
  }
}

function getBottomByPose(pose: ClawdPose): string {
  if (pose === 'arms-up') {
    return ' /|_|\\ '
  }
  return ' > ^ < '
}

export function Clawd({ pose = 'default' }: Props): React.ReactElement {
  const face = getFaceByPose(pose)
  const bottom = getBottomByPose(pose)

  return (
    <Box flexDirection="column">
      <Text color="clawd_body"> /\_/\ </Text>
      <Text color="clawd_body">{face}</Text>
      <Text color="clawd_body">{bottom}</Text>
    </Box>
  )
}

