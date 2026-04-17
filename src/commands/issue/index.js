const issue = {
  type: 'local',
  name: 'issue',
  description: 'Create a local issue report template',
  isHidden: true,
  supportsNonInteractive: true,
  load: async () => ({
    call: async (args) => {
      const title = args?.trim() || 'Untitled issue'
      return {
        type: 'text',
        value: `Issue: ${title}

Template:
- Summary:
- Steps to reproduce:
- Expected:
- Actual:
- Environment:
  - OS:
  - Bun version:
  - UniCore commit:
- Logs:
- Suggested fix (optional):`,
      }
    },
  }),
}

export default issue
