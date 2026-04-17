export {
  getRateLimitErrorMessage,
  getRateLimitWarning,
  getUsingOverageText,
} from './rateLimitMessages.js'

type QuotaStatus = 'allowed' | 'allowed_warning' | 'rejected'

export type RateLimitType =
  | 'five_hour'
  | 'seven_day'
  | 'seven_day_opus'
  | 'seven_day_sonnet'
  | 'overage'

export type OverageDisabledReason =
  | 'overage_not_provisioned'
  | 'org_level_disabled'
  | 'org_level_disabled_until'
  | 'out_of_credits'
  | 'seat_tier_level_disabled'
  | 'member_level_disabled'
  | 'seat_tier_zero_credit_limit'
  | 'group_zero_credit_limit'
  | 'member_zero_credit_limit'
  | 'org_service_level_disabled'
  | 'org_service_zero_credit_limit'
  | 'no_limits_configured'
  | 'payment_failed'
  | 'manual_disable'
  | 'unknown'

export type UniCoreAILimits = {
  status: QuotaStatus
  unifiedRateLimitFallbackAvailable: boolean
  rateLimitType?: RateLimitType
  utilization?: number
  resetsAt?: number
  overageStatus?: QuotaStatus
  overageResetsAt?: number
  overageDisabledReason?: OverageDisabledReason
  isUsingOverage?: boolean
  surpassedThreshold?: string
}

type StatusChangeListener = (limits: UniCoreAILimits) => void

type RawUtilizationWindow = {
  utilization: number
  resets_at?: number
}

type RawUtilization = {
  five_hour?: RawUtilizationWindow
  seven_day?: RawUtilizationWindow
}

export let currentLimits: UniCoreAILimits = {
  status: 'allowed',
  unifiedRateLimitFallbackAvailable: false,
  isUsingOverage: false,
}

export const statusListeners: Set<StatusChangeListener> = new Set()

export function emitStatusChange(limits: UniCoreAILimits): void {
  currentLimits = { ...currentLimits, ...limits }
  for (const listener of statusListeners) {
    listener(currentLimits)
  }
}

export function getRawUtilization(): RawUtilization {
  const windows: RawUtilization = {}

  if (
    currentLimits.rateLimitType === 'five_hour' &&
    currentLimits.utilization !== undefined
  ) {
    windows.five_hour = {
      utilization: currentLimits.utilization,
      resets_at: currentLimits.resetsAt,
    }
  }

  if (
    (currentLimits.rateLimitType === 'seven_day' ||
      currentLimits.rateLimitType === 'seven_day_opus' ||
      currentLimits.rateLimitType === 'seven_day_sonnet') &&
    currentLimits.utilization !== undefined
  ) {
    windows.seven_day = {
      utilization: currentLimits.utilization,
      resets_at: currentLimits.resetsAt,
    }
  }

  return windows
}

export async function checkQuotaStatus(): Promise<void> {
  emitStatusChange(currentLimits)
}

function readHeader(
  headers: Headers | Map<string, string> | Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  if (!headers) return undefined
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(key) ?? undefined
  }
  if (headers instanceof Map) {
    return headers.get(key)
  }
  const value = (headers as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : undefined
}

function parseLimitsFromHeaders(
  headers: Headers | Map<string, string> | Record<string, unknown> | undefined,
): Partial<UniCoreAILimits> {
  const status =
    (readHeader(headers, 'uniai-ratelimit-unified-status') as QuotaStatus) ??
    undefined
  const rateLimitType =
    (readHeader(
      headers,
      'uniai-ratelimit-unified-representative-claim',
    ) as RateLimitType) ?? undefined
  const overageStatus =
    (readHeader(
      headers,
      'uniai-ratelimit-unified-overage-status',
    ) as QuotaStatus) ?? undefined
  const overageDisabledReason =
    (readHeader(
      headers,
      'uniai-ratelimit-unified-overage-disabled-reason',
    ) as OverageDisabledReason) ?? undefined

  const utilizationHeader = readHeader(headers, 'uniai-ratelimit-unified-utilization')
  const resetHeader = readHeader(headers, 'uniai-ratelimit-unified-reset')
  const overageResetHeader = readHeader(
    headers,
    'uniai-ratelimit-unified-overage-reset',
  )
  const surpassedThreshold = readHeader(
    headers,
    'uniai-ratelimit-unified-surpassed-threshold',
  )

  return {
    ...(status && { status }),
    ...(rateLimitType && { rateLimitType }),
    ...(overageStatus && { overageStatus }),
    ...(overageDisabledReason && { overageDisabledReason }),
    ...(utilizationHeader && { utilization: Number(utilizationHeader) }),
    ...(resetHeader && { resetsAt: Number(resetHeader) }),
    ...(overageResetHeader && { overageResetsAt: Number(overageResetHeader) }),
    ...(surpassedThreshold && { surpassedThreshold }),
  }
}

export function extractQuotaStatusFromHeaders(
  headers: Headers | Map<string, string> | Record<string, unknown> | undefined,
): void {
  const next = parseLimitsFromHeaders(headers)
  if (Object.keys(next).length === 0) return

  emitStatusChange({
    ...currentLimits,
    ...next,
    isUsingOverage: next.overageStatus
      ? next.overageStatus !== 'rejected' &&
        currentLimits.status === 'rejected'
      : currentLimits.isUsingOverage,
  })
}

export function extractQuotaStatusFromError(error: {
  headers?: Headers | Map<string, string> | Record<string, unknown>
}): void {
  extractQuotaStatusFromHeaders(error.headers)
}
