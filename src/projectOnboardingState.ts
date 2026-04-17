import memoize from 'lodash-es/memoize.js'
import { join } from 'path'
import { isEnvTruthy } from './utils/envUtils.js'
import {
  getAPIProvider,
  getConfiguredUniAIBaseUrl,
  isFirstPartyUniAIBaseUrl,
} from './utils/model/providers.js'
import {
  getCurrentProjectConfig,
  saveCurrentProjectConfig,
} from './utils/config.js'
import { getCwd } from './utils/cwd.js'
import { isDirEmpty } from './utils/file.js'
import { getFsImplementation } from './utils/fsOperations.js'

function isModelRouteConfigured(): boolean {
  const apiProvider = getAPIProvider()
  if (apiProvider !== 'firstParty') {
    return true
  }

  const baseUrl = getConfiguredUniAIBaseUrl()
  const hasGatewayApiKey = Boolean(
    process.env.UNICORE_API_KEY?.trim() || process.env.UNICORE_COMPAT_API_KEY?.trim(),
  )
  const hasBearerToken = Boolean(process.env.UNICORE_AUTH_TOKEN?.trim())

  if (baseUrl && !isFirstPartyUniAIBaseUrl()) {
    return hasGatewayApiKey || hasBearerToken
  }

  // In offline mode, first-party defaults are typically unavailable.
  // Require explicit gateway credentials/config to consider this complete.
  if (isEnvTruthy(process.env.UNICORE_CODE_OFFLINE)) {
    return false
  }

  return true
}

export type Step = {
  key: string
  text: string
  isComplete: boolean
  isCompletable: boolean
  isEnabled: boolean
}

export function getSteps(): Step[] {
  const hasUniCoreMd = getFsImplementation().existsSync(
    join(getCwd(), 'UNICORE.md'),
  )
  const isWorkspaceDirEmpty = isDirEmpty(getCwd())

  return [
    {
      key: 'workspace',
      text: '让 UniCore 创建新项目或克隆现有仓库',
      isComplete: false,
      isCompletable: true,
      isEnabled: isWorkspaceDirEmpty,
    },
    {
      key: 'unicoremd',
      text: '运行 /init 生成 UNICORE.md 项目协作规范',
      isComplete: hasUniCoreMd,
      isCompletable: true,
      isEnabled: !isWorkspaceDirEmpty,
    },
    {
      key: 'model-route',
      text: '运行 /setup 配置模型网关（持久化到 settings），再用 /status 验证',
      isComplete: isModelRouteConfigured(),
      isCompletable: true,
      isEnabled: true,
    },
  ]
}

export function isProjectOnboardingComplete(): boolean {
  return getSteps()
    .filter(({ isCompletable, isEnabled }) => isCompletable && isEnabled)
    .every(({ isComplete }) => isComplete)
}

export function maybeMarkProjectOnboardingComplete(): void {
  // Short-circuit on cached config — isProjectOnboardingComplete() hits
  // the filesystem, and REPL.tsx calls this on every prompt submit.
  if (getCurrentProjectConfig().hasCompletedProjectOnboarding) {
    return
  }
  if (isProjectOnboardingComplete()) {
    saveCurrentProjectConfig(current => ({
      ...current,
      hasCompletedProjectOnboarding: true,
    }))
  }
}

export const shouldShowProjectOnboarding = memoize((): boolean => {
  const projectConfig = getCurrentProjectConfig()
  // Short-circuit on cached config before isProjectOnboardingComplete()
  // hits the filesystem — this runs during first render.
  if (
    projectConfig.hasCompletedProjectOnboarding ||
    projectConfig.projectOnboardingSeenCount >= 4 ||
    process.env.IS_DEMO
  ) {
    return false
  }

  return !isProjectOnboardingComplete()
})

export function incrementProjectOnboardingSeenCount(): void {
  saveCurrentProjectConfig(current => ({
    ...current,
    projectOnboardingSeenCount: current.projectOnboardingSeenCount + 1,
  }))
}
