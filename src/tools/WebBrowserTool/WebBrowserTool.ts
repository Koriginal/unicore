import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { z } from 'zod/v4'
import { findToolByName, buildTool, type ToolDef } from '../../Tool.js'
import { WebFetchTool } from '../WebFetchTool/WebFetchTool.js'

const inputSchema = z.strictObject({
  url: z.string().url(),
  prompt: z.string().optional(),
  open_panel: z.boolean().optional(),
})

type Input = z.infer<typeof inputSchema>
type Output = {
  ok: boolean
  url: string
  message: string
  delegatedTool: string
  raw?: unknown
}

export const WebBrowserTool = buildTool({
  name: 'WebBrowser',
  maxResultSizeChars: 100_000,
  isConcurrencySafe: () => true,
  isReadOnly: () => true,
  get inputSchema() {
    return inputSchema
  },
  async description(input: Input) {
    return `Open/fetch URL in web browser tool: ${input.url}`
  },
  async prompt() {
    return 'Fetch web content and keep browser panel state in sync.'
  },
  renderToolUseMessage(input: Input) {
    return input.url
  },
  mapToolResultToToolResultBlockParam(
    output: Output,
    toolUseID: string,
  ): ToolResultBlockParam {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: JSON.stringify(output, null, 2),
    }
  },
  async call(
    input,
    context,
    canUseTool,
    assistantMessage,
  ): Promise<{ data: Output }> {
    const fetchPrompt =
      input.prompt?.trim() ||
      'Summarize the page and extract actionable engineering-relevant points.'

    context.setAppState(prev => ({
      ...prev,
      bagelActive: true,
      bagelUrl: input.url,
      bagelPanelVisible: input.open_panel ?? true,
    }))

    const fetchTool = findToolByName(context.options.tools, WebFetchTool.name)
    if (!fetchTool) {
      return {
        data: {
          ok: false,
          url: input.url,
          message: 'WebFetch tool is unavailable, cannot fetch web content',
          delegatedTool: WebFetchTool.name,
        },
      }
    }

    const fetchResult = await fetchTool.call(
      {
        url: input.url,
        prompt: fetchPrompt,
      },
      context,
      canUseTool,
      assistantMessage,
    )

    return {
      data: {
        ok: true,
        url: input.url,
        message: 'web content fetched and browser panel state updated',
        delegatedTool: WebFetchTool.name,
        raw: (fetchResult as any)?.data,
      },
    }
  },
} satisfies ToolDef<typeof inputSchema, Output>)

export default WebBrowserTool
