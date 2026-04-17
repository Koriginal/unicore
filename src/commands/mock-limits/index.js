const mockLimits = {
  type: 'local',
  name: 'mock-limits',
  description: 'Simulate local rate-limit diagnostics',
  isHidden: true,
  supportsNonInteractive: true,
  load: async () => ({
    call: async (args) => {
      const mode = (args || '').trim().toLowerCase()
      const normalized =
        mode === 'on' || mode === 'enable'
          ? 'enabled'
          : mode === 'off' || mode === 'disable'
            ? 'disabled'
            : 'status-only'

      return {
        type: 'text',
        value:
          `Mock limits mode: ${normalized}.\n` +
          'Note: this offline rebuild currently reports diagnostic hints only and does not mutate global runtime limits.',
      }
    },
  }),
}

export default mockLimits
