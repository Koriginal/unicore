export function stripCanonicalPrefix(name: string): string | null {
  return name.startsWith('_canonical_') ? name.slice('_canonical_'.length) : null
}

export async function loadRemoteSkill(slug: string, _url: string): Promise<{
  cacheHit: boolean
  latencyMs: number
  skillPath: string
  content: string
  fileCount: number
  totalBytes: number
  fetchMethod: 'offline-stub'
}> {
  return {
    cacheHit: true,
    latencyMs: 0,
    skillPath: `remote:${slug}`,
    content: `# Remote skill ${slug}\n\nUnavailable in this offline build.`,
    fileCount: 0,
    totalBytes: 0,
    fetchMethod: 'offline-stub',
  }
}

export default { stripCanonicalPrefix, loadRemoteSkill }
