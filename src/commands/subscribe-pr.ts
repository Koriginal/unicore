import type { ToolUseContext } from '../Tool.js'
import type {
  Command,
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../types/command.js'

const subscribePr: Command = {
  type: 'local-jsx',
  name: 'subscribe-pr',
  description: '配置 PR 订阅/通知工作流 (Configure PR subscription flow)',
  immediate: true,
  load: () =>
    Promise.resolve({
      async call(
        onDone: LocalJSXCommandOnDone,
        _context: ToolUseContext & LocalJSXCommandContext,
      ): Promise<React.ReactNode> {
        onDone(
          '当前离线构建未内置 Subscribe PR 云服务。可用替代方案：1) /install-github-app 绑定仓库；2) 用 /workflows 创建本地 PR 轮询与通知流程；3) 结合 /peers 与 SendMessage 推送团队提醒。',
          { display: 'system' },
        )
        return null
      },
    }),
}

export default subscribePr
