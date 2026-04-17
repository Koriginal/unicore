import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { isEnvTruthy } from '../envUtils.js'

export type APIProvider = 'firstParty' | 'bedrock' | 'vertex' | 'foundry'
export type CompatProviderProfile =
  | 'anthropic-compatible'
  | 'openai-compatible'
  | 'openrouter'
  | 'ollama'
  | 'gemini'
  | 'vllm'
  | 'lmstudio'
  | 'litellm'
  | 'custom'

export function getAPIProvider(): APIProvider {
  return isEnvTruthy(process.env.UNICORE_CODE_USE_BEDROCK)
    ? 'bedrock'
    : isEnvTruthy(process.env.UNICORE_CODE_USE_VERTEX)
      ? 'vertex'
      : isEnvTruthy(process.env.UNICORE_CODE_USE_FOUNDRY)
        ? 'foundry'
        : 'firstParty'
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

export function getConfiguredUniAIBaseUrl(): string | undefined {
  const baseUrl = process.env.UNICORE_BASE_URL?.trim()
  if (baseUrl) return baseUrl
  const compatBaseUrl = process.env.UNICORE_COMPAT_BASE_URL?.trim()
  if (compatBaseUrl) return compatBaseUrl
  return undefined
}

export function getConfiguredUniAIBaseUrlSource():
  | 'UNICORE_BASE_URL'
  | 'UNICORE_COMPAT_BASE_URL'
  | undefined {
  if (process.env.UNICORE_BASE_URL?.trim()) return 'UNICORE_BASE_URL'
  if (process.env.UNICORE_COMPAT_BASE_URL?.trim())
    return 'UNICORE_COMPAT_BASE_URL'
  return undefined
}

/**
 * Check if UNICORE_BASE_URL is a first-party UniAI API URL.
 * Returns true if not set (default API) or points to api.anthropic.com
 * (or api-staging.anthropic.com for ant users).
 */
export function isFirstPartyUniAIBaseUrl(): boolean {
  const baseUrl = getConfiguredUniAIBaseUrl()
  if (!baseUrl) {
    return true
  }
  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.anthropic.com']
    if (process.env.USER_TYPE === 'ant') {
      allowedHosts.push('api-staging.anthropic.com')
    }
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}

function normalizeCompatProviderProfile(
  raw: string | undefined,
): CompatProviderProfile | undefined {
  if (!raw) return undefined
  const normalized = raw.trim().toLowerCase()
  switch (normalized) {
    case 'anthropic':
    case 'anthropic-compatible':
      return 'anthropic-compatible'
    case 'openai':
    case 'openai-compatible':
      return 'openai-compatible'
    case 'openrouter':
      return 'openrouter'
    case 'ollama':
      return 'ollama'
    case 'gemini':
    case 'google':
      return 'gemini'
    case 'vllm':
      return 'vllm'
    case 'lmstudio':
    case 'lm-studio':
      return 'lmstudio'
    case 'litellm':
      return 'litellm'
    default:
      return 'custom'
  }
}

export function getCompatProviderProfile():
  | CompatProviderProfile
  | undefined {
  return normalizeCompatProviderProfile(
    process.env.UNICORE_COMPAT_PROVIDER || process.env.UNICORE_MODEL_PROVIDER,
  )
}

export function renderCompatProviderProfile(
  profile: CompatProviderProfile,
): string {
  switch (profile) {
    case 'anthropic-compatible':
      return 'Anthropic-compatible'
    case 'openai-compatible':
      return 'OpenAI-compatible'
    case 'openrouter':
      return 'OpenRouter'
    case 'ollama':
      return 'Ollama'
    case 'gemini':
      return 'Gemini'
    case 'vllm':
      return 'vLLM'
    case 'lmstudio':
      return 'LM Studio'
    case 'litellm':
      return 'LiteLLM'
    case 'custom':
      return 'Custom'
  }
}

export function shouldUseBearerAuthForCompatGateway(): boolean {
  if (isEnvTruthy(process.env.UNICORE_COMPAT_USE_BEARER_AUTH)) {
    return true
  }
  const profile = getCompatProviderProfile()
  if (!profile) return false
  return (
    profile === 'openai-compatible' ||
    profile === 'openrouter' ||
    profile === 'ollama' ||
    profile === 'gemini' ||
    profile === 'vllm' ||
    profile === 'lmstudio'
  )
}
