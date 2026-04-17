import type { ToolUseContext } from '../Tool.js'
import type {
  Command,
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../types/command.js'

const torch: Command = {
  type: 'local-jsx',
  name: 'torch',
  description: '打开模型与推理设置入口 (Open model/inference controls)',
  immediate: true,
  load: () =>
    Promise.resolve({
      async call(
        onDone: LocalJSXCommandOnDone,
        _context: ToolUseContext & LocalJSXCommandContext,
      ): Promise<React.ReactNode> {
        onDone('Torch 入口已映射到 /model。', {
          display: 'system',
          nextInput: '/model',
          submitNextInput: true,
        })
        return null
      },
    }),
}

export default torch
