import {
  getSettingsForSource,
  updateSettingsForSource,
} from '../../utils/settings/settings.js'
import { applyConfigEnvironmentVariables } from '../../utils/managedEnv.js'
import type { ModelEntry } from '../../utils/settings/types.js'

export type SetupConfig = {
  baseUrl?: string
  apiKey?: string
  provider?: string
  /** For single-model backward compat: the model id to activate */
  model?: string
  /** Profile name / provider name */
  profileName?: string
  /** Batch of models to register. If provided, replaces the profile's models[] */
  models?: ModelEntry[]
}

export type SetupProfile = {
  id: string
  baseUrl: string
  provider: string
  defaultApiKey?: string
  defaultModel?: string
  description: string
}

export const SETUP_PROFILES: SetupProfile[] = [
  {
    id: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    provider: 'anthropic-compatible',
    description: 'Claude official API (no product login required)',
    defaultModel: 'claude-3-7-sonnet-latest',
  },
  {
    id: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    provider: 'ollama',
    defaultApiKey: 'ollama',
    description: 'Local Ollama service',
  },
  {
    id: 'lmstudio',
    baseUrl: 'http://127.0.0.1:1234/v1',
    provider: 'lmstudio',
    defaultApiKey: 'lmstudio',
    description: 'Local LM Studio API server',
  },
  {
    id: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    provider: 'openai-compatible',
    description: 'OpenRouter multi-provider gateway',
    defaultModel: 'anthropic/claude-3.7-sonnet',
  },
  {
    id: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    provider: 'openai-compatible',
    description: 'DeepSeek compatible API',
  },
]

export function maskApiKey(key: string | undefined): string {
  if (!key) return 'not set'
  if (key.length <= 10) return `${key.slice(0, 3)}***`
  return `${key.slice(0, 6)}...${key.slice(-4)}`
}

export function parseSetupArgs(rawArgs: string): SetupConfig {
  const out: SetupConfig = {}
  const arg = rawArgs.trim()
  if (!arg) return out

  const optionRegex = /--([a-z-]+)\s+(".*?"|'.*?'|[^\s]+)/g
  let matchedOptions = 0
  for (const match of arg.matchAll(optionRegex)) {
    matchedOptions++
    const key = match[1]
    const rawValue = (match[2] || '').trim()
    const value = rawValue.replace(/^['"]|['"]$/g, '')
    if (!value) continue

    if (key === 'base-url') out.baseUrl = value
    if (key === 'api-key') out.apiKey = value
    if (key === 'provider') out.provider = value
    if (key === 'model') out.model = value
    if (key === 'name' || key === 'profile') out.profileName = value
  }

  if (matchedOptions > 0) return out

  const tokens = arg
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean)
  if (tokens.length >= 1) out.baseUrl = tokens[0]
  if (tokens.length >= 2) out.apiKey = tokens[1]
  if (tokens.length >= 3) out.provider = tokens[2]
  if (tokens.length >= 4) out.model = tokens[3]
  return out
}

export function buildSetupGuide(): string {
  return `Assistant setup wizard

Primary interactive wizard (recommended):
- /setup

Quick presets:
1) Claude official API
   /assistant setup profile anthropic <api_key> [model]
2) Ollama (local)
   /assistant setup profile ollama
3) LM Studio (local)
   /assistant setup profile lmstudio
4) OpenRouter (Claude/Qwen/GPT unified)
   /assistant setup profile openrouter <api_key> [model]
5) DeepSeek
   /assistant setup profile deepseek <api_key> [model]

Manual mode:
- /assistant setup --base-url <url> --api-key <key> [--provider <name>] [--model <model_name>] [--name <profile_name>]
- /assistant setup <url> <key> [provider] [model_name]

Inspect / cleanup:
- /assistant setup show
- /assistant setup clear

Compatibility:
- /setup-model still works (alias to /setup)`
}

export function inferProviderFromSetupInput(input: {
  provider?: string
  baseUrl?: string
  model?: string
}): string {
  const explicit = input.provider?.trim().toLowerCase()
  if (explicit) return explicit

  const base = input.baseUrl?.trim().toLowerCase() || ''
  const model = input.model?.trim().toLowerCase() || ''
  if (base.includes('api.anthropic.com')) return 'anthropic-compatible'
  if (base.includes('/compatible-mode/') || base.includes('/chat/completions')) {
    return 'openai-compatible'
  }
  if (base.includes('openrouter.ai')) return 'openai-compatible'
  if (base.includes('127.0.0.1:11434')) return 'ollama'
  if (base.includes('127.0.0.1:1234')) return 'lmstudio'
  if (model.startsWith('claude-')) return 'anthropic-compatible'
  if (model.startsWith('anthropic/claude-')) return 'openai-compatible'
  return 'openai-compatible'
}

/**
 * Returns the effective (active) model for a profile.
 * Priority: defaultModel > first in models[] > legacy model field
 */
export function getEffectiveModelForProfile(profile: {
  defaultModel?: string
  models?: ModelEntry[]
  model?: string
}): string | undefined {
  if (profile.defaultModel) return profile.defaultModel
  if (profile.models?.[0]) return profile.models[0].id
  return profile.model
}

/**
 * Inject a profile's credentials into process.env and apply the managed env layer.
 * Called every time the active profile or its active model changes.
 */
export function applyProfileToEnv(profile: {
  baseUrl: string
  apiKey: string
  provider?: string
  defaultModel?: string
  models?: ModelEntry[]
  model?: string
}): void {
  const activeModel = getEffectiveModelForProfile(profile)

  process.env.UNICORE_BASE_URL = profile.baseUrl
  process.env.UNICORE_API_KEY = profile.apiKey
  if (profile.provider) {
    process.env.UNICORE_COMPAT_PROVIDER = profile.provider
    process.env.UNICORE_MODEL_PROVIDER = profile.provider
  }
  if (activeModel) {
    process.env.ANTHROPIC_MODEL = activeModel
    process.env.UNICORE_MODEL = activeModel
  }
  applyConfigEnvironmentVariables()
}

export function applyAndPersistSetup(
  parsed: SetupConfig,
): { ok: true; message: string } | { ok: false; message: string } {
  if (!parsed.baseUrl || !parsed.apiKey) {
    return { ok: false, message: buildSetupGuide() }
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(parsed.baseUrl)
  } catch {
    return {
      ok: false,
      message: `Invalid base URL: ${parsed.baseUrl}`,
    }
  }

  const merged = getSettingsForSource('userSettings') || {}
  const providerHint = inferProviderFromSetupInput(parsed)

  // Smart default name if none provided (avoids 'default' clobbering)
  let profileName = parsed.profileName?.trim()
  if (!profileName) {
    const host = parsedUrl.hostname.toLowerCase()
    if (host.includes('anthropic')) profileName = 'anthropic'
    else if (host.includes('openai')) profileName = 'openai'
    else if (host.includes('dashscope') || host.includes('aliyun')) profileName = 'aliyun'
    else if (host.includes('openrouter')) profileName = 'openrouter'
    else if (host.includes('deepseek')) profileName = 'deepseek'
    else if (host.includes('bigmodel') || host.includes('zhipu')) profileName = 'bigmodel'
    else if (host.includes('ollama')) profileName = 'ollama'
    else profileName = 'default'
  }

  // Build the registered models list.
  // If caller passes explicit models[], use them. Otherwise:
  //   - Merge with existing models[] for this profile
  //   - Ensure the current model is in the list
  const existingProfile = (merged.assistantProfiles || {})[profileName] as
    | {
        models?: ModelEntry[]
        defaultModel?: string
        model?: string
      }
    | undefined

  let registeredModels: ModelEntry[] = existingProfile?.models ? [...existingProfile.models] : []

  if (parsed.models && parsed.models.length > 0) {
    // Explicit replacement from wizard
    registeredModels = parsed.models
  } else if (parsed.model) {
    // Single model: add to the list if not already present
    const modelId = parsed.model.trim()
    if (modelId && !registeredModels.some(m => m.id === modelId)) {
      registeredModels.push({ id: modelId })
    }
  }

  const activeModel =
    parsed.model?.trim() ||
    existingProfile?.defaultModel ||
    existingProfile?.models?.[0]?.id ||
    existingProfile?.model ||
    registeredModels[0]?.id

  // 1. Prepare profile data
  const profileData: Record<string, unknown> = {
    name: profileName,
    baseUrl: parsedUrl.toString().replace(/\/+$/, ''),
    apiKey: parsed.apiKey,
    provider: providerHint,
    // Keep legacy model field for compat
    model: activeModel,
    // New multi-model fields
    models: registeredModels,
    defaultModel: activeModel,
  }

  // 2. Update settings
  const update: Record<string, unknown> = {
    env: { ...(merged.env || {}) },
    assistantProfiles: {
      ...(merged.assistantProfiles || {}),
      [profileName]: profileData,
    },
    activeAssistantProfile: profileName,
  }

  const result = updateSettingsForSource('userSettings', update)
  if (result.error) {
    return {
      ok: false,
      message: `Failed to save assistant setup: ${result.error.message}`,
    }
  }

  // 3. Apply credentials to process.env immediately
  applyProfileToEnv({
    baseUrl: profileData.baseUrl as string,
    apiKey: profileData.apiKey as string,
    provider: profileData.provider as string,
    defaultModel: activeModel,
    models: registeredModels,
  })

  const modelsList = registeredModels.map(m => `  · ${m.label || m.id}`).join('\n') || `  · ${activeModel || 'not set'}`

  return {
    ok: true,
    message: `Assistant profile "${profileName}" saved.
- base_url: ${profileData.baseUrl}
- api_key: ${maskApiKey(parsed.apiKey)}
- provider: ${providerHint}
- active model: ${activeModel || 'not set'}
- registered models:\n${modelsList}

Active in this session. Next:
1) Run /status to verify route/auth/model
2) Use /model to switch between registered models`,
  }
}

/**
 * Register a new model to an existing provider profile.
 * If the profile doesn't exist, returns an error.
 */
export function registerModelToProfile(
  profileName: string,
  entry: ModelEntry,
  setAsDefault = false,
): { ok: boolean; message: string } {
  const merged = getSettingsForSource('userSettings') || {}
  const profiles = { ...(merged.assistantProfiles || {}) } as Record<string, any>
  const profile = profiles[profileName]

  if (!profile) {
    return { ok: false, message: `Profile "${profileName}" not found. Run /setup first.` }
  }

  const models: ModelEntry[] = Array.isArray(profile.models) ? [...profile.models] : []

  if (models.some(m => m.id === entry.id)) {
    return { ok: false, message: `Model "${entry.id}" is already registered in profile "${profileName}".` }
  }
  models.push(entry)

  const defaultModel = setAsDefault ? entry.id : (profile.defaultModel || profile.model || entry.id)

  const updatedProfile = {
    ...profile,
    models,
    defaultModel,
    model: defaultModel, // keep compat
  }
  profiles[profileName] = updatedProfile

  const result = updateSettingsForSource('userSettings', {
    assistantProfiles: profiles,
  })
  if (result.error) {
    return { ok: false, message: `Failed to register model: ${result.error.message}` }
  }

  // If this is the active profile, refresh env
  if (merged.activeAssistantProfile === profileName) {
    applyProfileToEnv({
      baseUrl: profile.baseUrl,
      apiKey: profile.apiKey,
      provider: profile.provider,
      defaultModel,
      models,
    })
  }

  return { ok: true, message: `Model "${entry.id}" registered to profile "${profileName}".` }
}

/**
 * Remove a model from a provider profile.
 */
export function unregisterModelFromProfile(
  profileName: string,
  modelId: string,
): { ok: boolean; message: string } {
  const merged = getSettingsForSource('userSettings') || {}
  const profiles = { ...(merged.assistantProfiles || {}) } as Record<string, any>
  const profile = profiles[profileName]

  if (!profile) {
    return { ok: false, message: `Profile "${profileName}" not found.` }
  }

  const models: ModelEntry[] = (profile.models || []).filter((m: ModelEntry) => m.id !== modelId)
  const defaultModel =
    profile.defaultModel === modelId
      ? (models[0]?.id ?? profile.model ?? undefined)
      : profile.defaultModel

  profiles[profileName] = { ...profile, models, defaultModel, model: defaultModel }
  const result = updateSettingsForSource('userSettings', { assistantProfiles: profiles })
  if (result.error) {
    return { ok: false, message: `Failed to unregister model: ${result.error.message}` }
  }

  if (merged.activeAssistantProfile === profileName) {
    applyProfileToEnv({
      baseUrl: profile.baseUrl,
      apiKey: profile.apiKey,
      provider: profile.provider,
      defaultModel,
      models,
    })
  }

  return { ok: true, message: `Model "${modelId}" removed from profile "${profileName}".` }
}

/**
 * Switch the active model within a profile (without changing the profile itself).
 */
export function switchModelInProfile(
  profileName: string,
  modelId: string,
): { ok: boolean; message: string } {
  const merged = getSettingsForSource('userSettings') || {}
  const profiles = { ...(merged.assistantProfiles || {}) } as Record<string, any>
  const profile = profiles[profileName]

  if (!profile) {
    return { ok: false, message: `Profile "${profileName}" not found.` }
  }

  const models: ModelEntry[] = profile.models || []
  const modelExists = models.some((m: ModelEntry) => m.id === modelId)

  if (!modelExists && profile.model !== modelId) {
    return {
      ok: false,
      message: `Model "${modelId}" is not registered in profile "${profileName}". Use /setup to register it first.`,
    }
  }

  profiles[profileName] = { ...profile, defaultModel: modelId, model: modelId }
  const result = updateSettingsForSource('userSettings', {
    assistantProfiles: profiles,
    activeAssistantProfile: profileName,
  })
  if (result.error) {
    return { ok: false, message: `Failed to switch model: ${result.error.message}` }
  }

  applyProfileToEnv({
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    provider: profile.provider,
    defaultModel: modelId,
    models,
  })

  return { ok: true, message: `Switched to model "${modelId}" on profile "${profileName}".` }
}

export function listProfiles(): string[] {
  const merged = getSettingsForSource('userSettings') || {}
  return Object.keys(merged.assistantProfiles || {})
}

export function loadProfile(name: string): { ok: boolean; message: string } {
  const merged = getSettingsForSource('userSettings') || {}
  const profiles = merged.assistantProfiles || {}
  const profile = profiles[name] as any

  if (!profile) {
    return { ok: false, message: `Profile "${name}" not found.` }
  }

  return applyAndPersistSetup({
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    provider: profile.provider,
    model: profile.defaultModel || profile.model,
    models: profile.models,
    profileName: name,
  })
}

/**
 * Returns all registered model entries across all profiles,
 * tagged with their origin profile name.
 * Used by /model picker to surface a flat list of all models.
 */
export function getAllRegisteredModels(): Array<
  ModelEntry & { profileName: string; profileLabel: string }
> {
  const merged = getSettingsForSource('userSettings') || {}
  const profiles = merged.assistantProfiles || {}
  const result: Array<ModelEntry & { profileName: string; profileLabel: string }> = []

  for (const [name, profile] of Object.entries(profiles)) {
    const p = profile as any
    const profileLabel = p.name || name
    if (Array.isArray(p.models) && p.models.length > 0) {
      for (const m of p.models as ModelEntry[]) {
        result.push({ ...m, profileName: name, profileLabel })
      }
    } else if (p.model || p.defaultModel) {
      // Backward-compat: single model profile
      const modelId = p.defaultModel || p.model
      result.push({ id: modelId, profileName: name, profileLabel })
    }
  }

  return result
}
