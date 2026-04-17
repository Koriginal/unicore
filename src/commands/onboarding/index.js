const onboarding = {
  type: 'local',
  name: 'onboarding',
  description: 'Show local onboarding and quick-start guidance',
  supportsNonInteractive: true,
  load: async () => ({
    call: async () => ({
      type: 'text',
      value:
        'UniCore is ready. Quick start:\n1) /setup configure model gateway\n2) /status check runtime and model route\n3) /project switch workspace if needed\n4) Ask directly: "帮我修改这个函数并运行测试"',
    }),
  }),
}

export default onboarding
