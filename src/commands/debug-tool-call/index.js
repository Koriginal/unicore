const debugToolCall = {
  type: 'local',
  name: 'debug-tool-call',
  description: 'Inspect recent tool-call debugging hints',
  isHidden: true,
  supportsNonInteractive: true,
  load: async () => ({
    call: async (args) => {
      const target = args?.trim() || '<tool-name>'
      return {
        type: 'text',
        value: `Tool-call debug helper is enabled.

Use this checklist for ${target}:
1) Verify tool schema and argument names.
2) Confirm permission mode (sandbox/escalated) is correct.
3) Re-run with reduced argument set to isolate failing fields.
4) Check /status and doctor output for runtime capability flags.`,
      }
    },
  }),
}

export default debugToolCall
