const backfillSessions = {
  type: 'local',
  name: 'backfill-sessions',
  description: 'Backfill session metadata guidance',
  isHidden: true,
  supportsNonInteractive: true,
  load: async () => ({
    call: async () => ({
      type: 'text',
      value:
        'Session backfill helper: this offline build currently uses on-read metadata recovery.\n' +
        'If session labels are missing, run /rename in target sessions and restart to refresh indexes.',
    }),
  }),
}

export default backfillSessions
