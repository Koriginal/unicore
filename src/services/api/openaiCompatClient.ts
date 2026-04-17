import type UniAI from '@anthropic-ai/sdk'
import { randomUUID } from 'crypto'
import {
  getConfiguredUniAIBaseUrl,
  getCompatProviderProfile,
} from 'src/utils/model/providers.js'

type OpenAIChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | null
  tool_call_id?: string
  tool_calls?: Array<{
    id?: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
}

type CompatCreateParams = {
  model: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: Array<Record<string, unknown>>
  }>
  system?: string | Array<Record<string, unknown>>
  tools?: Array<Record<string, unknown>>
  tool_choice?: Record<string, unknown> | string
  max_tokens?: number
  temperature?: number
  stream?: boolean
}

type CompatCreateOptions = {
  signal?: AbortSignal
  headers?: Record<string, string>
}

function toOpenAIUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '')
  if (trimmed.endsWith('/chat/completions')) {
    return trimmed
  }
  if (trimmed.endsWith('/v1')) {
    return `${trimmed}/chat/completions`
  }
  return `${trimmed}/v1/chat/completions`
}

function normalizeText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

function contentBlocksToText(blocks: Array<Record<string, unknown>>): string {
  return blocks
    .map(block => {
      if ((block.type as string) === 'text') {
        return normalizeText(block.text)
      }
      if ((block.type as string) === 'tool_result') {
        return normalizeText(block.content)
      }
      return ''
    })
    .join('\n')
    .trim()
}

function stringifyToolResult(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function anthropicToOpenAIMessages(params: CompatCreateParams): OpenAIChatMessage[] {
  const out: OpenAIChatMessage[] = []

  if (typeof params.system === 'string' && params.system.trim()) {
    out.push({ role: 'system', content: params.system })
  } else if (Array.isArray(params.system)) {
    const text = params.system
      .map(block => normalizeText(block.text))
      .join('\n')
      .trim()
    if (text) out.push({ role: 'system', content: text })
  }

  for (const msg of params.messages || []) {
    const textContent = contentBlocksToText(msg.content)
    if (msg.role === 'user') {
      const toolResults = msg.content.filter(
        block => (block.type as string) === 'tool_result',
      )
      if (textContent) {
        out.push({ role: 'user', content: textContent })
      }
      for (const block of toolResults) {
        out.push({
          role: 'tool',
          tool_call_id: normalizeText(block.tool_use_id),
          content: stringifyToolResult(block.content),
        })
      }
      if (!textContent && toolResults.length === 0) {
        out.push({ role: 'user', content: '' })
      }
      continue
    }

    const assistantToolUses = msg.content.filter(
      block => (block.type as string) === 'tool_use',
    )
    const toolCalls =
      assistantToolUses.length > 0
        ? assistantToolUses.map(block => ({
            id: normalizeText(block.id) || randomUUID(),
            type: 'function' as const,
            function: {
              name: normalizeText(block.name),
              arguments:
                typeof block.input === 'string'
                  ? block.input
                  : JSON.stringify(block.input ?? {}),
            },
          }))
        : undefined
    out.push({
      role: 'assistant',
      content: textContent || null,
      ...(toolCalls ? { tool_calls: toolCalls } : {}),
    })
  }

  return out
}

function convertTools(
  tools: Array<Record<string, unknown>> | undefined,
): Array<Record<string, unknown>> | undefined {
  if (!tools || tools.length === 0) return undefined
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: normalizeText(tool.name),
      description: normalizeText(tool.description),
      parameters: (tool.input_schema as Record<string, unknown>) ?? {
        type: 'object',
        properties: {},
      },
    },
  }))
}

function convertToolChoice(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value
  const maybe = value as Record<string, unknown>
  if (maybe.type === 'tool' && typeof maybe.name === 'string') {
    return {
      type: 'function',
      function: { name: maybe.name },
    }
  }
  if (maybe.type === 'auto') return 'auto'
  if (maybe.type === 'any') return 'required'
  return undefined
}

function mapStopReason(reason: string | null | undefined): string | null {
  if (!reason) return 'end_turn'
  if (reason === 'tool_calls') return 'tool_use'
  if (reason === 'length') return 'max_tokens'
  return 'end_turn'
}

function toBetaUsage(usage: Record<string, unknown> | undefined) {
  const input = Number(usage?.prompt_tokens ?? 0)
  const output = Number(usage?.completion_tokens ?? 0)
  return {
    input_tokens: Number.isFinite(input) ? input : 0,
    output_tokens: Number.isFinite(output) ? output : 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  }
}

function toBetaMessage(
  model: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const choices = Array.isArray(payload.choices)
    ? (payload.choices as Array<Record<string, unknown>>)
    : []
  const first = choices[0] || {}
  const message = (first.message as Record<string, unknown>) || {}
  const content = normalizeText(message.content)
  const toolCalls = Array.isArray(message.tool_calls)
    ? (message.tool_calls as Array<Record<string, unknown>>)
    : []

  const blocks: Array<Record<string, unknown>> = []
  if (content) {
    blocks.push({ type: 'text', text: content })
  }
  for (const call of toolCalls) {
    const fn = (call.function as Record<string, unknown>) || {}
    blocks.push({
      type: 'tool_use',
      id: normalizeText(call.id) || randomUUID(),
      name: normalizeText(fn.name),
      input: (() => {
        const raw = normalizeText(fn.arguments)
        if (!raw) return {}
        try {
          return JSON.parse(raw)
        } catch {
          return { raw }
        }
      })(),
    })
  }

  return {
    id: normalizeText(payload.id) || `compat_${randomUUID()}`,
    type: 'message',
    role: 'assistant',
    model,
    content: blocks,
    stop_reason: mapStopReason(normalizeText(first.finish_reason)),
    stop_sequence: null,
    usage: toBetaUsage(payload.usage as Record<string, unknown> | undefined),
  }
}

function toSingleShotStreamEvents(message: Record<string, unknown>) {
  const usage = (message.usage as Record<string, unknown>) || {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  }
  const blocks = Array.isArray(message.content)
    ? (message.content as Array<Record<string, unknown>>)
    : []
  const events: Array<Record<string, unknown>> = [
    {
      type: 'message_start',
      message: {
        ...message,
        content: [],
      },
    },
  ]

  blocks.forEach((block, index) => {
    if ((block.type as string) === 'text') {
      events.push({
        type: 'content_block_start',
        index,
        content_block: { type: 'text', text: '' },
      })
      events.push({
        type: 'content_block_delta',
        index,
        delta: { type: 'text_delta', text: normalizeText(block.text) },
      })
      events.push({ type: 'content_block_stop', index })
      return
    }
    if ((block.type as string) === 'tool_use') {
      events.push({
        type: 'content_block_start',
        index,
        content_block: {
          type: 'tool_use',
          id: normalizeText(block.id),
          name: normalizeText(block.name),
          input: '',
        },
      })
      const partialJson = JSON.stringify(block.input ?? {})
      events.push({
        type: 'content_block_delta',
        index,
        delta: {
          type: 'input_json_delta',
          partial_json: partialJson,
        },
      })
      events.push({ type: 'content_block_stop', index })
    }
  })

  events.push({
    type: 'message_delta',
    delta: {
      stop_reason: message.stop_reason ?? 'end_turn',
      stop_sequence: null,
    },
    usage,
  })
  events.push({ type: 'message_stop' })
  return events
}

function roughCountTokens(params: CompatCreateParams): number {
  const raw = JSON.stringify(params.messages ?? [])
  return Math.max(1, Math.ceil(raw.length / 4))
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text()
    return text.slice(0, 1000)
  } catch {
    return ''
  }
}

export function createOpenAICompatClient(config: {
  defaultHeaders: Record<string, string>
  timeoutMs: number
  fetchImpl: typeof fetch
}): UniAI {
  const baseUrl = getConfiguredUniAIBaseUrl()
  if (!baseUrl) {
    throw new Error('UNICORE_BASE_URL is required for openai-compatible mode')
  }
  const endpoint = toOpenAIUrl(baseUrl)

  const compatClient = {
    beta: {
      messages: {
        create(params: CompatCreateParams, options?: CompatCreateOptions) {
          const requestPromise = (async () => {
            const controller = new AbortController()
            const timeout = setTimeout(
              () => controller.abort(),
              config.timeoutMs,
            )
            const onAbort = () => controller.abort()
            options?.signal?.addEventListener('abort', onAbort)
            try {
              const body: Record<string, unknown> = {
                model: params.model,
                messages: anthropicToOpenAIMessages(params),
                temperature: params.temperature,
                max_tokens: params.max_tokens,
                stream: false,
                ...(convertTools(params.tools) && {
                  tools: convertTools(params.tools),
                }),
                ...(convertToolChoice(params.tool_choice) && {
                  tool_choice: convertToolChoice(params.tool_choice),
                }),
              }

              const res = await config.fetchImpl(endpoint, {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  ...config.defaultHeaders,
                  ...(options?.headers || {}),
                },
                body: JSON.stringify(body),
                signal: controller.signal,
              })

              if (!res.ok) {
                const detail = await readErrorBody(res)
                throw new Error(
                  `OpenAI-compatible request failed: HTTP ${res.status} ${res.statusText}${detail ? ` - ${detail}` : ''}`,
                )
              }

              const payload = (await res.json()) as Record<string, unknown>
              const betaMessage = toBetaMessage(params.model, payload)
              const events = toSingleShotStreamEvents(betaMessage)
              const streamController = new AbortController()
              const data = {
                controller: streamController,
                async *[Symbol.asyncIterator]() {
                  for (const event of events) {
                    if (streamController.signal.aborted) break
                    yield event
                  }
                },
              }

              return {
                message: betaMessage,
                data,
                response: { headers: res.headers },
                request_id:
                  normalizeText(payload.id) || `compat_${randomUUID()}`,
              }
            } finally {
              clearTimeout(timeout)
              options?.signal?.removeEventListener('abort', onAbort)
            }
          })()

          const out = (
            params.stream
              ? requestPromise.then(r => r.data)
              : requestPromise.then(r => r.message)
          ) as Promise<unknown> & {
            withResponse: () => Promise<{
              data: unknown
              response: { headers: Headers }
              request_id: string
            }>
          }

          out.withResponse = async () => {
            const result = await requestPromise
            return {
              data: result.data,
              response: result.response,
              request_id: result.request_id,
            }
          }
          return out
        },

        async countTokens(params: CompatCreateParams) {
          return { input_tokens: roughCountTokens(params) }
        },
      },
    },
  }

  return compatClient as unknown as UniAI
}

export function shouldUseOpenAICompatTransport(): boolean {
  if (process.env.UNICORE_OPENAI_COMPAT_TRANSPORT === '1') {
    return true
  }
  const profile = getCompatProviderProfile()
  return (
    profile === 'openai-compatible' ||
    profile === 'openrouter' ||
    profile === 'ollama' ||
    profile === 'vllm' ||
    profile === 'lmstudio' ||
    profile === 'litellm'
  )
}
