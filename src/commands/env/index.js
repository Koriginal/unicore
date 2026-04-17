const ENV_KEYS = [
  'UNICORE_CODE_OFFLINE',
  'DISABLE_AUTOUPDATER',
  'UNICORE_CONFIG_DIR',
  'UNICORE_BASE_URL',
  'UNICORE_COMPAT_BASE_URL',
  'UNICORE_COMPAT_PROVIDER',
  'UNICORE_COMPAT_USE_BEARER_AUTH',
  'ANTHROPIC_MODEL',
  'UNICORE_MODEL_ROUTER_ENABLED',
  'UNICORE_MODEL_ROUTER_PROFILE',
]

const redact = (key, value) => {
  if (!value) return '(unset)'
  if (/KEY|TOKEN|SECRET|PASSWORD/i.test(key)) return '(redacted)'
  return value
}

const env = {
  type: 'local',
  name: 'env',
  description: 'Show key runtime environment values',
  isHidden: true,
  supportsNonInteractive: true,
  load: async () => ({
    call: async () => {
      const lines = ENV_KEYS.map(k => `- ${k}=${redact(k, process.env[k])}`)
      return {
        type: 'text',
        value: `Runtime environment snapshot:\n${lines.join('\n')}`,
      }
    },
  }),
}

export default env
