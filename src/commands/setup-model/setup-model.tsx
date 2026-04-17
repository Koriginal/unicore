import * as React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import type { OptionWithDescription } from '../../components/CustomSelect/select.js'
import { Select } from '../../components/CustomSelect/select.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { Box, Text } from '../../ink.js'
import { useSetAppState } from '../../state/AppState.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import type { ModelEntry } from '../../utils/settings/types.js'
import {
  applyAndPersistSetup,
  inferProviderFromSetupInput,
  maskApiKey,
  SETUP_PROFILES,
} from '../assistant/setupConfig.js'
import { getSettingsForSource } from '../../utils/settings/settings.js'

// ------------------------------------------------------------
// Wizard step order:
//   profile → profileName → baseUrl → apiKey → provider → models → confirm
// ------------------------------------------------------------
type WizardStep =
  | 'profile'
  | 'profileName'
  | 'baseUrl'
  | 'apiKey'
  | 'provider'
  | 'models'
  | 'confirm'

type Props = {
  args: string
  onDone: (
    result?: string,
    options?: {
      display?: CommandResultDisplay
    },
  ) => void
}

const PROVIDER_PRESETS = [
  'openai-compatible',
  'anthropic-compatible',
  'ollama',
  'lmstudio',
  'custom',
] as const

function normalizeBaseUrl(value: string): string {
  return new URL(value).toString().replace(/\/+$/, '')
}

async function checkConnectivity(config: {
  baseUrl: string
  apiKey: string
}): Promise<string> {
  let url: URL
  try {
    url = new URL(`${config.baseUrl.replace(/\/+$/, '')}/models`)
  } catch {
    return 'Connectivity check failed: invalid base URL.'
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      signal: controller.signal,
    })
    if (!res.ok) {
      return `Connectivity check failed: HTTP ${res.status} ${res.statusText}`
    }
    return 'Connectivity check passed: /models is reachable.'
  } catch (error) {
    return `Connectivity check failed: ${
      error instanceof Error ? error.message : String(error)
    }`
  } finally {
    clearTimeout(timeout)
  }
}

function SetupModelWizard({ args, onDone }: Props): React.ReactNode {
  const initialNotice = args.trim()
    ? `Ignored extra args for setup command: "${args.trim()}". Use interactive wizard below.`
    : ''

  const userSettings = getSettingsForSource('userSettings') || {}
  const activeProfileName = userSettings.activeAssistantProfile
  const activeProfile =
    activeProfileName && userSettings.assistantProfiles
      ? (userSettings.assistantProfiles[activeProfileName] as any)
      : undefined

  const initialBaseUrl =
    activeProfile?.baseUrl ||
    process.env.UNICORE_BASE_URL ||
    process.env.UNICORE_COMPAT_BASE_URL ||
    ''
  const initialApiKey =
    activeProfile?.apiKey ||
    process.env.UNICORE_API_KEY ||
    process.env.UNICORE_COMPAT_API_KEY ||
    ''
  const initialProvider =
    activeProfile?.provider ||
    process.env.UNICORE_COMPAT_PROVIDER ||
    process.env.UNICORE_MODEL_PROVIDER ||
    'openai-compatible'

  // For multi-model: load existing models list from profile
  const initialModels: ModelEntry[] =
    activeProfile?.models && Array.isArray(activeProfile.models)
      ? activeProfile.models
      : activeProfile?.model
        ? [{ id: activeProfile.model }]
        : []

  const hasCurrentConfig = Boolean(initialBaseUrl && initialApiKey)

  const [step, setStep] = React.useState<WizardStep>('profile')
  const [selectedProfileId, setSelectedProfileId] = React.useState<string>(
    hasCurrentConfig ? 'current' : 'ollama',
  )
  const [baseUrl, setBaseUrl] = React.useState(initialBaseUrl)
  const [apiKey, setApiKey] = React.useState(initialApiKey)
  const [provider, setProvider] = React.useState(initialProvider)
  // Multi-model list
  const [models, setModels] = React.useState<ModelEntry[]>(initialModels)
  // Staging for adding a new model in-wizard
  const [newModelId, setNewModelId] = React.useState('')
  const [newModelLabel, setNewModelLabel] = React.useState('')
  const [notice, setNotice] = React.useState<string>(initialNotice)
  const [isBusy, setIsBusy] = React.useState(false)
  // ALWAYS start empty for name when in a new wizard run to avoid 'default' clobbering
  const [profileNameInput, setProfileNameInput] = React.useState('')
  const setAppState = useSetAppState()

  function cancel(): void {
    onDone('Model setup cancelled.', { display: 'system' })
  }

  function onProfileSelected(value: string): void {
    if (value === 'cancel') {
      cancel()
      return
    }

    const settings = getSettingsForSource('userSettings') || {}
    const savedProfiles = (settings.assistantProfiles || {}) as Record<string, any>

    if (value === 'current') {
      setSelectedProfileId('current')
      setProfileNameInput(activeProfileName || 'default')
      setStep('confirm')
      setNotice('')
      return
    }

    if (savedProfiles[value]) {
      const p = savedProfiles[value]
      setSelectedProfileId(value)
      setBaseUrl(p.baseUrl)
      setApiKey(p.apiKey)
      setProvider(p.provider || 'openai-compatible')
      setModels(
        Array.isArray(p.models) && p.models.length > 0
          ? p.models
          : p.model
            ? [{ id: p.model }]
            : [],
      )
      setProfileNameInput(value)
      // If choosing a SAVED profile, go to baseUrl (editing mode)
      setStep('baseUrl')
      setNotice('')
      return
    }

    if (value === 'custom') {
      setSelectedProfileId('custom')
      setBaseUrl('')
      setApiKey('')
      setProvider('openai-compatible')
      setModels([])
      setProfileNameInput('custom')
      // For NEW custom/preset, go to naming step first
      setStep('profileName')
      setNotice('')
      return
    }

    const profile = SETUP_PROFILES.find(item => item.id === value)
    if (!profile) return
    setSelectedProfileId(profile.id)
    setBaseUrl(profile.baseUrl)
    setProvider(profile.provider)
    setApiKey(profile.defaultApiKey || '')
    setModels(profile.defaultModel ? [{ id: profile.defaultModel }] : [])
    setProfileNameInput(profile.id)
    // Go to naming step (Step 2 now)
    setStep('profileName')
    setNotice('')
  }

  function onProfileNameAction(value: string): void {
    if (value === 'continue') {
      const name = profileNameInput.trim()
      if (!name) {
        setNotice('Please enter a profile name.')
        return
      }
      setNotice('')
      setStep('baseUrl')
      return
    }
    if (value === 'back') {
      setStep('profile')
      return
    }
    if (value === 'cancel') {
      cancel()
    }
  }

  function onBaseUrlAction(value: string): void {
    if (value === 'continue') {
      try {
        const normalized = normalizeBaseUrl(baseUrl)
        setBaseUrl(normalized)
        setProvider(
          inferProviderFromSetupInput({
            baseUrl: normalized,
            provider,
            model: models[0]?.id,
          }),
        )
        setNotice('')
        setStep('apiKey')
      } catch {
        setNotice('请输入合法的 Base URL（示例：http://127.0.0.1:11434/v1）')
      }
      return
    }
    if (value === 'back') {
      setNotice('')
      // NEW: if we are in naming-flow, go back to profileName, else profile
      setStep('profileName')
      return
    }
    if (value === 'cancel') {
      cancel()
    }
  }

  function onApiKeyAction(value: string): void {
    if (value === 'continue') {
      if (!apiKey.trim()) {
        setNotice('API Key 不能为空。')
        return
      }
      setNotice('')
      setStep('provider')
      return
    }
    if (value === 'back') {
      setNotice('')
      setStep('baseUrl')
      return
    }
    if (value === 'cancel') {
      cancel()
    }
  }

  function onProviderAction(value: string): void {
    if (value.startsWith('provider:')) {
      setProvider(value.slice('provider:'.length))
      setNotice('')
      return
    }
    if (value === 'continue') {
      if (!provider.trim()) {
        setNotice('Provider 不能为空。')
        return
      }
      setNotice('')
      setStep('models')
      return
    }
    if (value === 'back') {
      setNotice('')
      setStep('apiKey')
      return
    }
    if (value === 'cancel') {
      cancel()
    }
  }

  function onModelsAction(value: string): void {
    if (value === 'add-model') {
      const id = newModelId.trim()
      if (!id) {
        setNotice('Please type a model ID in the input box first.')
        return
      }
      if (models.some(m => m.id === id)) {
        setNotice(`Model "${id}" is already in the list.`)
        return
      }
      const entry: ModelEntry = {
        id,
        label: newModelLabel.trim() || undefined,
      }
      setModels(prev => [...prev, entry])
      setNewModelId('')
      setNewModelLabel('')
      setNotice(`✓ Added "${id}"`)
      return
    }

    if (value.startsWith('remove:')) {
      const idToRemove = value.slice('remove:'.length)
      setModels(prev => prev.filter(m => m.id !== idToRemove))
      setNotice(`Removed "${idToRemove}"`)
      return
    }

    if (value === 'continue') {
      if (models.length === 0) {
        setNotice('Please add at least one model.')
        return
      }
      setNotice('')
      setStep('confirm')
      return
    }
    if (value === 'back') {
      setNotice('')
      setStep('provider')
      return
    }
    if (value === 'cancel') {
      cancel()
    }
  }

  async function onConfirmAction(value: string): Promise<void> {
    if (value === 'save') {
      const saved = applyAndPersistSetup({
        baseUrl,
        apiKey,
        provider,
        model: models[0]?.id,
        models,
        profileName: profileNameInput || undefined,
      })
      if (saved.ok) {
        const activeModel = models[0]?.id || ''
        if (activeModel) {
          setAppState(prev => ({
            ...prev,
            mainLoopModel: activeModel,
            mainLoopModelForSession: null,
          }))
        }
        onDone(saved.message)
      } else {
        setNotice(saved.message)
      }
      return
    }
    if (value === 'test') {
      setIsBusy(true)
      const message = await checkConnectivity({ baseUrl, apiKey })
      setNotice(message)
      setIsBusy(false)
      return
    }
    if (value === 'edit-base-url') {
      setNotice('')
      setStep('baseUrl')
      return
    }
    if (value === 'edit-api-key') {
      setNotice('')
      setStep('apiKey')
      return
    }
    if (value === 'edit-provider') {
      setNotice('')
      setStep('provider')
      return
    }
    if (value === 'edit-models') {
      setNotice('')
      setStep('models')
      return
    }
    if (value === 'cancel') {
      cancel()
    }
  }

  // ---- Options ---------------------------------------------------------------

  const profileOptions: OptionWithDescription<string>[] = [
    ...(hasCurrentConfig
      ? [
          {
            value: 'current',
            label: 'Use current config',
            description: `${initialBaseUrl} · ${maskApiKey(initialApiKey)}`,
          },
        ]
      : []),
    ...Object.keys(getSettingsForSource('userSettings')?.assistantProfiles || {}).map(
      id => ({
        value: id,
        label: `provider: ${id}`,
        description: 'Saved provider profile',
      }),
    ),
    ...SETUP_PROFILES.map(profile => ({
      value: profile.id,
      label: profile.id,
      description: `${profile.description} · ${profile.baseUrl}`,
    })),
    {
      value: 'custom',
      label: 'custom',
      description: 'Manually configure any OpenAI-compatible gateway',
    },
    {
      value: 'cancel',
      label: 'cancel',
      description: 'Exit wizard',
    },
  ]

  const baseUrlOptions: OptionWithDescription<string>[] = [
    {
      value: 'input-base-url',
      type: 'input',
      label: 'Base URL',
      description: 'Press Enter to edit',
      initialValue: baseUrl,
      showLabelWithValue: true,
      labelValueSeparator: ': ',
      allowEmptySubmitToCancel: true,
      placeholder: 'http://127.0.0.1:11434/v1',
      onChange: setBaseUrl,
    },
    { value: 'continue', label: 'continue', description: 'Go to API key step' },
    { value: 'back', label: 'back', description: 'Back' },
    { value: 'cancel', label: 'cancel', description: 'Exit wizard' },
  ]

  const apiKeyOptions: OptionWithDescription<string>[] = [
    {
      value: 'input-api-key',
      type: 'input',
      label: 'API Key',
      description: 'Press Enter to edit',
      initialValue: apiKey,
      showLabelWithValue: true,
      labelValueSeparator: ': ',
      allowEmptySubmitToCancel: true,
      placeholder:
        selectedProfileId === 'ollama'
          ? 'ollama'
          : selectedProfileId === 'lmstudio'
            ? 'lmstudio'
            : 'your_api_key',
      onChange: setApiKey,
    },
    { value: 'continue', label: 'continue', description: 'Go to provider step' },
    { value: 'back', label: 'back', description: 'Back to base URL step' },
    { value: 'cancel', label: 'cancel', description: 'Exit wizard' },
  ]

  const providerOptions: OptionWithDescription<string>[] = [
    ...PROVIDER_PRESETS.map(item => ({
      value: `provider:${item}`,
      label: item,
      description: provider === item ? 'current' : undefined,
    })),
    {
      value: 'input-provider',
      type: 'input',
      label: 'Custom provider',
      description: 'Press Enter to edit',
      initialValue: provider,
      showLabelWithValue: true,
      labelValueSeparator: ': ',
      allowEmptySubmitToCancel: true,
      placeholder: 'openai-compatible',
      onChange: setProvider,
    },
    { value: 'continue', label: 'continue', description: 'Go to model registration' },
    { value: 'back', label: 'back', description: 'Back to API key step' },
    { value: 'cancel', label: 'cancel', description: 'Exit wizard' },
  ]

  const modelsOptions: OptionWithDescription<string>[] = [
    {
      value: 'input-model-id',
      type: 'input',
      label: 'Model ID',
      description: 'Type a model ID then press [add-model]',
      initialValue: newModelId,
      showLabelWithValue: true,
      labelValueSeparator: ': ',
      allowEmptySubmitToCancel: true,
      placeholder: 'e.g. qwen-flash / gpt-4o / claude-3-7-sonnet-latest',
      onChange: setNewModelId,
    },
    {
      value: 'input-model-label',
      type: 'input',
      label: 'Display Name (optional)',
      description: 'Optional friendly name for /model picker',
      initialValue: newModelLabel,
      showLabelWithValue: true,
      labelValueSeparator: ': ',
      allowEmptySubmitToCancel: true,
      placeholder: 'e.g. Qwen Flash',
      onChange: setNewModelLabel,
    },
    {
      value: 'add-model',
      label: '+ Add model to list',
      description: models.length > 0 ? `${models.length} model(s) registered so far` : 'No models yet',
    },
    ...models.map(m => ({
      value: `remove:${m.id}`,
      label: `✕ ${m.label || m.id}`,
      description: m.label ? `id: ${m.id} · press to remove` : 'Press to remove',
    })),
    { value: 'continue', label: 'continue ›', description: 'Done, review and save' },
    { value: 'back', label: 'back', description: 'Back to provider step' },
    { value: 'cancel', label: 'cancel', description: 'Exit wizard' },
  ]

  // Detect if the current name would overwrite an existing profile
  const existingSavedProfiles = (getSettingsForSource('userSettings')?.assistantProfiles || {}) as Record<string, any>
  const willOverwrite =
    profileNameInput.trim() &&
    existingSavedProfiles[profileNameInput.trim()] &&
    profileNameInput.trim() !== selectedProfileId

  const profileNameOptions: OptionWithDescription<string>[] = [
    {
      value: 'input-profile-name',
      type: 'input',
      label: 'Provider Name',
      description: 'Unique name to identify this provider (e.g. aliyun, bigmodel)',
      initialValue: profileNameInput,
      showLabelWithValue: true,
      labelValueSeparator: ': ',
      allowEmptySubmitToCancel: true,
      placeholder: 'e.g. aliyun',
      onChange: setProfileNameInput,
    },
    {
      value: 'continue',
      label: 'continue',
      description: willOverwrite
        ? `⚠ Will overwrite existing profile "${profileNameInput.trim()}"`
        : profileNameInput.trim()
          ? `Save as "${profileNameInput.trim()}"`
          : 'Enter a name first',
    },
    { value: 'back', label: 'back', description: 'Back' },
    { value: 'cancel', label: 'cancel', description: 'Exit wizard' },
  ]

  const confirmOptions: OptionWithDescription<string>[] = [
    {
      value: 'save',
      label: 'save and apply',
      description: 'Persist to settings and activate now',
    },
    {
      value: 'test',
      label: isBusy ? 'testing...' : 'test connectivity',
      description: 'Check GET /models',
      disabled: isBusy,
    },
    { value: 'edit-base-url', label: 'edit base URL' },
    { value: 'edit-api-key', label: 'edit API key' },
    { value: 'edit-provider', label: 'edit provider' },
    { value: 'edit-models', label: 'edit registered models' },
    { value: 'cancel', label: 'cancel' },
  ]

  // ---- Render ----------------------------------------------------------------

  const noticeNode = notice ? (
    <Box>
      <Text color={notice.includes('passed') || notice.startsWith('✓') ? 'green' : 'yellow'}>
        {notice}
      </Text>
    </Box>
  ) : null

  if (step === 'profile') {
    return (
      <Dialog
        title="UniCore Model Setup Wizard"
        subtitle="Step 1/6 · Choose a provider profile"
        onCancel={cancel}
        isCancelActive={false}
        color="permission"
      >
        <Select
          options={profileOptions}
          onChange={onProfileSelected}
          onCancel={cancel}
        />
      </Dialog>
    )
  }

  if (step === 'profileName') {
    return (
      <Dialog
        title="UniCore Model Setup Wizard"
        subtitle="Step 2/6 · Name your provider profile"
        onCancel={cancel}
        isCancelActive={false}
        color="permission"
      >
        <Box flexDirection="column">
          <Text dimColor>
            Choose a unique name (e.g. aliyun, bigmodel, local-ollama).
          </Text>
          {noticeNode}
          <Select
            options={profileNameOptions}
            onChange={onProfileNameAction}
            onCancel={cancel}
          />
        </Box>
      </Dialog>
    )
  }

  if (step === 'baseUrl') {
    return (
      <Dialog
        title="UniCore Model Setup Wizard"
        subtitle="Step 3/6 · Configure Base URL"
        onCancel={cancel}
        isCancelActive={false}
        color="permission"
      >
        <Box flexDirection="column">
          <Text dimColor>
            Profile: {profileNameInput} · Current URL: {baseUrl || '(empty)'}
          </Text>
          {noticeNode}
          <Select
            options={baseUrlOptions}
            onChange={onBaseUrlAction}
            onCancel={cancel}
          />
        </Box>
      </Dialog>
    )
  }

  if (step === 'apiKey') {
    return (
      <Dialog
        title="UniCore Model Setup Wizard"
        subtitle="Step 4/6 · Configure API Key"
        onCancel={cancel}
        isCancelActive={false}
        color="permission"
      >
        <Box flexDirection="column">
          <Text dimColor>Current: {maskApiKey(apiKey)}</Text>
          {noticeNode}
          <Select
            options={apiKeyOptions}
            onChange={onApiKeyAction}
            onCancel={cancel}
          />
        </Box>
      </Dialog>
    )
  }

  if (step === 'provider') {
    return (
      <Dialog
        title="UniCore Model Setup Wizard"
        subtitle="Step 5/6 · Configure Provider Hint"
        onCancel={cancel}
        isCancelActive={false}
        color="permission"
      >
        <Box flexDirection="column">
          <Text dimColor>Current: {provider}</Text>
          {noticeNode}
          <Select
            options={providerOptions}
            onChange={onProviderAction}
            onCancel={cancel}
          />
        </Box>
      </Dialog>
    )
  }

  if (step === 'models') {
    return (
      <Dialog
        title="UniCore Model Setup Wizard"
        subtitle={`Step 6/6 · Register Models  [${models.length} added]`}
        onCancel={cancel}
        isCancelActive={false}
        color="permission"
      >
        <Box flexDirection="column">
          <Text dimColor>
            Add as many models as you want for this provider.
          </Text>
          {noticeNode}
          <Select
            options={modelsOptions}
            onChange={onModelsAction}
            onCancel={cancel}
            visibleOptionCount={8}
          />
        </Box>
      </Dialog>
    )
  }

  // Confirm / review step
  const activeModelId = models[0]?.id || '(none)'
  return (
    <Dialog
      title="UniCore Model Setup Wizard"
      subtitle="Step 7/7 · Review and apply"
      onCancel={cancel}
      isCancelActive={false}
      color="permission"
    >
      <Box flexDirection="column">
        <Text>save as:   {profileNameInput}</Text>
        <Text>base_url:  {baseUrl}</Text>
        <Text>api_key:   {maskApiKey(apiKey)}</Text>
        <Text>provider:  {provider}</Text>
        <Text>
          models ({models.length}):{'  '}
          {models.map(m => m.label || m.id).join(', ') || '(none)'}
        </Text>
        <Text dimColor>default:   {activeModelId}</Text>
        {noticeNode}
        <Select
          options={confirmOptions}
          onCancel={cancel}
          onChange={value => {
            void onConfirmAction(value)
          }}
        />
      </Box>
    </Dialog>
  )
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  return <SetupModelWizard args={args} onDone={onDone} />
}
