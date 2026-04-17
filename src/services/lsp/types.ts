export type LspServerConfig = {
  command?: string
  args?: string[]
  env?: Record<string, string>
  initializationOptions?: Record<string, unknown>
  rootPatterns?: string[]
  filetypes?: string[]
  disabled?: boolean
  [key: string]: unknown
}

export type ScopedLspServerConfig = LspServerConfig & {
  scope?: 'user' | 'project' | 'local' | 'managed' | 'dynamic'
}
