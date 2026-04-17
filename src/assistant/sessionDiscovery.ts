export type AssistantSession = {
  id: string
  title?: string
  updatedAt?: number
}

export async function discoverAssistantSessions(): Promise<AssistantSession[]> {
  return []
}

const sessionDiscovery = {
  discoverAssistantSessions,
}

export default sessionDiscovery
