import { feature } from '@/utils/feature.js'
import type { ToolUseContext } from '../Tool.js'
import {
  activateProactive,
  deactivateProactive,
  isProactiveActive,
} from '../proactive/index.js'
import type {
  Command,
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../types/command.js'

const proactive: Command = {
  type: 'local-jsx',
  name: 'proactive',
  description: '切换主动模式 (Toggle proactive mode)',
  immediate: true,
  isEnabled: () => feature('PROACTIVE') || feature('KAIROS'),
  load: () =>
    Promise.resolve({
      async call(
        onDone: LocalJSXCommandOnDone,
        _context: ToolUseContext & LocalJSXCommandContext,
      ): Promise<React.ReactNode> {
        if (isProactiveActive()) {
          deactivateProactive()
          onDone('主动模式已关闭 (Proactive mode disabled)', {
            display: 'system',
          })
          return null
        }

        activateProactive('command')
        onDone('主动模式已开启 (Proactive mode enabled)', {
          display: 'system',
        })
        return null
      },
    }),
}

export default proactive
