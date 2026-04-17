import type { QuerySource } from 'src/constants/querySource.js'
import type { PermissionMode } from 'src/utils/permissions/PermissionMode.js'
import { isEnvTruthy } from '../envUtils.js'
import { logForDebugging } from '../debug.js'
import {
  getDefaultOpusModel,
  getDefaultSonnetModel,
  getSmallFastModel,
} from './model.js'
import { checkOpus1mAccess, checkSonnet1mAccess } from './check1mAccess.js'
import { isModelAllowed } from './modelAllowlist.js'
import { getCompatProviderProfile } from './providers.js'

export type RoutedTaskKind =
  | 'plan'
  | 'review'
  | 'background'
  | 'coding'
export type RouterProfile = 'balanced' | 'speed' | 'quality' | 'cost'
export type RouterPolicyVersion = 'v1'
export type RouterProfileStrategy =
  | 'static'
  | 'adaptive-task'
  | 'adaptive-context'

export type RoutedModelDecision = {
  model: string
  task: RoutedTaskKind
  profile: RouterProfile
  profileStrategy: RouterProfileStrategy
  policyVersion: RouterPolicyVersion
  reason: string
  candidates: string[]
}

function classifyTask(
  permissionMode: PermissionMode,
  querySource: QuerySource,
): RoutedTaskKind {
  if (permissionMode === 'plan') return 'plan'

  const source = querySource.toLowerCase()
  if (
    source.includes('review') ||
    source.includes('verification') ||
    source.includes('ultraplan') ||
    source.includes('critique')
  ) {
    return 'review'
  }

  if (
    source === 'compact' ||
    source === 'session_memory' ||
    source.includes('summary') ||
    source.includes('title') ||
    source.includes('away')
  ) {
    return 'background'
  }

  return 'coding'
}

function getOverrideForTask(task: RoutedTaskKind): string | undefined {
  if (task === 'plan') {
    return process.env.UNICORE_MODEL_ROUTER_PLAN?.trim()
  }
  if (task === 'review') {
    return process.env.UNICORE_MODEL_ROUTER_REVIEW?.trim()
  }
  if (task === 'background') {
    return process.env.UNICORE_MODEL_ROUTER_BACKGROUND?.trim()
  }
  return process.env.UNICORE_MODEL_ROUTER_CODING?.trim()
}

function getCandidateOverridesForTask(task: RoutedTaskKind): string[] {
  const raw =
    task === 'plan'
      ? process.env.UNICORE_MODEL_ROUTER_PLAN_CANDIDATES
      : task === 'review'
        ? process.env.UNICORE_MODEL_ROUTER_REVIEW_CANDIDATES
        : task === 'background'
          ? process.env.UNICORE_MODEL_ROUTER_BACKGROUND_CANDIDATES
          : process.env.UNICORE_MODEL_ROUTER_CODING_CANDIDATES
  if (!raw) return []
  return raw
    .split(',')
    .map(candidate => candidate.trim())
    .filter(Boolean)
}

function has1mSuffix(model: string): boolean {
  return model.toLowerCase().includes('[1m]')
}

function supports1mForModel(model: string): boolean {
  const normalized = model.toLowerCase()
  if (!has1mSuffix(normalized)) return true
  if (normalized.includes('opus')) return checkOpus1mAccess()
  if (normalized.includes('sonnet')) return checkSonnet1mAccess()
  return true
}

function isModelUsable(model: string): boolean {
  return isModelAllowed(model) && supports1mForModel(model)
}

function uniq(items: Array<string | undefined>): string[] {
  const out: string[] = []
  for (const item of items) {
    if (!item) continue
    if (!out.includes(item)) out.push(item)
  }
  return out
}

function getRouterProfile(): RouterProfile {
  const raw = process.env.UNICORE_MODEL_ROUTER_PROFILE?.trim().toLowerCase()
  if (raw === 'speed' || raw === 'quality' || raw === 'cost') return raw
  return 'balanced'
}

function getRouterPolicyVersion(): RouterPolicyVersion {
  const raw =
    process.env.UNICORE_MODEL_ROUTER_POLICY_VERSION?.trim().toLowerCase() ??
    'v1'
  if (raw === 'v1') return 'v1'
  return 'v1'
}

function isAdaptiveRoutingEnabled(): boolean {
  return isEnvTruthy(process.env.UNICORE_MODEL_ROUTER_ADAPTIVE)
}

function getAdaptiveTokenThreshold(): number {
  const raw = Number(process.env.UNICORE_MODEL_ROUTER_ADAPTIVE_TOKEN_THRESHOLD)
  if (!Number.isFinite(raw) || raw <= 0) return 90_000
  return raw
}

function shouldDisableAdaptiveTaskForcing(): boolean {
  return isEnvTruthy(process.env.UNICORE_MODEL_ROUTER_DISABLE_TASK_FORCE)
}

function getEffectiveRouterProfile(
  task: RoutedTaskKind,
  estimatedInputTokens?: number,
): {
  profile: RouterProfile
  strategy: RouterProfileStrategy
} {
  const requested = getRouterProfile()
  if (!isAdaptiveRoutingEnabled()) {
    return { profile: requested, strategy: 'static' }
  }

  if (!shouldDisableAdaptiveTaskForcing()) {
    if (task === 'background') return { profile: 'speed', strategy: 'adaptive-task' }
    if (task === 'plan' || task === 'review') {
      return { profile: 'quality', strategy: 'adaptive-task' }
    }
  }
  if (
    typeof estimatedInputTokens === 'number' &&
    estimatedInputTokens >= getAdaptiveTokenThreshold()
  ) {
    return { profile: 'quality', strategy: 'adaptive-context' }
  }
  return { profile: requested, strategy: 'static' }
}

function reorderByProfile(
  candidates: string[],
  profile: RouterProfile,
): string[] {
  const score = (model: string): number => {
    const normalized = model.toLowerCase()
    const has1m = normalized.includes('[1m]')
    const isOpus = normalized.includes('opus')
    const isSonnet = normalized.includes('sonnet')
    const isHaiku = normalized.includes('haiku')
    if (profile === 'quality') {
      return (isOpus ? 40 : 0) + (has1m ? 20 : 0) + (isSonnet ? 10 : 0)
    }
    if (profile === 'speed') {
      return (isHaiku ? 40 : 0) + (isSonnet ? 15 : 0) - (has1m ? 10 : 0)
    }
    if (profile === 'cost') {
      return (isHaiku ? 50 : 0) + (isSonnet ? 20 : 0) - (isOpus ? 30 : 0)
    }
    // balanced
    return (isSonnet ? 20 : 0) + (isOpus ? 15 : 0) + (isHaiku ? 10 : 0)
  }
  return [...candidates].sort((a, b) => score(b) - score(a))
}

function getLongContextCandidates(): string[] {
  const raw = process.env.UNICORE_MODEL_ROUTER_LONG_CONTEXT_CANDIDATES
  if (raw?.trim()) {
    return raw
      .split(',')
      .map(candidate => candidate.trim())
      .filter(Boolean)
  }
  return [`${getDefaultOpusModel()}[1m]`, `${getDefaultSonnetModel()}[1m]`]
}

function getLongContextThreshold(): number {
  const raw = Number(process.env.UNICORE_MODEL_ROUTER_LONG_CONTEXT_THRESHOLD)
  if (!Number.isFinite(raw) || raw <= 0) return 120_000
  return raw
}

function buildCandidates(
  task: RoutedTaskKind,
  baseModel: string,
  profile: RouterProfile,
  estimatedInputTokens?: number,
): string[] {
  const overrideModel = getOverrideForTask(task)
  const candidateOverrides = getCandidateOverridesForTask(task)
  const longContextFirst =
    typeof estimatedInputTokens === 'number' &&
    estimatedInputTokens >= getLongContextThreshold()
      ? getLongContextCandidates()
      : []
  if (task === 'plan' || task === 'review') {
    return reorderByProfile(
      uniq([
      ...longContextFirst,
      ...candidateOverrides,
      overrideModel,
      getDefaultOpusModel(),
      getDefaultSonnetModel(),
      baseModel,
      ]),
      profile,
    )
  }
  if (task === 'background') {
    return reorderByProfile(
      uniq([
      ...candidateOverrides,
      overrideModel,
      getSmallFastModel(),
      getDefaultSonnetModel(),
      baseModel,
      ]),
      profile,
    )
  }
  return reorderByProfile(
    uniq([
    ...longContextFirst,
    ...candidateOverrides,
    overrideModel,
    baseModel,
    getDefaultSonnetModel(),
    ]),
    profile,
  )
}

export function isModelRouterEnabled(): boolean {
  const raw = process.env.UNICORE_MODEL_ROUTER_ENABLED
  if (!raw) {
    // For third-party/OpenAI-compatible gateways, default to the user's explicit
    // selected model to avoid routing into first-party model ids.
    return !getCompatProviderProfile()
  }
  return isEnvTruthy(raw)
}

export function routeModelForTask(params: {
  baseModel: string
  permissionMode: PermissionMode
  querySource: QuerySource
  estimatedInputTokens?: number
}): RoutedModelDecision {
  const { baseModel, permissionMode, querySource, estimatedInputTokens } =
    params
  const task = classifyTask(permissionMode, querySource)
  const { profile, strategy } = getEffectiveRouterProfile(
    task,
    estimatedInputTokens,
  )
  const policyVersion = getRouterPolicyVersion()

  if (!isModelRouterEnabled()) {
    return {
      model: baseModel,
      task,
      profile,
      profileStrategy: strategy,
      policyVersion,
      reason: 'router disabled',
      candidates: [baseModel],
    }
  }

  const candidates = buildCandidates(
    task,
    baseModel,
    profile,
    estimatedInputTokens,
  )
  for (const candidate of candidates) {
    if (isModelUsable(candidate)) {
      const isOverride = candidate === getOverrideForTask(task)
      return {
        model: candidate,
        task,
        profile,
        profileStrategy: strategy,
        policyVersion,
        reason: isOverride
          ? `override env for ${task}`
          : `${task} routed with profile=${profile} strategy=${strategy} and availability fallback${isAdaptiveRoutingEnabled() ? ' (adaptive)' : ''}`,
        candidates,
      }
    }
  }

  // Safety fallback: should rarely happen unless restrictions are very tight.
  return {
    model: baseModel,
    task,
    profile,
    profileStrategy: strategy,
    policyVersion,
    reason: 'all routed candidates unavailable; using base model',
    candidates,
  }
}

export function logModelRouteDecision(decision: RoutedModelDecision): void {
  logForDebugging(
    `[model-router] policy=${decision.policyVersion} task=${decision.task} profile=${decision.profile} strategy=${decision.profileStrategy} model=${decision.model} reason=${decision.reason} candidates=${decision.candidates.join(' -> ')}`,
  )
}
