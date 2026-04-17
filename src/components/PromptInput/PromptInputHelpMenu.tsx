import { feature } from '@/utils/feature.js'
import * as React from 'react'
import { Box, Text } from 'src/ink.js'
import { getPlatform } from 'src/utils/platform.js'
import { isKeybindingCustomizationEnabled } from '../../keybindings/loadUserBindings.js'
import { useShortcutDisplay } from '../../keybindings/useShortcutDisplay.js'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../../services/analytics/growthbook.js'
import { isFastModeAvailable, isFastModeEnabled } from '../../utils/fastMode.js'
import { getNewlineInstructions } from './utils.js'

type Props = {
  dimColor?: boolean
  fixedWidth?: boolean
  gap?: number
  paddingX?: number
}

function normalizeShortcutForDisplay(shortcut: string): string {
  return shortcut.replace(/\+/g, ' + ')
}

function HelpLine({
  text,
  dimColor,
}: {
  text: string
  dimColor?: boolean
}): React.ReactElement {
  return (
    <Box>
      <Text dimColor={dimColor}>{text}</Text>
    </Box>
  )
}

export function PromptInputHelpMenu({
  dimColor,
  fixedWidth,
  gap,
  paddingX,
}: Props): React.ReactElement {
  const transcriptShortcut = normalizeShortcutForDisplay(
    useShortcutDisplay('app:toggleTranscript', 'Global', 'ctrl+o'),
  )
  const todosShortcut = normalizeShortcutForDisplay(
    useShortcutDisplay('app:toggleTodos', 'Global', 'ctrl+t'),
  )
  const undoShortcut = normalizeShortcutForDisplay(
    useShortcutDisplay('chat:undo', 'Chat', 'ctrl+_'),
  )
  const stashShortcut = normalizeShortcutForDisplay(
    useShortcutDisplay('chat:stash', 'Chat', 'ctrl+s'),
  )
  const cycleModeShortcut = normalizeShortcutForDisplay(
    useShortcutDisplay('chat:cycleMode', 'Chat', 'shift+tab'),
  )
  const modelPickerShortcut = normalizeShortcutForDisplay(
    useShortcutDisplay('chat:modelPicker', 'Chat', 'alt+p'),
  )
  const fastModeShortcut = normalizeShortcutForDisplay(
    useShortcutDisplay('chat:fastMode', 'Chat', 'alt+o'),
  )
  const externalEditorShortcut = normalizeShortcutForDisplay(
    useShortcutDisplay('chat:externalEditor', 'Chat', 'ctrl+g'),
  )
  const terminalShortcut = normalizeShortcutForDisplay(
    useShortcutDisplay('app:toggleTerminal', 'Global', 'meta+j'),
  )
  const imagePasteShortcut = normalizeShortcutForDisplay(
    useShortcutDisplay('chat:imagePaste', 'Chat', 'ctrl+v'),
  )

  const terminalShortcutElement =
    feature('TERMINAL_PANEL') &&
    getFeatureValue_CACHED_MAY_BE_STALE('tengu_terminal_panel', false) ? (
      <HelpLine
        dimColor={dimColor}
        text={`${terminalShortcut} 打开终端 (terminal)`}
      />
    ) : null

  return (
    <Box paddingX={paddingX} flexDirection="row" gap={gap}>
      <Box flexDirection="column" width={fixedWidth ? 24 : undefined}>
        <HelpLine dimColor={dimColor} text="! 进入 Bash 模式 (bash mode)" />
        <HelpLine dimColor={dimColor} text="/ 执行命令 (commands)" />
        <HelpLine dimColor={dimColor} text="@ 引用文件 (file paths)" />
        <HelpLine dimColor={dimColor} text="& 后台运行 (background)" />
        <HelpLine dimColor={dimColor} text="/project 切换项目目录" />
        <HelpLine dimColor={dimColor} text="/setup 模型配置向导" />
      </Box>

      <Box flexDirection="column" width={fixedWidth ? 35 : undefined}>
        <HelpLine dimColor={dimColor} text="双击 Esc 清空输入 (clear input)" />
        <HelpLine
          dimColor={dimColor}
          text={`${cycleModeShortcut} 自动接受编辑 (auto-accept edits)`}
        />
        <HelpLine
          dimColor={dimColor}
          text={`${transcriptShortcut} 查看详细消息流 (verbose output)`}
        />
        <HelpLine
          dimColor={dimColor}
          text={`${todosShortcut} 切换任务清单 (toggle tasks)`}
        />
        {terminalShortcutElement}
        <HelpLine dimColor={dimColor} text={getNewlineInstructions()} />
      </Box>

      <Box flexDirection="column">
        <HelpLine dimColor={dimColor} text={`${undoShortcut} 撤销 (undo)`} />
        {getPlatform() !== 'windows' ? (
          <HelpLine dimColor={dimColor} text="ctrl + z 挂起 (suspend)" />
        ) : null}
        <HelpLine
          dimColor={dimColor}
          text={`${imagePasteShortcut} 粘贴图片 (paste images)`}
        />
        <HelpLine
          dimColor={dimColor}
          text={`${modelPickerShortcut} 切换模型 (switch model)`}
        />
        {isFastModeEnabled() && isFastModeAvailable() ? (
          <HelpLine
            dimColor={dimColor}
            text={`${fastModeShortcut} 切换急速模式 (toggle fast mode)`}
          />
        ) : null}
        <HelpLine
          dimColor={dimColor}
          text={`${stashShortcut} 暂存提示词 (stash prompt)`}
        />
        <HelpLine
          dimColor={dimColor}
          text={`${externalEditorShortcut} 在编辑器中编辑 (edit in $EDITOR)`}
        />
        {isKeybindingCustomizationEnabled() ? (
          <HelpLine
            dimColor={dimColor}
            text="/keybindings 自定义键位 (customize)"
          />
        ) : null}
      </Box>
    </Box>
  )
}
