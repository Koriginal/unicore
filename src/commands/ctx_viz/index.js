const ctxViz = {
  type: 'local',
  name: 'ctx-viz',
  description: 'Context visualization hint command',
  isHidden: true,
  supportsNonInteractive: true,
  load: async () => ({
    call: async (_args, context) => {
      const messages = Array.isArray(context?.messages) ? context.messages.length : 0
      return {
        type: 'text',
        value:
          `Context snapshot: ${messages} messages in current session.\n` +
          'Use /context to inspect attached files and ask for "上下文压缩建议" to optimize token usage.',
      }
    },
  }),
}

export default ctxViz
