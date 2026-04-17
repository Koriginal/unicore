import { homedir } from 'os'
import { join, dirname } from 'path'
import { getFsImplementation } from '../utils/fsOperations.js'
import { logForDebugging } from '../utils/debug.js'
import { getUniCoreConfigHomeDir } from '../utils/envUtils.js'
import { getGlobalUniCoreFile } from '../utils/env.js'
import { getCwd } from '../utils/cwd.js'

/**
 * 迁移全局 Claude 配置到 UniCore。
 * 包括 ~/.claude.json -> ~/.unicore.json 和 ~/.claude/ -> ~/.unicore/
 */
export function migrateGlobalClaudeToUniCore(): void {
  const fs = getFsImplementation()
  const home = homedir()

  // 1. 迁移全局配置文件 (~/.claude.json -> ~/.unicore.json)
  const legacyGlobalFile = join(home, '.claude.json')
  const newGlobalFile = getGlobalUniCoreFile()

  if (fs.existsSync(legacyGlobalFile) && !fs.existsSync(newGlobalFile)) {
    try {
      logForDebugging(`Migrating global config file: ${legacyGlobalFile} -> ${newGlobalFile}`)
      fs.mkdirSync(dirname(newGlobalFile))
      fs.renameSync(legacyGlobalFile, newGlobalFile)
    } catch (err) {
      logForDebugging(`Failed to migrate global config file: ${err}`, { level: 'error' })
    }
  }

  // 2. 迁移全局配置目录 (~/.claude/ -> ~/.unicore/)
  const legacyGlobalDir = join(home, '.claude')
  const newGlobalDir = getUniCoreConfigHomeDir()

  if (fs.existsSync(legacyGlobalDir) && !fs.existsSync(newGlobalDir)) {
    try {
      logForDebugging(`Migrating global config directory: ${legacyGlobalDir} -> ${newGlobalDir}`)
      fs.renameSync(legacyGlobalDir, newGlobalDir)
    } catch (err) {
      logForDebugging(`Failed to migrate global config directory: ${err}`, { level: 'error' })
    }
  }
}

/**
 * 迁移项目级 Claude 记忆文件到 UniCore。
 * 包括 CLAUDE.md -> UNICORE.md 和 UNICORE.local.md -> UNICORE.local.md
 */
export function migrateProjectClaudeToUniCore(): void {
  const fs = getFsImplementation()
  const cwd = getCwd()

  const mappings = [
    { old: 'CLAUDE.md', new: 'UNICORE.md' },
    { old: 'CLAUDE.local.md', new: 'UNICORE.local.md' },
  ]

  for (const mapping of mappings) {
    const oldPath = join(cwd, mapping.old)
    const newPath = join(cwd, mapping.new)

    if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
      try {
        logForDebugging(`Migrating project file: ${oldPath} -> ${newPath}`)
        fs.renameSync(oldPath, newPath)
      } catch (err) {
        logForDebugging(`Failed to migrate project file ${mapping.old}: ${err}`, { level: 'error' })
      }
    }
  }
}
