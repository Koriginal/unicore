export type Workflow = 'unicore' | 'unicore-review'

export type Warning = {
  title: string
  message: string
  instructions: string[]
}

export type InstallGitHubAppStep =
  | 'check-gh'
  | 'warnings'
  | 'choose-repo'
  | 'check-existing-workflow'
  | 'select-workflows'
  | 'existing-workflow'
  | 'check-existing-secret'
  | 'api-key'
  | 'oauth-flow'
  | 'install-app'
  | 'creating'
  | 'success'
  | 'error'

export type State = {
  step: InstallGitHubAppStep
  selectedRepoName: string
  currentRepo: string
  useCurrentRepo: boolean
  apiKeyOrOAuthToken: string
  useExistingKey: boolean
  currentWorkflowInstallStep: number
  warnings: Warning[]
  secretExists: boolean
  secretName: string
  useExistingSecret: boolean
  workflowExists: boolean
  selectedWorkflows: Workflow[]
  selectedApiKeyOption: 'existing' | 'new' | 'oauth'
  authType: 'api_key' | 'oauth_token'
  workflowAction?: 'skip' | 'update'
  error?: string
  errorReason?: string
  errorInstructions?: string[]
}
