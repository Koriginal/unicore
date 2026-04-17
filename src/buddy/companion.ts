import { getGlobalConfig, saveGlobalConfig } from '../utils/config.js'
import {
  type Companion,
  type CompanionBones,
  EYES,
  HATS,
  RARITIES,
  RARITY_WEIGHTS,
  type Rarity,
  SPECIES,
  STAT_NAMES,
  type StatName,
  type CompanionSoul,
  type StoredCompanion,
} from './types.js'

// Mulberry32 — tiny seeded PRNG, good enough for picking ducks
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(s: string): number {
  if (typeof Bun !== 'undefined') {
    return Number(BigInt(Bun.hash(s)) & 0xffffffffn)
  }
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!
}

function rollRarity(rng: () => number): Rarity {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0)
  let roll = rng() * total
  for (const rarity of RARITIES) {
    roll -= RARITY_WEIGHTS[rarity]
    if (roll < 0) return rarity
  }
  return 'common'
}

const RARITY_FLOOR: Record<Rarity, number> = {
  common: 5,
  uncommon: 15,
  rare: 25,
  epic: 35,
  legendary: 50,
}

// One peak stat, one dump stat, rest scattered. Rarity bumps the floor.
function rollStats(
  rng: () => number,
  rarity: Rarity,
): Record<StatName, number> {
  const floor = RARITY_FLOOR[rarity]
  const peak = pick(rng, STAT_NAMES)
  let dump = pick(rng, STAT_NAMES)
  while (dump === peak) dump = pick(rng, STAT_NAMES)

  const stats = {} as Record<StatName, number>
  for (const name of STAT_NAMES) {
    if (name === peak) {
      stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30))
    } else if (name === dump) {
      stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15))
    } else {
      stats[name] = floor + Math.floor(rng() * 40)
    }
  }
  return stats
}

const SALT = 'friend-2026-401'

export type Roll = {
  bones: CompanionBones
  inspirationSeed: number
}

function rollFrom(rng: () => number): Roll {
  let rarity = rollRarity(rng)
  const species = pick(rng, SPECIES)

  if (species === 'unicore') {
    // 强制赋予符合其地位的稀有度
    rarity = rarity === 'legendary' ? 'legendary' : 'epic'
    // 甚至可以在这里加入发光判断 if wanted
  }

  const bones: CompanionBones = {
    rarity,
    species,
    eye: pick(rng, EYES),
    hat: rarity === 'common' ? 'none' : pick(rng, HATS),
    shiny: rng() < 0.01,
    stats: rollStats(rng, rarity),
  }
  return { bones, inspirationSeed: Math.floor(rng() * 1e9) }
}

// Called from three hot paths (500ms sprite tick, per-keystroke PromptInput,
// per-turn observer) with the same userId → cache the deterministic result.
let rollCache: { key: string; value: Roll } | undefined
export function roll(userId: string): Roll {
  const key = userId + SALT
  if (rollCache?.key === key) return rollCache.value
  const value = rollFrom(mulberry32(hashString(key)))
  rollCache = { key, value }
  return value
}

export function rollWithSeed(seed: string): Roll {
  return rollFrom(mulberry32(hashString(seed)))
}

export function companionUserId(): string {
  const config = getGlobalConfig()
  return config.oauthAccount?.accountUuid ?? config.userID ?? 'anon'
}

// Regenerate bones from userId, merge with stored soul. Bones never persist
// so species renames and SPECIES-array edits can't break stored companions,
// and editing config.companion can't fake a rarity.
export function getCompanion(): Companion | undefined {
  const config = getGlobalConfig()
  
  // Migrate old companion if companions array missing
  if (config.companion && (!config.companions || config.companions.length === 0)) {
    saveGlobalConfig(cfg => ({
      ...cfg,
      companions: [cfg.companion!],
      activeCompanionIndex: 0
    }))
  }

  const all = getCompanions()
  if (all.length === 0) return undefined
  
  const index = config.activeCompanionIndex ?? 0
  const active = all[index] ?? all[0]!
  return active
}

export function getCompanions(): Companion[] {
  const config = getGlobalConfig()
  const list = config.companions || (config.companion ? [config.companion] : [])
  return list.map(stored => {
    const { bones } = stored.seed ? rollWithSeed(stored.seed) : roll(companionUserId())
    // ensure seed is carried over since stored might have it
    const res = { ...stored, ...bones }
    if (stored.seed) {
      res.seed = stored.seed
    }
    return res
  })
}

export function captureCompanion(soul: CompanionSoul, seed: string): void {
  saveGlobalConfig(cfg => {
    const companions = cfg.companions || (cfg.companion ? [cfg.companion] : [])
    const { bones } = rollWithSeed(seed)
    const newPet: StoredCompanion = {
      ...soul,
      seed,
      hatchedAt: Date.now(),
      level: 1,
      xp: 0,
      hp: (bones.stats.PATIENCE || 10) * 2 + 50, // Initial max HP
      sp: (bones.stats.WISDOM || 10) + 20,     // Initial max SP
    }
    return {
      ...cfg,
      companions: [...companions, newPet]
    }
  })
}

export function swapCompanion(index: number): boolean {
  const config = getGlobalConfig()
  const companions = config.companions || (config.companion ? [config.companion] : [])
  if (index >= 0 && index < companions.length) {
    saveGlobalConfig(cfg => ({ ...cfg, activeCompanionIndex: index }))
    return true
  }
  return false
}

export function gainXP(companion: Companion, amount: number): void {
  updateStoredCompanion(companion, target => {
    let currXp = target.xp ?? 0
    let currLevel = target.level ?? 1
    currXp += amount

    // Improved curve: 20, 40, 60... (Total XP needed grows more reasonably)
    const xpNeeded = (lv: number) => lv * 20 + 20
    
    if (amount > 0) {
      while (currXp >= xpNeeded(currLevel)) {
        currXp -= xpNeeded(currLevel)
        currLevel += 1
      }
    } else {
      // Handle XP loss (but don't de-level)
      currXp = Math.max(0, currXp + amount)
    }

    target.xp = currXp
    target.level = currLevel
  })
}

// 统一的伙伴状态更新包裹器
function updateStoredCompanion(companion: Companion, updater: (target: StoredCompanion) => void) {
  saveGlobalConfig(cfg => {
    const companions = [...(cfg.companions || (cfg.companion ? [cfg.companion] : []))]
    // Use hatchedAt + seed as a more stable unique identifier
    const index = companions.findIndex(c => c.hatchedAt === companion.hatchedAt && c.seed === companion.seed)
    if (index === -1) return cfg

    const target = { ...companions[index]! }
    updater(target)
    companions[index] = target

    return { ...cfg, companions }
  })
}

/**
 * 批量更新宠物状态，减少 saveGlobalConfig 调用次数
 */
export function updateCompanions(updater: (list: StoredCompanion[]) => void) {
  saveGlobalConfig(cfg => {
    const companions = [...(cfg.companions || (cfg.companion ? [cfg.companion] : []))]
    updater(companions)
    return { ...cfg, companions }
  })
}

export function renameCompanion(companion: Companion, newName: string): void {
  updateStoredCompanion(companion, target => {
    target.name = newName
  })
}

export function feedCompanion(companion: Companion): void {
  updateStoredCompanion(companion, target => {
    target.lastFedAt = Date.now()
    // Recovery 20 SP on feed
    const { bones } = companion.seed ? rollWithSeed(companion.seed) : roll(companionUserId())
    const maxSp = (bones.stats.WISDOM || 10) + 20
    target.sp = Math.min(maxSp, (target.sp ?? 0) + 20)
  })
}

export function updateExploreState(companion: Companion, timestamp?: number): void {
  updateStoredCompanion(companion, target => {
    target.exploreStartedAt = timestamp
  })
}

/** 
 * 放生指定索引宠物，若成功则返回放生的信息，同时若主宠不是自己则主宠获得经验。
 * 不能放生唯一的一只宠物。
 */
export function releaseCompanion(index: number): { released: CompanionSoul | null, newActiveIndex: number } {
  const config = getGlobalConfig()
  const companions = [...(config.companions || (config.companion ? [config.companion] : []))]
  
  if (companions.length <= 1) return { released: null, newActiveIndex: config.activeCompanionIndex ?? 0 }
  if (index < 0 || index >= companions.length) return { released: null, newActiveIndex: config.activeCompanionIndex ?? 0 }

  const released = companions[index]!
  companions.splice(index, 1)

  let newIndex = config.activeCompanionIndex ?? 0
  if (newIndex === index) {
    // 恰好放生的是带着的，重置为 0
    newIndex = 0
  } else if (newIndex > index) {
    newIndex -= 1 // 后面的补位提前了
  }

  saveGlobalConfig(cfg => ({ ...cfg, companions, activeCompanionIndex: newIndex }))
  return { released, newActiveIndex: newIndex }
}
