import type {
  ConfigScope,
  MCPServerConnection,
  McpHTTPServerConfig,
  McpSSEServerConfig,
  McpStdioServerConfig,
  McpUniCoreAIProxyServerConfig,
} from '../../services/mcp/types.js'

type BaseServerInfo = {
  name: string
  client: MCPServerConnection
  scope: ConfigScope
}

export type StdioServerInfo = BaseServerInfo & {
  transport: 'stdio'
  config: McpStdioServerConfig
}

type RemoteServerInfo = BaseServerInfo & {
  isAuthenticated?: boolean
}

export type SSEServerInfo = RemoteServerInfo & {
  transport: 'sse'
  config: McpSSEServerConfig
}

export type HTTPServerInfo = RemoteServerInfo & {
  transport: 'http'
  config: McpHTTPServerConfig
}

export type UniCoreAIServerInfo = RemoteServerInfo & {
  transport: 'unicoreai-proxy'
  config: McpUniCoreAIProxyServerConfig
}

export type ServerInfo =
  | StdioServerInfo
  | SSEServerInfo
  | HTTPServerInfo
  | UniCoreAIServerInfo

export type AgentMcpServerInfo =
  | {
      name: string
      sourceAgents: string[]
      transport: 'stdio'
      command: string
      needsAuth: false
      isAuthenticated?: boolean
      url?: undefined
    }
  | {
      name: string
      sourceAgents: string[]
      transport: 'sse' | 'http' | 'ws'
      url: string
      needsAuth: boolean
      isAuthenticated?: boolean
      command?: undefined
    }

export type MCPServerRow = ServerInfo | AgentMcpServerInfo

export type MCPViewState =
  | { type: 'list'; defaultTab?: string }
  | { type: 'server-menu'; server: ServerInfo }
  | { type: 'agent-server-menu'; agentServer: AgentMcpServerInfo }
  | { type: 'server-tools'; server: ServerInfo }
  | {
      type: 'tool-detail'
      server: ServerInfo
      tool: unknown
      toolIndex?: number
    }
