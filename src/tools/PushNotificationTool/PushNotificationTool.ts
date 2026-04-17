import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'

const PUSH_NOTIFICATION_TOOL_NAME = 'PushNotificationTool'
const DESCRIPTION =
  'Send an OS-level notification to the local terminal/desktop when available.'

const inputSchema = lazySchema(() =>
  z.strictObject({
    message: z.string().min(1).max(240).describe('Notification body text.'),
    notification_type: z
      .string()
      .max(80)
      .optional()
      .describe('Optional notification type tag (default: generic).'),
  }),
)

type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    delivered: z.boolean(),
    reason: z.string().optional(),
  }),
)

type OutputSchema = ReturnType<typeof outputSchema>
type Output = z.infer<OutputSchema>

export const PushNotificationTool = buildTool({
  name: PUSH_NOTIFICATION_TOOL_NAME,
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return DESCRIPTION
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  maxResultSizeChars: 8_000,
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  toAutoClassifierInput(input) {
    return `push-notification ${input.notification_type ?? 'generic'}`
  },
  renderToolUseMessage(input) {
    return `Sending notification: ${input.message}`
  },
  renderToolResultMessage(output) {
    return output.delivered
      ? 'Notification delivered'
      : `Notification not delivered${output.reason ? `: ${output.reason}` : ''}`
  },
  async call(input, context) {
    if (!context.sendOSNotification) {
      return {
        data: {
          delivered: false,
          reason: 'OS notification channel is unavailable in this runtime',
        } satisfies Output,
      }
    }

    await context.sendOSNotification({
      message: input.message,
      notificationType: input.notification_type ?? 'generic',
    })

    return {
      data: {
        delivered: true,
      } satisfies Output,
    }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: output.delivered
        ? 'Notification delivered.'
        : `Notification not delivered: ${output.reason ?? 'unknown reason'}`,
    }
  },
} satisfies ToolDef<InputSchema, Output>)

export default PushNotificationTool
