const antTrace = {
  type: 'local',
  name: 'ant-trace',
  description: 'Internal trace status helper',
  isHidden: true,
  supportsNonInteractive: true,
  load: async () => ({
    call: async () => ({
      type: 'text',
      value:
        'Trace helper (offline mode):\n' +
        '- Enable stderr debug: /status then start with --debug-to-stderr\n' +
        '- Inspect runtime state: /status, /doctor\n' +
        '- For reproducible reports, include command + model route + gateway profile.',
    }),
  }),
}

export default antTrace
