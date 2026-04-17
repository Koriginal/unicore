
import type { AnyZodRawShape } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface SdkMcpToolDefinition<Schema extends AnyZodRawShape = any> {
  name: string;
  description: string;
  inputSchema: Schema;
  handler: (args: any, extra: any) => Promise<CallToolResult>;
}
