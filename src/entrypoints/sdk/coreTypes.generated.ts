import { z } from 'zod/v4'
import type { NonNullableUsage } from './sdkUtilityTypes.js'
import {
  SDKAPIRetryMessageSchema,
  ModelUsageSchema,
  SDKAssistantMessageSchema,
  SDKAuthStatusMessageSchema,
  SDKCompactBoundaryMessageSchema,
  SDKFilesPersistedEventSchema,
  SDKHookProgressMessageSchema,
  SDKHookResponseMessageSchema,
  SDKHookStartedMessageSchema,
  SDKLocalCommandOutputMessageSchema,
  SDKPartialAssistantMessageSchema,
  SDKPostTurnSummaryMessageSchema,
  SDKPromptSuggestionMessageSchema,
  SDKRateLimitEventSchema,
  SDKResultErrorSchema,
  SDKResultMessageSchema,
  SDKResultSuccessSchema,
  SDKSessionInfoSchema,
  SDKSessionStateChangedMessageSchema,
  SDKStatusSchema,
  SDKStatusMessageSchema,
  SDKSystemMessageSchema,
  SDKTaskNotificationMessageSchema,
  SDKTaskProgressMessageSchema,
  SDKTaskStartedMessageSchema,
  SDKToolProgressMessageSchema,
  SDKToolUseSummaryMessageSchema,
  SDKElicitationCompleteMessageSchema,
  SDKStreamlinedTextMessageSchema,
  SDKStreamlinedToolUseSummaryMessageSchema,
  SDKUserMessageReplaySchema,
  SDKUserMessageSchema,
} from './coreSchemas.js'

export type ModelUsage = z.infer<ReturnType<typeof ModelUsageSchema>>

export type SDKUserMessage = z.infer<ReturnType<typeof SDKUserMessageSchema>>
  & {
    message: {
      role: 'user'
      content: string | unknown[]
    }
  }

export type SDKUserMessageReplay = z.infer<
  ReturnType<typeof SDKUserMessageReplaySchema>
> & {
  message: {
    role: 'user'
    content: string | unknown[]
  }
}

export type SDKAssistantMessage = z.infer<
  ReturnType<typeof SDKAssistantMessageSchema>
> & {
  message: {
    role: 'assistant'
    content: unknown[]
    id?: string
    model?: string
    stop_reason?: string | null
    usage?: unknown
    [key: string]: unknown
  }
}

export type SDKStatus = z.infer<ReturnType<typeof SDKStatusSchema>>

export type SDKSystemMessage = {
  type: 'system'
  subtype: string
  uuid: string
  session_id: string
  [key: string]: unknown
}

export type SDKResultSuccess = z.infer<
  ReturnType<typeof SDKResultSuccessSchema>
> & {
  usage: NonNullableUsage
}

export type SDKResultError = z.infer<ReturnType<typeof SDKResultErrorSchema>> & {
  usage: NonNullableUsage
}

export type SDKResultMessage = z.infer<
  ReturnType<typeof SDKResultMessageSchema>
>

export type SDKCompactBoundaryMessage = z.infer<
  ReturnType<typeof SDKCompactBoundaryMessageSchema>
>

export type SDKPartialAssistantMessage = z.infer<
  ReturnType<typeof SDKPartialAssistantMessageSchema>
> & {
  type: 'stream_event'
  session_id: string
  uuid: string
  parent_tool_use_id: string | null
  event: {
    type: string
    index?: number
    message?: { id: string; [key: string]: unknown }
    delta?: { type: string; text?: string; [key: string]: unknown }
    [key: string]: unknown
  }
}

export type SDKRateLimitEvent = z.infer<
  ReturnType<typeof SDKRateLimitEventSchema>
>

export type SDKStreamlinedTextMessage = z.infer<
  ReturnType<typeof SDKStreamlinedTextMessageSchema>
>

export type SDKStreamlinedToolUseSummaryMessage = z.infer<
  ReturnType<typeof SDKStreamlinedToolUseSummaryMessageSchema>
>

export type SDKPostTurnSummaryMessage = z.infer<
  ReturnType<typeof SDKPostTurnSummaryMessageSchema>
>

export type SDKAPIRetryMessage = z.infer<
  ReturnType<typeof SDKAPIRetryMessageSchema>
>

export type SDKLocalCommandOutputMessage = z.infer<
  ReturnType<typeof SDKLocalCommandOutputMessageSchema>
>

export type SDKHookStartedMessage = z.infer<
  ReturnType<typeof SDKHookStartedMessageSchema>
>

export type SDKHookProgressMessage = z.infer<
  ReturnType<typeof SDKHookProgressMessageSchema>
>

export type SDKHookResponseMessage = z.infer<
  ReturnType<typeof SDKHookResponseMessageSchema>
>

export type SDKToolProgressMessage = z.infer<
  ReturnType<typeof SDKToolProgressMessageSchema>
>

export type SDKAuthStatusMessage = z.infer<
  ReturnType<typeof SDKAuthStatusMessageSchema>
>

export type SDKFilesPersistedEvent = z.infer<
  ReturnType<typeof SDKFilesPersistedEventSchema>
>

export type SDKTaskNotificationMessage = z.infer<
  ReturnType<typeof SDKTaskNotificationMessageSchema>
>

export type SDKTaskStartedMessage = z.infer<
  ReturnType<typeof SDKTaskStartedMessageSchema>
>

export type SDKTaskProgressMessage = z.infer<
  ReturnType<typeof SDKTaskProgressMessageSchema>
>

export type SDKSessionStateChangedMessage = z.infer<
  ReturnType<typeof SDKSessionStateChangedMessageSchema>
>

export type SDKStatusMessage = z.infer<
  ReturnType<typeof SDKStatusMessageSchema>
>

export type SDKElicitationCompleteMessage = z.infer<
  ReturnType<typeof SDKElicitationCompleteMessageSchema>
>

export type SDKToolUseSummaryMessage = z.infer<
  ReturnType<typeof SDKToolUseSummaryMessageSchema>
>

export type SDKPromptSuggestionMessage = z.infer<
  ReturnType<typeof SDKPromptSuggestionMessageSchema>
>

export type SDKMessage =
  | SDKUserMessage
  | SDKUserMessageReplay
  | SDKAssistantMessage
  | SDKResultMessage
  | SDKSystemMessage
  | SDKPartialAssistantMessage
  | SDKCompactBoundaryMessage
  | SDKRateLimitEvent
  | SDKStreamlinedTextMessage
  | SDKStreamlinedToolUseSummaryMessage
  | SDKPostTurnSummaryMessage
  | SDKAPIRetryMessage
  | SDKLocalCommandOutputMessage
  | SDKHookStartedMessage
  | SDKHookProgressMessage
  | SDKHookResponseMessage
  | SDKToolProgressMessage
  | SDKAuthStatusMessage
  | SDKFilesPersistedEvent
  | SDKTaskNotificationMessage
  | SDKTaskStartedMessage
  | SDKTaskProgressMessage
  | SDKSessionStateChangedMessage
  | SDKStatusMessage
  | SDKElicitationCompleteMessage
  | SDKToolUseSummaryMessage
  | SDKPromptSuggestionMessage

export type SDKSessionInfo = z.infer<ReturnType<typeof SDKSessionInfoSchema>>
