const autofixPr = {
  type: 'local',
  name: 'autofix-pr',
  description: 'PR auto-fix assistant guidance',
  isHidden: true,
  supportsNonInteractive: true,
  load: async () => ({
    call: async (args) => ({
      type: 'text',
      value: `Autofix PR helper${args?.trim() ? ` for: ${args.trim()}` : ''}.

Suggested offline flow:
1) Run tests/lint locally and capture failures.
2) Ask UniCore to patch only failing files.
3) Re-run checks.
4) Use /commit-push-pr (or git) after green checks.`,
    }),
  }),
}

export default autofixPr
