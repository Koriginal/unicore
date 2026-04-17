const teleport = {
  type: 'local',
  name: 'teleport',
  description: 'Session handoff guidance',
  isHidden: true,
  supportsNonInteractive: true,
  load: async () => ({
    call: async (args) => ({
      type: 'text',
      value:
        `Teleport helper${args?.trim() ? ` target=${args.trim()}` : ''}.\n` +
        'Use /export to snapshot context, then /resume in target workspace/session and paste task handoff summary.',
    }),
  }),
}

export default teleport
