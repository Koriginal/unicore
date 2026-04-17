export const SNIP_TOOL_NAME = 'Snip'

export const DESCRIPTION =
  'Attempt a lightweight context snip pass to reduce conversation pressure.'

export const SNIP_TOOL_PROMPT = `Use this when context is getting large and you want to opportunistically trim old, low-value history.

This tool is best-effort in offline rebuilds. If runtime snip is disabled, it will return diagnostics and suggest alternatives like /compact.`

export default SNIP_TOOL_NAME
