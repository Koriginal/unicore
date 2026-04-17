const buildResetMessage = mode =>
  `Rate-limit state reset helper (${mode}).\n` +
  'Offline rebuild does not persist cloud limit counters; this command acknowledges reset intent for local troubleshooting.'

const resetLimits = {
  type: 'local',
  name: 'reset-limits',
  description: 'Reset local rate-limit diagnostics state',
  isHidden: true,
  supportsNonInteractive: true,
  load: async () => ({
    call: async () => ({
      type: 'text',
      value: buildResetMessage('interactive'),
    }),
  }),
}

const resetLimitsNonInteractive = {
  type: 'local',
  name: 'reset-limits-noninteractive',
  description: 'Reset local rate-limit diagnostics state (non-interactive)',
  isHidden: true,
  supportsNonInteractive: true,
  load: async () => ({
    call: async () => ({
      type: 'text',
      value: buildResetMessage('non-interactive'),
    }),
  }),
}

export default resetLimits
export { resetLimits, resetLimitsNonInteractive }
