const perfIssue = {
  type: 'local',
  name: 'perf-issue',
  description: 'Performance issue report template',
  isHidden: true,
  supportsNonInteractive: true,
  load: async () => ({
    call: async (args) => ({
      type: 'text',
      value: `Perf issue template${args?.trim() ? `: ${args.trim()}` : ''}\n\n` +
        '- Scenario:\n' +
        '- Repro steps:\n' +
        '- Observed latency (ms/s):\n' +
        '- Expected latency:\n' +
        '- Model + provider profile:\n' +
        '- Context size estimate:\n' +
        '- Mitigation tried (/fast, router profile, smaller context):',
    }),
  }),
}

export default perfIssue
