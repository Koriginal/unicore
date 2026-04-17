const discovered = new Map<string, { url: string }>()

export function getDiscoveredRemoteSkill(slug: string): { url: string } | undefined {
  return discovered.get(slug)
}

export function setDiscoveredRemoteSkill(slug: string, url: string): void {
  discovered.set(slug, { url })
}

export function clearDiscoveredRemoteSkills(): void {
  discovered.clear()
}

export default {
  getDiscoveredRemoteSkill,
  setDiscoveredRemoteSkill,
  clearDiscoveredRemoteSkills,
}
