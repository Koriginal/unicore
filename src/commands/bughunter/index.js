const bughunter = {
  type: 'local',
  name: 'bughunter',
  description: 'Internal bug triage helper',
  isHidden: true,
  supportsNonInteractive: true,
  load: async () => ({
    call: async (args) => ({
      type: 'text',
      value: `Bughunter assistant ready${args?.trim() ? ` for: ${args.trim()}` : ''}.

Recommended triage flow:
1) Reproduce with ./scripts/bunw.sh run smoke:offline
2) Capture /status + doctor output
3) Record failing command, expected behavior, and actual behavior
4) Create report with /issue <title>`,
    }),
  }),
}

export default bughunter
