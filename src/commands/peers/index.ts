import type { ToolUseContext } from '../../Tool.js'
import {
  formatPeersForDisplay,
  listReachablePeers,
} from '../../utils/peers.js'
import type {
  Command,
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../../types/command.js'

const peersCommand: Command = {
  type: 'local-jsx',
  name: 'peers',
  description: '列出可用 peer 会话地址 (List reachable peer sessions)',
  immediate: true,
  load: () =>
    Promise.resolve({
      async call(
        onDone: LocalJSXCommandOnDone,
        _context: ToolUseContext & LocalJSXCommandContext,
      ): Promise<React.ReactNode> {
        const peers = await listReachablePeers()
        const body = formatPeersForDisplay(peers)
        const suffix =
          peers.length > 0
            ? '\nUse these addresses with SendMessage tool (to="uds:..." or to="bridge:...").'
            : '\nStart another UniCore session (or /remote-control) to make peers discoverable.'
        onDone(`${body}${suffix}`, { display: 'system' })
        return null
      },
    }),
}

export default peersCommand
