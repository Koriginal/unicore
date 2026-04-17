import { feature } from '@/utils/feature.js'
import { getKairosActive, setUserMsgOptIn } from '../bootstrap/state.js'
import {
  logEvent,
} from '../services/analytics/index.js'
import type { ToolUseContext } from '../Tool.js'
import { BRIEF_TOOL_NAME } from '../tools/BriefTool/prompt.js'
import type {
  Command,
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../types/command.js'

const brief: Command = {
  type: 'local-jsx',
  name: 'brief',
  description: '切换精简模式 (Toggle brief-only mode)',
  isEnabled: () => {
    return feature('KAIROS') || feature('KAIROS_BRIEF')
  },
  immediate: true,
  load: () =>
    Promise.resolve({
      async call(
        onDone: LocalJSXCommandOnDone,
        context: ToolUseContext & LocalJSXCommandContext,
      ): Promise<React.ReactNode> {
        const current = context.getAppState().isBriefOnly
        const newState = !current

        // In UniCore, we enable brief mode by default without extra entitlement checks
        setUserMsgOptIn(newState)

        context.setAppState(prev => {
          if (prev.isBriefOnly === newState) return prev
          return { ...prev, isBriefOnly: newState }
        })

        logEvent('tengu_brief_mode_toggled', {
          enabled: newState,
          gated: false,
        })

        const metaMessages = getKairosActive()
          ? undefined
          : [
              `<system-reminder>\n${
                newState
                  ? `精简模式已启用。请使用 ${BRIEF_TOOL_NAME} 工具发送所有面向用户的输出 —— 之外的内容对用户不可见。\nBrief mode enabled. Use ${BRIEF_TOOL_NAME} for all user output.`
                  : `精简模式已禁用。不再可用 ${BRIEF_TOOL_NAME} 工具 —— 请直接回复纯文本。\nBrief mode disabled. Do not use ${BRIEF_TOOL_NAME}, reply with plain text.`
              }\n</system-reminder>`,
            ]

        onDone(
          newState ? '精简模式已启用 (Brief-only mode enabled)' : '精简模式已禁用 (Brief-only mode disabled)',
          { display: 'system', metaMessages },
        )
        return null
      },
    }),
}

export default brief
