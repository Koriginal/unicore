import { type UUID } from 'crypto';
import type { 
  ContentBlock, 
  ContentBlockParam, 
  BetaContentBlock 
} from '@anthropic-ai/sdk/resources/index.mjs';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface BaseMessage {
  uuid: UUID;
  timestamp: string;
}

export interface UserMessage extends BaseMessage {
  type: 'user';
  message: {
    role: 'user';
    content: string | ContentBlockParam[];
  };
  isMeta?: boolean;
  isVisibleInTranscriptOnly?: boolean;
  isVirtual?: boolean;
  isCompactSummary?: boolean;
  toolUseResult?: unknown;
  mcpMeta?: any;
  imagePasteIds?: number[];
  sourceToolAssistantUUID?: UUID;
  permissionMode?: any;
  summarizeMetadata?: any;
  origin?: any;
}

export interface AssistantMessage extends BaseMessage {
  type: 'assistant';
  message: {
    role: 'assistant';
    content: BetaContentBlock[];
    id: string;
    model: string;
    stop_reason: string | null;
    usage: any;
    container?: any;
    type?: 'message';
  };
  requestId?: string;
  apiError?: any;
  error?: any;
  errorDetails?: string;
  isApiErrorMessage?: boolean;
  isVirtual?: boolean;
  advisorModel?: string;
}

export interface SystemMessage extends BaseMessage {
  type: 'system';
  subtype: string;
  content: string | any;
}

export type Message = UserMessage | AssistantMessage | SystemMessage | any;

export type MessageOrigin =
  | { kind: 'human' }
  | { kind: 'system' }
  | { kind: 'proxy' }
  | { kind: 'channel'; server: string };

export type NormalizedUserMessage = UserMessage & {
  message: {
    content: [{ type: 'text'; text: string }];
  };
};

export type NormalizedAssistantMessage = AssistantMessage & {
  message: {
    content: BetaContentBlock[];
  };
};

export type NormalizedMessage =
  | (NormalizedUserMessage & {
      isMeta?: boolean;
      isVisibleInTranscriptOnly?: boolean;
      toolUseResult?: unknown;
      mcpMeta?: unknown;
    })
  | (NormalizedAssistantMessage & {
      isMeta?: boolean;
      isVisibleInTranscriptOnly?: boolean;
      toolUseResult?: unknown;
      mcpMeta?: unknown;
    });

// Add placeholders for other types imported in utils/messages.ts
export type AttachmentMessage = any;
export type ProgressMessage<P = any> = any;
export type TombstoneMessage = any;
export type StreamEvent = any;
export type StopHookInfo = any;
export type MessageLevel = 'info' | 'warning' | 'error';
export type SystemMessageLevel = MessageLevel;
export type PartialCompactDirection = 'forward' | 'backward';
export type SystemAgentsKilledMessage = any;
export type SystemAPIErrorMessage = any;
export type SystemApiMetricsMessage = any;
export type SystemAwaySummaryMessage = any;
export type SystemBridgeStatusMessage = any;
export type SystemCompactBoundaryMessage = any;
export type SystemInformationalMessage = any;
export type SystemLocalCommandMessage = any;
export type SystemMemorySavedMessage = any;
export type SystemMicrocompactBoundaryMessage = any;
export type SystemPermissionRetryMessage = any;
export type SystemScheduledTaskFireMessage = any;
export type SystemStopHookSummaryMessage = any;
export type SystemTurnDurationMessage = any;
export type ToolUseSummaryMessage = any;
export type RequestStartEvent = any;
export type HookResultMessage = any;
export type RenderableMessage = any;
