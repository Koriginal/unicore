const summary = {
  type: 'local',
  name: 'summary',
  description: 'Show a concise local summary helper',
  supportsNonInteractive: true,
  load: async () => ({
    call: async (_args, context) => {
      const msgCount = context.messages ? context.messages.length : 0
      return {
        type: 'text',
        value: `Current session has ${msgCount} messages. Use /cost for token/cost stats, /status for runtime diagnostics, and ask me “总结一下当前变更” for code-focused summary.`,
      }
    },
  }),
}

export default summary
