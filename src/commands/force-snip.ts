import type { ToolUseContext } from '../Tool.js'
import type {
  Command,
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../types/command.js'

const forceSnip: Command = {
  type: 'local-jsx',
  name: 'force-snip',
  description: '立即触发一次上下文压缩 (Force compact now)',
  immediate: true,
  load: () =>
    Promise.resolve({
      async call(
        onDone: LocalJSXCommandOnDone,
        _context: ToolUseContext & LocalJSXCommandContext,
      ): Promise<React.ReactNode> {
        onDone('正在触发 /compact (Running /compact now)', {
          display: 'system',
          nextInput: '/compact',
          submitNextInput: true,
        })
        return null
      },
    }),
}

export default forceSnip
