const oauthRefresh = {
  type: 'local',
  name: 'oauth-refresh',
  description: 'Refresh auth token guidance for compatibility gateways',
  isHidden: true,
  supportsNonInteractive: true,
  load: async () => ({
    call: async () => ({
      type: 'text',
      value:
        'Offline build does not run cloud OAuth refresh.\n' +
        'For local gateway auth, rotate key/token at provider side and restart UniCore with updated env vars:\n' +
        '- UNICORE_BASE_URL\n' +
        '- UNICORE_API_KEY or UNICORE_COMPAT_API_KEY\n' +
        '- UNICORE_COMPAT_USE_BEARER_AUTH=1 (if bearer mode is required)',
    }),
  }),
}

export default oauthRefresh
