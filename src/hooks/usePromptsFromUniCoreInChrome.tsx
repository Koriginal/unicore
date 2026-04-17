import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'
import { useEffect, useRef } from 'react'
import { z } from 'zod/v4'
import { callIdeRpc } from '../services/mcp/client.js'
import type {
  ConnectedMCPServer,
  MCPServerConnection,
} from '../services/mcp/types.js'
import type { PermissionMode } from '../types/permissions.js'
import {
  UNICORE_IN_CHROME_MCP_SERVER_NAME,
  isTrackedUniCoreInChromeTabId,
} from '../utils/uniCoreInChrome/common.js'
import { lazySchema } from '../utils/lazySchema.js'
import { logError } from '../utils/log.js'
import { enqueuePendingNotification } from '../utils/messageQueueManager.js'

const UniCoreInChromePromptNotificationSchema = lazySchema(() =>
  z.object({
    method: z.literal('notifications/message'),
    params: z.object({
      prompt: z.string(),
      image: z
        .object({
          type: z.literal('base64'),
          media_type: z.enum([
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
          ]),
          data: z.string(),
        })
        .optional(),
      tabId: z.number().optional(),
    }),
  }),
)

export function usePromptsFromUniCoreInChrome(
  mcpClients: MCPServerConnection[],
  toolPermissionMode: PermissionMode,
): void {
  const mcpClientRef = useRef<ConnectedMCPServer | undefined>(undefined)

  useEffect(() => {
    if ('external' !== 'ant') {
      return
    }

    const mcpClient = findChromeClient(mcpClients)
    if (mcpClientRef.current !== mcpClient) {
      mcpClientRef.current = mcpClient
    }

    if (!mcpClient) {
      return
    }

    mcpClient.client.setNotificationHandler(
      UniCoreInChromePromptNotificationSchema(),
      notification => {
        if (mcpClientRef.current !== mcpClient) {
          return
        }

        const { tabId, prompt, image } = notification.params
        if (
          typeof tabId !== 'number' ||
          !isTrackedUniCoreInChromeTabId(tabId)
        ) {
          return
        }

        try {
          if (image) {
            const contentBlocks: ContentBlockParam[] = [
              { type: 'text', text: prompt },
              {
                type: 'image',
                source: {
                  type: image.type,
                  media_type: image.media_type,
                  data: image.data,
                },
              },
            ]

            enqueuePendingNotification({
              value: contentBlocks,
              mode: 'prompt',
            })
          } else {
            enqueuePendingNotification({ value: prompt, mode: 'prompt' })
          }
        } catch (error) {
          logError(error as Error)
        }
      },
    )
  }, [mcpClients])

  useEffect(() => {
    const chromeClient = findChromeClient(mcpClients)
    if (!chromeClient) return

    const chromeMode =
      toolPermissionMode === 'bypassPermissions'
        ? 'skip_all_permission_checks'
        : 'ask'

    void callIdeRpc('set_permission_mode', { mode: chromeMode }, chromeClient)
  }, [mcpClients, toolPermissionMode])
}

function findChromeClient(
  clients: MCPServerConnection[],
): ConnectedMCPServer | undefined {
  return clients.find(
    (client): client is ConnectedMCPServer =>
      client.type === 'connected' &&
      client.name === UNICORE_IN_CHROME_MCP_SERVER_NAME,
  )
}
