declare module 'react/compiler-runtime' {
  export const c: any
  const runtime: any
  export default runtime
}

declare module 'figures' {
  const figures: any
  export default figures
}

declare module 'qrcode' {
  export function toString(...args: any[]): Promise<string>
}

declare module 'semver' {
  export function coerce(...args: any[]): any
  export function gt(...args: any[]): boolean
  export function gte(...args: any[]): boolean
  export function lt(...args: any[]): boolean
  export function lte(...args: any[]): boolean
  export function satisfies(...args: any[]): boolean
  export function compare(...args: any[]): number
  const semver: {
    coerce: typeof coerce
    gt: typeof gt
    gte: typeof gte
    lt: typeof lt
    lte: typeof lte
    satisfies: typeof satisfies
    compare: typeof compare
  }
  export default semver
}

declare module 'tree-kill' {
  const treeKill: any
  export default treeKill
}

declare module 'diff' {
  export const diffLines: any
  const diff: any
  export = diff
}

declare module 'usehooks-ts' {
  export const useDebounceValue: any
  export const useInterval: any
  export const useLocalStorage: any
  export const useMediaQuery: any
  const hooks: any
  export default hooks
}

declare module 'fflate' {
  export const unzipSync: any
  export const zipSync: any
}

declare module 'undici' {
  export type Dispatcher = any
  export const Agent: any
  export namespace EnvHttpProxyAgent {
    export type Options = any
  }
  export const EnvHttpProxyAgent: any
  export const ProxyAgent: any
  export const fetch: any
  export const setGlobalDispatcher: any
}

declare module '@smithy/node-http-handler' {
  export const NodeHttpHandler: any
}

declare module '@aws-sdk/credential-provider-node' {
  export const defaultProvider: any
}

declare module '@anthropic-ai/mcpb' {
  export type McpbManifest = any
  export type McpbUserConfigurationOption = any
  export const McpbManifestSchema: any
  export const getMcpConfigForManifest: any
  const mcpb: any
  export default mcpb
}

declare module '@anthropic-ai/sdk' {
  export class APIError extends Error {
    status?: number
    error?: unknown
  }
  export class APIUserAbortError extends Error {}
  export class NotFoundError extends APIError {}
  export class APIConnectionError extends APIError {}
  export class AuthenticationError extends APIError {}
  export type ClientOptions = Record<string, unknown>
  export default class UniAIClient {
    constructor(options?: ClientOptions)
    beta: {
      messages: {
        create(...args: any[]): Promise<any>
      }
    }
    messages: {
      create(...args: any[]): Promise<any>
    }
  }
  export namespace UniAI {
    export type MessageParam = any
    export type TextBlockParam = any
    export type ImageBlockParam = any
    export type Tool = any
    export namespace Tool {
      export type InputSchema = Record<string, unknown>
    }
    export type ToolChoice = any
    export namespace Beta {
      export namespace Messages {
        export type BetaMessage = any
        export type BetaMessageParam = any
        export type BetaJSONOutputFormat = any
        export type BetaThinkingConfigParam = any
        export type BetaToolUnion = any
        export type BetaToolUseBlockParam = any
      }
    }
  }
}

declare module '@anthropic-ai/sdk/error' {
  export { APIError, NotFoundError, APIConnectionError, AuthenticationError } from '@anthropic-ai/sdk'
}

declare module '@anthropic-ai/claude-agent-sdk' {
  export type PermissionMode = any
  const sdk: any
  export default sdk
}

declare module '@anthropic-ai/sandbox-runtime' {
  const runtime: any
  export default runtime
}

declare module '@ant/unicore-for-chrome-mcp' {
  export type UniCoreForChromeContext = any
  export type Logger = any
  export type PermissionMode = any
  export const BROWSER_TOOLS: Array<{ name: string; [key: string]: any }>
  export function createUniCoreForChromeMcpServer(...args: any[]): any
  const mod: any
  export default mod
}

declare module '@anthropic-ai/sdk/resources' {
  export type ContentBlock = any
  export type ContentBlockParam = any
  export type BetaContentBlock = any
  export type TextBlockParam = any
  export type ToolUseBlock = any
  export type ToolUseBlockParam = any
  export type ToolResultBlockParam = any
  export type ThinkingBlock = any
  export type ThinkingBlockParam = any
  export type Base64ImageSource = any
  export type ImageBlockParam = any
}

declare module '@anthropic-ai/sdk/resources/index.mjs' {
  export type ContentBlock = any
  export type ContentBlockParam = any
  export type BetaContentBlock = any
  export type TextBlockParam = any
  export type ToolUseBlock = any
  export type ToolUseBlockParam = any
  export type ToolResultBlockParam = any
  export type ThinkingBlock = any
  export type ThinkingBlockParam = any
  export type Base64ImageSource = any
  export type ImageBlockParam = any
}

declare module '@anthropic-ai/sdk/resources/messages.mjs' {
  export type ContentBlockParam = any
  export type TextBlockParam = any
  export type ToolResultBlockParam = any
  export type Base64ImageSource = any
  export type ImageBlockParam = any
}

declare module '@anthropic-ai/sdk/resources/messages.js' {
  export type ContentBlockParam = any
  export type TextBlockParam = any
  export type ToolResultBlockParam = any
}

declare module '@anthropic-ai/sdk/resources/messages/messages.mjs' {
  export type ToolResultBlockParam = any
}

declare module '@anthropic-ai/sdk/resources/beta/messages.js' {
  export type BetaToolUnion = any
  export type BetaContentBlock = any
}

declare module '@anthropic-ai/sdk/resources/beta/messages/messages.mjs' {
  export type BetaUsage = any
  export type BetaMessageParam = any
  export type BetaMessageStreamParams = any
  export type BetaTool = any
  export type BetaToolUnion = any
  export type BetaContentBlock = any
  export type BetaToolUseBlock = any
}

declare module '*types/tools.js' {
  export type SdkWorkflowProgress = any
  export type ShellProgress = any
}

declare module '*constants/querySource.js' {
  export type QuerySource = any
}

declare module '*types/messageQueueTypes.js' {
  export type QueueOperationMessage = any
}

declare module '*services/contextCollapse/persist.js' {
  export const persistCollapsedContext: any
}

declare module '*memdir/memoryShapeTelemetry.js' {
  export const recordMemoryShapeTelemetry: any
}

declare module '*secureStorage/types.js' {
  export type SecureStorage = any
  export type SecureStorageInitResult = any
}

declare module '*postCommitAttribution.js' {
  export const getPostCommitAttribution: any
  export const installPrepareCommitMsgHook: any
}

declare module '*assistant/index.js' {
  export const isAssistantMode: any
  const assistant: any
  export default assistant
}

declare module '*proactive/index.js' {
  export const isProactiveActive: any
  export const activateProactive: any
  export const deactivateProactive: any
  export const isProactivePaused: any
  const proactive: any
  export default proactive
}

declare module '*commands/workflows/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/autofix-pr/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/backfill-sessions/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/good-unicore/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/issue/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/ctx_viz/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/break-cache/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/onboarding/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/share/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/teleport/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/bughunter/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/mock-limits/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/summary/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/reset-limits/index.js' {
  const mod: any
  export const resetLimits: any
  export const resetLimitsNonInteractive: any
  export default mod
}

declare module '*commands/ant-trace/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/perf-issue/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/env/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/oauth-refresh/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/debug-tool-call/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/peers/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/fork/index.js' {
  const mod: any
  export default mod
}

declare module '*commands/buddy/index.js' {
  const mod: any
  export default mod
}

declare module '*services/skillSearch/localSearch.js' {
  export const clearSkillIndexCache: any
  const mod: any
  export default mod
}

declare module '*tools/WorkflowTool/createWorkflowCommand.js' {
  export const createWorkflowCommand: any
  export const getWorkflowCommands: any
}



declare module '*utils/attributionHooks.js' {
  export const clearAttributionCaches: any
  const mod: any
  export default mod
}

declare module '*services/compact/reactiveCompact.js' {
  export const isReactiveOnlyMode: any
  export const reactiveCompactOnPromptTooLong: any
  const mod: any
  export default mod
}

declare module '*services/contextCollapse/operations.js' {
  export const projectView: any
  const mod: any
  export default mod
}

declare module '*services/contextCollapse/index.js' {
  export const getStats: any
  export const isContextCollapseEnabled: any
  const mod: any
  export default mod
}

declare module '*memdir/memoryShapeTelemetry.js' {
  export const recordMemoryShapeTelemetry: any
  export const logMemoryWriteShape: any
}

declare module '*services/contextCollapse/persist.js' {
  export const persistCollapsedContext: any
  export const restoreFromEntries: any
}

declare module '@anthropic-ai/sandbox-runtime' {
  export type FsReadRestrictionConfig = any
  export type FsWriteRestrictionConfig = any
  export type IgnoreViolationsConfig = any
  export type NetworkHostPattern = any
  export type NetworkRestrictionConfig = any
  export type SandboxAskCallback = any
  export type SandboxDependencyCheck = any
  export type SandboxRuntimeConfig = any
  export type SandboxViolationEvent = any
  export type SandboxViolationStore = any
  export const SandboxRuntimeConfigSchema: any
  export const SandboxViolationStore: any
  export const SandboxManager: {
    checkDependencies(...args: any[]): any
    isSupportedPlatform(...args: any[]): boolean
    wrapWithSandbox(...args: any[]): Promise<string>
    initialize(...args: any[]): Promise<void>
    updateConfig(...args: any[]): void
    reset(...args: any[]): Promise<void>
    getFsReadConfig(...args: any[]): any
    getFsWriteConfig(...args: any[]): any
    getNetworkRestrictionConfig(...args: any[]): any
    getIgnoreViolations(...args: any[]): any
    getAllowUnixSockets(...args: any[]): any
    getAllowLocalBinding(...args: any[]): any
    getEnableWeakerNestedSandbox(...args: any[]): any
    getProxyPort(...args: any[]): any
    getSocksProxyPort(...args: any[]): any
    getLinuxHttpSocketPath(...args: any[]): any
    getLinuxSocksSocketPath(...args: any[]): any
    waitForNetworkInitialization(...args: any[]): Promise<boolean>
    getSandboxViolationStore(...args: any[]): any
    annotateStderrWithSandboxFailures(...args: any[]): string
    cleanupAfterCommand(...args: any[]): void
  }
  const runtime: any
  export default runtime
}
