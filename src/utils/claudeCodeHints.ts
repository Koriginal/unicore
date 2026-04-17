import {
  extractUniCoreCodeHints,
  type UniCoreCodeHint,
  type UniCoreCodeHintType,
  setPendingHint,
  clearPendingHint,
  markShownThisSession,
  subscribeToPendingHint,
  getPendingHintSnapshot,
  hasShownHintThisSession,
  _resetUniCoreCodeHintStore,
  _test,
} from './uniCoreHints.js'

export type ClaudeCodeHint = UniCoreCodeHint
export type ClaudeCodeHintType = UniCoreCodeHintType

export function extractClaudeCodeHints(
  output: string,
  command: string,
): { hints: ClaudeCodeHint[]; stripped: string } {
  return extractUniCoreCodeHints(
    output.replaceAll('<claude-code-hint', '<claude-code-hint'),
    command,
  )
}

export {
  setPendingHint,
  clearPendingHint,
  markShownThisSession,
  subscribeToPendingHint,
  getPendingHintSnapshot,
  hasShownHintThisSession,
  _test,
}

export function _resetClaudeCodeHintStore(): void {
  _resetUniCoreCodeHintStore()
}
