import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { formatPeersForDisplay, listReachablePeers } from '../../utils/peers.js'

const inputSchema = lazySchema(() => z.strictObject({}))
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    peers: z.array(
      z.object({
        id: z.string(),
        address: z.string(),
        kind: z.enum(['uds', 'bridge']),
        pid: z.number().optional(),
        name: z.string().optional(),
        cwd: z.string().optional(),
        sessionId: z.string().optional(),
      }),
    ),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

export const ListPeersTool = buildTool({
  name: 'ListPeers',
  maxResultSizeChars: 64_000,
  shouldDefer: true,
  isConcurrencySafe: () => true,
  isReadOnly: () => true,
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  async description() {
    return 'List reachable local/remote peers for cross-session messaging'
  },
  async prompt() {
    return 'Use this to discover peer addresses before SendMessage calls.'
  },
  renderToolUseMessage() {
    return null
  },
  async call(): Promise<{ data: Output }> {
    const peers = await listReachablePeers()
    return { data: { peers } }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    const peers = (output as Output).peers
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: formatPeersForDisplay(peers),
    }
  },
} satisfies ToolDef<InputSchema, Output>)

export default ListPeersTool
