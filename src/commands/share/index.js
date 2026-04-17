const share = {
  type: 'local',
  name: 'share',
  description: 'Share/export session guidance for offline build',
  supportsNonInteractive: true,
  load: async () => ({
    call: async () => ({
      type: 'text',
      value:
        'Offline build does not upload cloud share links. Use local options instead:\n1) /export to export session data\n2) Copy terminal transcript directly\n3) Commit your workspace changes and share the git hash.',
    }),
  }),
}

export default share
