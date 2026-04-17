import { isBridgeEnabled } from '../../bridge/bridgeEnabled.js'
import type { ToolUseContext } from '../../Tool.js'
import type {
  Command,
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../../types/command.js'

const remoteControlServer: Command = {
  type: 'local-jsx',
  name: 'remoteControlServer',
  description: 'Enable remote-control server mode for this session',
  immediate: true,
  isHidden: true,
  load: () =>
    Promise.resolve({
      async call(
        onDone: LocalJSXCommandOnDone,
        context: ToolUseContext & LocalJSXCommandContext,
      ): Promise<React.ReactNode> {
        if (!isBridgeEnabled()) {
          onDone('Remote Control is not available in current environment.', {
            display: 'system',
          })
          return null
        }

        context.setAppState(prev => ({
          ...prev,
          replBridgeEnabled: true,
          replBridgeExplicit: true,
          replBridgeOutboundOnly: false,
        }))
        onDone('Remote Control connecting...', { display: 'system' })
        return null
      },
    }),
}

export default remoteControlServer
