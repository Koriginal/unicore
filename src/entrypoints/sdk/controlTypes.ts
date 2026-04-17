import { z } from 'zod/v4'
import {
  ControlErrorResponseSchema,
  ControlResponseSchema,
  SDKControlCancelRequestSchema,
  SDKControlElicitationResponseSchema,
  SDKControlInitializeRequestSchema,
  SDKControlInitializeResponseSchema,
  SDKControlMcpSetServersResponseSchema,
  SDKControlPermissionRequestSchema,
  SDKControlReloadPluginsResponseSchema,
  SDKControlRequestInnerSchema,
  SDKControlRequestSchema,
  SDKControlResponseSchema,
  SDKKeepAliveMessageSchema,
  SDKUpdateEnvironmentVariablesMessageSchema,
  StdinMessageSchema,
  StdoutMessageSchema,
} from './controlSchemas.js'
import type { SDKMessage, SDKPartialAssistantMessage } from './coreTypes.js'

type EndSessionRequest = {
  subtype: 'end_session'
  reason?: string
}

type ChannelEnableRequest = {
  subtype: 'channel_enable'
  serverName: string
}

type McpAuthenticateRequest = {
  subtype: 'mcp_authenticate'
  serverName: string
}

type McpOauthCallbackUrlRequest = {
  subtype: 'mcp_oauth_callback_url'
  serverName: string
  callbackUrl: string
}

type UniCoreAuthenticateRequest = {
  subtype: 'unicore_authenticate'
  loginWithUniCoreAi?: boolean
}

type UniCoreOauthCallbackRequest = {
  subtype: 'unicore_oauth_callback'
  authorizationCode: string
  state: string
}

type UniCoreOauthWaitForCompletionRequest = {
  subtype: 'unicore_oauth_wait_for_completion'
}

type McpClearAuthRequest = {
  subtype: 'mcp_clear_auth'
  serverName: string
}

type GenerateSessionTitleRequest = {
  subtype: 'generate_session_title'
  description: string
  persist: boolean
}

type SideQuestionRequest = {
  subtype: 'side_question'
  question: string
}

type SetProactiveRequest = {
  subtype: 'set_proactive'
  enabled: boolean
}

type RemoteControlRequest = {
  subtype: 'remote_control'
  enabled: boolean
}

type ExtraSDKControlRequestInner =
  | EndSessionRequest
  | ChannelEnableRequest
  | McpAuthenticateRequest
  | McpOauthCallbackUrlRequest
  | UniCoreAuthenticateRequest
  | UniCoreOauthCallbackRequest
  | UniCoreOauthWaitForCompletionRequest
  | McpClearAuthRequest
  | GenerateSessionTitleRequest
  | SideQuestionRequest
  | SetProactiveRequest
  | RemoteControlRequest

export type SDKControlRequestInner =
  | z.infer<ReturnType<typeof SDKControlRequestInnerSchema>>
  | ExtraSDKControlRequestInner

export type SDKControlRequest = Omit<
  z.infer<ReturnType<typeof SDKControlRequestSchema>>,
  'request'
> & {
  request: SDKControlRequestInner
}

export type ControlResponse = {
  subtype: z.infer<ReturnType<typeof ControlResponseSchema>>['subtype']
  request_id: string
  response?: Record<string, unknown>
}

export type ControlErrorResponse = {
  subtype: z.infer<ReturnType<typeof ControlErrorResponseSchema>>['subtype']
  request_id: string
  error: string
  pending_permission_requests?: SDKControlRequest[]
}

export type SDKControlResponse = {
  type: z.infer<ReturnType<typeof SDKControlResponseSchema>>['type']
  response: ControlResponse | ControlErrorResponse
}

export type SDKControlCancelRequest = {
  type: z.infer<ReturnType<typeof SDKControlCancelRequestSchema>>['type']
  request_id: string
}

export type SDKKeepAliveMessage = z.infer<
  ReturnType<typeof SDKKeepAliveMessageSchema>
>
export type SDKUpdateEnvironmentVariablesMessage = {
  type: z.infer<
    ReturnType<typeof SDKUpdateEnvironmentVariablesMessageSchema>
  >['type']
  variables: Record<string, string>
}
export type SDKControlElicitationResponse = z.infer<
  ReturnType<typeof SDKControlElicitationResponseSchema>
>
export type SDKControlPermissionRequest = z.infer<
  ReturnType<typeof SDKControlPermissionRequestSchema>
>
export type SDKControlInitializeRequest = z.infer<
  ReturnType<typeof SDKControlInitializeRequestSchema>
>
export type SDKControlInitializeResponse = z.infer<
  ReturnType<typeof SDKControlInitializeResponseSchema>
>
export type SDKControlMcpSetServersResponse = z.infer<
  ReturnType<typeof SDKControlMcpSetServersResponseSchema>
>
export type SDKControlReloadPluginsResponse = z.infer<
  ReturnType<typeof SDKControlReloadPluginsResponseSchema>
>
export type { SDKPartialAssistantMessage }

export type StdoutMessage =
  | SDKMessage
  | SDKControlResponse
  | SDKControlRequest
  | SDKControlCancelRequest
  | SDKKeepAliveMessage

export type StdinMessage =
  | SDKMessage
  | SDKControlRequest
  | SDKControlResponse
  | SDKKeepAliveMessage
  | SDKUpdateEnvironmentVariablesMessage
