import * as React from 'react'
import { Select } from '../../components/CustomSelect/select.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Box, Text } from '../../ink.js'
import type { LocalJSXCommandOnDone } from '../../types/command.js'
import {
  getSettingsForSource,
  updateSettingsForSource,
} from '../../utils/settings/settings.js'
import { applyConfigEnvironmentVariables } from '../../utils/managedEnv.js'
import {
  applyAndPersistSetup,
  buildSetupGuide,
  listProfiles,
  loadProfile,
  maskApiKey,
  parseSetupArgs,
  SETUP_PROFILES,
} from './setupConfig.js'
import type { Command } from '../../types/command.js'

function AssistantDashboard({
  args,
  onDone,
}: {
  args: string
  onDone: LocalJSXCommandOnDone
}): React.ReactNode {
  const trimmed = args.trim().toLowerCase()
  const rawArgs = args.trim()
  const isOffline = process.env.UNICORE_CODE_OFFLINE === '1'
  const hasApiKey = Boolean(
    process.env.UNICORE_API_KEY || process.env.UNICORE_COMPAT_API_KEY,
  )
  const hasBaseUrl = Boolean(
    process.env.UNICORE_BASE_URL || process.env.UNICORE_COMPAT_BASE_URL,
  )
  const currentProvider =
    process.env.UNICORE_COMPAT_PROVIDER ||
    process.env.UNICORE_MODEL_PROVIDER ||
    'not set'

  // Refactored show logic for visual clarity
  if (trimmed === 'setup show') {
    const settings = getSettingsForSource('userSettings') || {}
    const activeProfile = settings.activeAssistantProfile || 'default'
    const effectiveBaseUrl =
      process.env.UNICORE_BASE_URL ||
      process.env.UNICORE_COMPAT_BASE_URL ||
      'not set'
    const effectiveApiKey =
      process.env.UNICORE_API_KEY || process.env.UNICORE_COMPAT_API_KEY || ''
    const effectiveModel =
      process.env.ANTHROPIC_MODEL || process.env.UNICORE_MODEL || 'not set'

    onDone() // We don't return text here, we render JSX for better visuals
    return (
      <Dialog title="Assistant Configuration Deck">
        <Box flexDirection="column" paddingX={1}>
          <Box marginBottom={1}>
            <Text bold color="cyan">
              ACTIVE PROFILE: {activeProfile}
            </Text>
          </Box>
          <Box>
            <Text dimColor>Base URL:  </Text>
            <Text>{effectiveBaseUrl}</Text>
          </Box>
          <Box>
            <Text dimColor>API Key:   </Text>
            <Text>{maskApiKey(effectiveApiKey)}</Text>
          </Box>
          <Box>
            <Text dimColor>Provider:  </Text>
            <Text>{currentProvider}</Text>
          </Box>
          <Box>
            <Text dimColor>Model:     </Text>
            <Text>{effectiveModel}</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              Tip: Manage profiles via /assistant profile or /setup
            </Text>
          </Box>
        </Box>
      </Dialog>
    )
  }

  // Handle interactive profile switcher
  if (trimmed === 'profile' || trimmed === 'profile list') {
    const profiles = listProfiles()
    const settings = getSettingsForSource('userSettings') || {}
    const active = settings.activeAssistantProfile

    if (!profiles.length) {
      onDone(
        'No custom profiles saved. Use /assistant setup --name <name> to save one.',
      )
      return null
    }

    const options = profiles.map(p => ({
      label: p === active ? `${p} (active)` : p,
      value: p,
      description: p === active ? 'Currently in use' : `Switch to ${p}`,
    }))

    return (
      <Dialog title="Select Assistant Profile">
        <Select
          options={options}
          onChange={val => {
            const res = loadProfile(val)
            onDone(res.message)
          }}
        />
      </Dialog>
    )
  }

  if (rawArgs.toLowerCase().startsWith('profile use ')) {
    const name = rawArgs.slice('profile use '.length).trim()
    if (!name) {
      onDone('Usage: /assistant profile use <name>')
      return null
    }
    const result = loadProfile(name)
    onDone(result.message)
    return null
  }

  if (rawArgs.toLowerCase().startsWith('profile delete ')) {
    const name = rawArgs.slice('profile delete '.length).trim()
    if (!name) {
      onDone('Usage: /assistant profile delete <name>')
      return null
    }

    const settings = getSettingsForSource('userSettings') || {}
    const profiles = { ...(settings.assistantProfiles || {}) }
    if (!profiles[name]) {
      onDone(`Profile "${name}" not found.`)
      return null
    }

    delete profiles[name]
    const update: any = { assistantProfiles: profiles }
    if (settings.activeAssistantProfile === name) {
      update.activeAssistantProfile = 'default'
    }

    const result = updateSettingsForSource('userSettings', update)
    if (result.error) {
      onDone(`Failed to delete profile: ${result.error.message}`)
    } else {
      onDone(`Profile "${name}" deleted. Switched back to default if was active.`)
    }
    return null
  }

  if (trimmed === 'setup clear') {
    const merged = getSettingsForSource('userSettings') || {}
    const env = { ...(merged.env || {}) }
    delete env.UNICORE_BASE_URL
    delete env.UNICORE_COMPAT_BASE_URL
    delete env.UNICORE_API_KEY
    delete env.UNICORE_COMPAT_API_KEY
    delete env.UNICORE_COMPAT_PROVIDER
    delete env.UNICORE_MODEL_PROVIDER
    delete env.ANTHROPIC_MODEL
    delete env.UNICORE_MODEL

    const result = updateSettingsForSource('userSettings', { env })
    if (result.error) {
      onDone(`Failed to clear assistant setup: ${result.error.message}`)
      return null
    }

    delete process.env.UNICORE_BASE_URL
    delete process.env.UNICORE_COMPAT_BASE_URL
    delete process.env.UNICORE_API_KEY
    delete process.env.UNICORE_COMPAT_API_KEY
    delete process.env.UNICORE_COMPAT_PROVIDER
    delete process.env.UNICORE_MODEL_PROVIDER
    delete process.env.ANTHROPIC_MODEL
    delete process.env.UNICORE_MODEL
    applyConfigEnvironmentVariables()

    onDone('Assistant setup cleared.')
    return null
  }

  if (trimmed === 'probe') {
    const baseUrl =
      process.env.UNICORE_BASE_URL || process.env.UNICORE_COMPAT_BASE_URL || ''
    const apiKey =
      process.env.UNICORE_API_KEY || process.env.UNICORE_COMPAT_API_KEY || ''
    const model = process.env.ANTHROPIC_MODEL || process.env.UNICORE_MODEL || ''

    if (!baseUrl || !apiKey || !model) {
      onDone(
        'Probe requires base_url + api_key + model. Configure via /setup first.',
      )
      return null
    }

    // Run async probe
    ;(async () => {
      const normalized = baseUrl.replace(/\/+$/, '')
      const authHeader = { Authorization: `Bearer ${apiKey}` }
      const timeoutMs = 12_000
      async function fetchStatus(url: string, body?: unknown) {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), timeoutMs)
        try {
          const res = await fetch(url, {
            method: body ? 'POST' : 'GET',
            headers: { 'content-type': 'application/json', ...authHeader },
            ...(body ? { body: JSON.stringify(body) } : {}),
            signal: controller.signal,
          })
          return `${res.status} ${res.statusText}`
        } catch (error) {
          return `ERR ${error instanceof Error ? error.message : String(error)}`
        } finally {
          clearTimeout(timeout)
        }
      }

      const [modelsStatus, chatStatus, messagesStatus] = await Promise.all([
        fetchStatus(`${normalized}/models`),
        fetchStatus(
          normalized.endsWith('/v1')
            ? `${normalized}/chat/completions`
            : `${normalized}/v1/chat/completions`,
          {
            model,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 8,
          },
        ),
        fetchStatus(
          normalized.endsWith('/v1')
            ? `${normalized}/messages`
            : `${normalized}/v1/messages`,
          {
            model,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 8,
          },
        ),
      ])

      onDone(`Assistant probe
- base_url: ${normalized}
- model: ${model}
- GET /models: ${modelsStatus}
- POST /chat/completions: ${chatStatus}
- POST /messages: ${messagesStatus}`)
    })()
    return <Text>Probing endpoint protocol readiness...</Text>
  }

  // Fallback to text responses for simple or help commands
  if (trimmed === 'status' || trimmed === 'start' || !trimmed || trimmed === 'help') {
    let helpText = ''
    if (trimmed === 'status') {
      helpText = `Assistant status
- mode: ${isOffline ? 'offline-first' : 'online-compatible'}
- model route: ${hasBaseUrl ? 'configured' : 'not configured'}
- auth: ${hasApiKey ? 'configured' : 'missing'}
\nUse /assistant setup show for configuration details.`
    } else {
      helpText = `Assistant command (CC-Switch Style)

- /assistant profile         Interactive switcher (Recommended)
- /assistant profile list    List saved profiles
- /assistant profile use <name> One-step switch
- /assistant profile delete <name>
- /assistant setup show      Visual configuration deck
- /assistant setup clear     Reset credentials
- /assistant probe           Test connection protocols
- /setup                     Interactive wizard`
    }
    onDone(helpText)
    return null
  }

  // Default: pass through setup profiles
  if (rawArgs.toLowerCase().startsWith('setup profile ')) {
    const saved = applyAndPersistSetup(parseSetupArgs(rawArgs.slice('setup'.length)))
    onDone(saved.message)
    return null
  }

  onDone(`Unknown /assistant subcommand. Try /assistant help.`)
  return null
}

const assistantCommand: Command = {
  type: 'local-jsx',
  name: 'assistant',
  description: 'Assistant profile and configuration manager',
  isEnabled: () => true,
  supportsNonInteractive: true,
  async load() {
    return {
      async call(onDone, context, args) {
        return <AssistantDashboard args={args} onDone={onDone} />
      },
    }
  },
}

export default assistantCommand
