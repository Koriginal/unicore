import type { MCPServerConnection } from '../../services/mcp/types.js'
import type { LoadedPlugin, PluginError } from '../../types/plugin.js'

type PluginScope = 'user' | 'project' | 'local' | 'managed' | 'builtin'

export type PluginPendingToggle = 'will-enable' | 'will-disable'

export type UnifiedInstalledPluginItem = {
  type: 'plugin'
  id: string
  name: string
  description?: string
  marketplace: string
  scope: PluginScope
  isEnabled: boolean
  errorCount: number
  errors: PluginError[]
  plugin: LoadedPlugin
  pendingEnable?: boolean
  pendingUpdate?: boolean
  pendingToggle?: PluginPendingToggle
}

export type UnifiedFailedPluginItem = {
  type: 'failed-plugin'
  id: string
  name: string
  marketplace: string
  scope: Exclude<PluginScope, 'builtin'>
  errorCount: number
  errors: PluginError[]
}

export type UnifiedFlaggedPluginItem = {
  type: 'flagged-plugin'
  id: string
  name: string
  marketplace: string
  scope: 'flagged'
  reason: string
  text: string
  flaggedAt: string
}

export type UnifiedMcpItem = {
  type: 'mcp'
  id: string
  name: string
  description?: string
  scope: string
  status: MCPServerConnection['type']
  client: MCPServerConnection
  indented?: boolean
}

export type UnifiedInstalledItem =
  | UnifiedInstalledPluginItem
  | UnifiedFailedPluginItem
  | UnifiedFlaggedPluginItem
  | UnifiedMcpItem
