import { resolve } from 'path'
import { getFsImplementation } from './fsOperations.js'
import { getGlobalConfig, saveGlobalConfig } from './config.js'

export type RecentProjectEntry = {
  path: string
  lastUsedAt: number
}

const MAX_RECENT_PROJECTS = 20

function normalizeProjectPath(input: string): string {
  const fs = getFsImplementation()
  const resolved = resolve(input).normalize('NFC')
  try {
    return fs.realpathSync(resolved).normalize('NFC')
  } catch {
    return resolved
  }
}

function isProjectDir(path: string): boolean {
  const fs = getFsImplementation()
  try {
    return fs.statSync(path).isDirectory()
  } catch {
    return false
  }
}

function sanitizeRecentProjects(
  entries: Array<RecentProjectEntry | string> | undefined,
): RecentProjectEntry[] {
  if (!entries || entries.length === 0) return []
  const dedup = new Map<string, RecentProjectEntry>()

  for (const raw of entries) {
    const item: RecentProjectEntry =
      typeof raw === 'string'
        ? { path: raw, lastUsedAt: Date.now() }
        : {
            path: raw.path,
            lastUsedAt:
              Number.isFinite(raw.lastUsedAt) && raw.lastUsedAt > 0
                ? raw.lastUsedAt
                : Date.now(),
          }
    if (!item.path?.trim()) continue
    const normalized = normalizeProjectPath(item.path)
    if (!isProjectDir(normalized)) continue
    const prev = dedup.get(normalized)
    if (!prev || item.lastUsedAt > prev.lastUsedAt) {
      dedup.set(normalized, {
        path: normalized,
        lastUsedAt: item.lastUsedAt,
      })
    }
  }

  return [...dedup.values()]
    .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
    .slice(0, MAX_RECENT_PROJECTS)
}

export function getRecentProjects(limit = 8): RecentProjectEntry[] {
  const config = getGlobalConfig()
  const sanitized = sanitizeRecentProjects(config.recentProjects)
  return sanitized.slice(0, Math.max(1, limit))
}

export function recordRecentProject(path: string, lastUsedAt = Date.now()): void {
  const normalized = normalizeProjectPath(path)
  if (!isProjectDir(normalized)) return

  saveGlobalConfig(current => {
    const sanitized = sanitizeRecentProjects(current.recentProjects)
    const merged = [
      { path: normalized, lastUsedAt },
      ...sanitized.filter(item => item.path !== normalized),
    ].slice(0, MAX_RECENT_PROJECTS)

    const unchanged =
      (current.recentProjects || []).length === merged.length &&
      merged.every(
        (item, idx) =>
          current.recentProjects?.[idx]?.path === item.path &&
          current.recentProjects?.[idx]?.lastUsedAt === item.lastUsedAt,
      )
    if (unchanged) return current

    return {
      ...current,
      recentProjects: merged,
    }
  })
}

