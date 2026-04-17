
import type { SDKMessage, SDKUserMessage, SDKResultMessage } from './coreTypes.js';

export type SDKSessionOptions = {
  model?: string;
  maxTurns?: number;
  dir?: string;
  forkSession?: boolean;
};

export interface SDKSession {
  sessionId: string;
  query(prompt: string): AsyncIterable<SDKMessage>;
  close(): Promise<void>;
}

export type InternalOptions = any;
export type Options = any;
export type Query = any;
export type InternalQuery = any;
export type AnyZodRawShape = any;
export type InferShape<T> = any;
export type ForkSessionOptions = any;
export type ForkSessionResult = any;
export type GetSessionInfoOptions = any;
export type GetSessionMessagesOptions = any;
export type ListSessionsOptions = any;
export type SessionMessage = any;
export type SessionMutationOptions = any;
export type McpSdkServerConfigWithInstance = any;
