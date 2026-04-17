const breakCache = {
  type: 'local',
  name: 'break-cache',
  description: 'Cache invalidation helper',
  isHidden: true,
  supportsNonInteractive: true,
  load: async () => ({
    call: async () => ({
      type: 'text',
      value:
        'Cache reset guidance:\n' +
        '1) /reload-plugins\n' +
        '2) /doctor\n' +
        '3) If needed: remove .unicore-runtime and restart\n' +
        'This command is kept as an internal helper alias.',
    }),
  }),
}

export default breakCache
