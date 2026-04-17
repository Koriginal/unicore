export function sanitizeInboundWebhookContent(content: string): string {
  // Keep XML structure, but strip obvious inline script/style blocks from
  // bridged webhook payloads to avoid accidental terminal noise/injection.
  return content
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .trim()
}

export default { sanitizeInboundWebhookContent }
