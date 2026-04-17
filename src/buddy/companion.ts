import { getGlobalConfig, saveGlobalConfig } from '../utils/config.js'
import {
  type Companion,
  type CompanionBones,
  type CompanionInteractionStats,
  COMPANION_TITLE_IDS,
  type CompanionTitleId,
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
const HP_RECOVERY_INTERVAL_MS = 30 * 1000
const SP_RECOVERY_INTERVAL_MS = 45 * 1000
const HP_RECOVERY_PER_TICK = 1
const SP_RECOVERY_PER_TICK = 1

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
  
  let anyChanged = false
  const now = Date.now()

  const result = list.map(stored => {
    const { bones: rolledBones } = stored.seed ? rollWithSeed(stored.seed) : roll(companionUserId())
    const bones = stored.fusedBones ?? rolledBones
    
    // 恢复逻辑
    const lastUpdate = stored.lastUpdatedAt || stored.hatchedAt
    const elapsedMs = now - lastUpdate
    
    const maxHp = (bones.stats.PATIENCE || 10) * 2 + 50
    const maxSp = (bones.stats.WISDOM || 10) + 20

    let hp = stored.hp ?? maxHp
    let sp = stored.sp ?? maxSp
    let changed = false

    // HP 恢复: 每 1 分钟恢复 1 点
    const hpGain = Math.floor(elapsedMs / HP_RECOVERY_INTERVAL_MS) * HP_RECOVERY_PER_TICK
    if (hpGain > 0 && hp < maxHp) {
      hp = Math.min(maxHp, hp + hpGain)
      changed = true
    }

    // SP 恢复: 每 2 分钟恢复 1 点
    const spGain = Math.floor(elapsedMs / SP_RECOVERY_INTERVAL_MS) * SP_RECOVERY_PER_TICK
    if (spGain > 0 && sp < maxSp) {
      sp = Math.min(maxSp, sp + spGain)
      changed = true
    }

    const updatedStored = { ...stored, hp, sp }
    if (changed) {
      updatedStored.lastUpdatedAt = now
      anyChanged = true
    }

    const res = { ...updatedStored, ...bones }
    if (stored.seed) {
      res.seed = stored.seed
    }
    return res
  })

  // 如果有数值变动，静默存回配置
  if (anyChanged) {
    saveGlobalConfig(cfg => ({
      ...cfg,
      companions: result.map(c => {
        // 剥离运行时生成的 bones 属性，只保存持久化字段
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { rarity, species, eye, hat, shiny, stats, ...storedPart } = c
        return storedPart as StoredCompanion
      })
    }))
  }

  return result
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
      lastUpdatedAt: Date.now()
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
    const beforeHp = target.hp
    const beforeSp = target.sp
    updater(target)
    // Recovery baseline should only move when HP/SP actually changed.
    if (target.hp !== beforeHp || target.sp !== beforeSp) {
      target.lastUpdatedAt = Date.now()
    }
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
    const before = companions.map(p => ({ hp: p.hp, sp: p.sp }))
    updater(companions)
    const now = Date.now()
    companions.forEach((p, i) => {
      const prev = before[i]
      if (!prev) return
      if (p.hp !== prev.hp || p.sp !== prev.sp) {
        p.lastUpdatedAt = now
      }
    })
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

export type CompanionInsightKind = 'coding' | 'thinking' | 'question'
export type CompanionInsightResult = {
  reaction: string
  newlyUnlockedTitles?: CompanionTitleId[]
}

type TitleRequirement = {
  coding?: number
  thinking?: number
  question?: number
  total?: number
  diversity?: number
}

export type CompanionTitleDefinition = {
  id: CompanionTitleId
  tier: 1 | 2 | 3 | 4
  requirement?: TitleRequirement
  drop?: {
    kinds: CompanionInsightKind[]
    weight: number
    minCoding?: number
    minThinking?: number
    minQuestion?: number
    minTotal?: number
  }
}

export const COMPANION_TITLE_DEFINITIONS: Record<
  CompanionTitleId,
  CompanionTitleDefinition
> = {
  syntax_sniffer: {
    id: 'syntax_sniffer',
    tier: 1,
    requirement: { coding: 8 },
  },
  flow_channeler: {
    id: 'flow_channeler',
    tier: 1,
    requirement: { thinking: 6 },
  },
  question_hunter: {
    id: 'question_hunter',
    tier: 1,
    requirement: { question: 5 },
  },
  pairing_oracle: {
    id: 'pairing_oracle',
    tier: 1,
    requirement: { total: 20 },
  },
  bug_trapper: {
    id: 'bug_trapper',
    tier: 2,
    requirement: { coding: 18, question: 10 },
  },
  mind_gardener: {
    id: 'mind_gardener',
    tier: 2,
    requirement: { thinking: 16, total: 35 },
  },
  architecture_owl: {
    id: 'architecture_owl',
    tier: 3,
    requirement: { coding: 12, thinking: 12, question: 12 },
  },
  soul_partner: {
    id: 'soul_partner',
    tier: 3,
    requirement: { total: 60, diversity: 3 },
  },
  stack_trace_diver: {
    id: 'stack_trace_diver',
    tier: 2,
    drop: { kinds: ['coding', 'question'], weight: 9, minTotal: 8 },
  },
  lint_whisperer: {
    id: 'lint_whisperer',
    tier: 1,
    drop: { kinds: ['coding'], weight: 12, minCoding: 4 },
  },
  merge_conflict_tamer: {
    id: 'merge_conflict_tamer',
    tier: 2,
    drop: { kinds: ['coding', 'question'], weight: 8, minCoding: 10 },
  },
  breakpoint_ranger: {
    id: 'breakpoint_ranger',
    tier: 2,
    drop: { kinds: ['coding', 'thinking'], weight: 8, minCoding: 9 },
  },
  refactor_ritualist: {
    id: 'refactor_ritualist',
    tier: 3,
    drop: { kinds: ['coding'], weight: 5, minCoding: 16, minTotal: 20 },
  },
  null_guardian: {
    id: 'null_guardian',
    tier: 2,
    drop: { kinds: ['question'], weight: 9, minQuestion: 6 },
  },
  cache_alchemist: {
    id: 'cache_alchemist',
    tier: 3,
    drop: { kinds: ['thinking', 'coding'], weight: 6, minThinking: 8, minTotal: 18 },
  },
  commit_bard: {
    id: 'commit_bard',
    tier: 1,
    drop: { kinds: ['coding', 'thinking'], weight: 10, minTotal: 6 },
  },
  rubber_duck_archmage: {
    id: 'rubber_duck_archmage',
    tier: 4,
    drop: { kinds: ['thinking', 'question'], weight: 3, minThinking: 14, minQuestion: 10, minTotal: 30 },
  },
  semicolon_sorcerer: {
    id: 'semicolon_sorcerer',
    tier: 1,
    drop: { kinds: ['coding'], weight: 11, minCoding: 5 },
  },
}

const CODING_IDEAS = [
  '这段逻辑也许能再拆一下？',
  '我闻到了重复代码的味道。',
  '这里加个小守卫条件会更稳。',
  '这个命名可以更语义化一点。',
]

const THINKING_IDEAS = [
  '先定边界，再写实现会更快。',
  '我们要不要先列失败路径？',
  '如果反过来设计数据结构呢？',
  '这一步像是该做个小实验。',
]

const QUESTION_IDEAS = [
  '这里最坏情况会发生什么？',
  '这个假设真的总是成立吗？',
  '如果输入为空会怎样？',
  '这个分支需要单测兜底吗？',
]

const INSIGHT_COOLDOWNS: Record<CompanionInsightKind, number> = {
  coding: 15_000,
  thinking: 30_000,
  question: 12_000,
}

function randomLine(lines: readonly string[]): string {
  return lines[Math.floor(Math.random() * lines.length)]!
}

function normalizeTitles(titles: CompanionTitleId[] | undefined): CompanionTitleId[] {
  return (titles ?? []).filter((title): title is CompanionTitleId =>
    (COMPANION_TITLE_IDS as readonly string[]).includes(title),
  )
}

function getStatsOrDefault(stats: CompanionInteractionStats | undefined): Required<CompanionInteractionStats> {
  return {
    codingIdeas: stats?.codingIdeas ?? 0,
    thinkingIdeas: stats?.thinkingIdeas ?? 0,
    questionIdeas: stats?.questionIdeas ?? 0,
    totalIdeas: stats?.totalIdeas ?? 0,
  }
}

function diversityScore(stats: Required<CompanionInteractionStats>): number {
  let score = 0
  if (stats.codingIdeas > 0) score += 1
  if (stats.thinkingIdeas > 0) score += 1
  if (stats.questionIdeas > 0) score += 1
  return score
}

function isRequirementMet(
  requirement: TitleRequirement,
  stats: Required<CompanionInteractionStats>,
): boolean {
  const diversity = diversityScore(stats)
  return (
    (requirement.coding === undefined || stats.codingIdeas >= requirement.coding) &&
    (requirement.thinking === undefined || stats.thinkingIdeas >= requirement.thinking) &&
    (requirement.question === undefined || stats.questionIdeas >= requirement.question) &&
    (requirement.total === undefined || stats.totalIdeas >= requirement.total) &&
    (requirement.diversity === undefined || diversity >= requirement.diversity)
  )
}

function isDropEligible(
  def: CompanionTitleDefinition,
  kind: CompanionInsightKind,
  stats: Required<CompanionInteractionStats>,
): boolean {
  if (!def.drop) return false
  if (!def.drop.kinds.includes(kind)) return false
  if (def.drop.minCoding !== undefined && stats.codingIdeas < def.drop.minCoding) return false
  if (def.drop.minThinking !== undefined && stats.thinkingIdeas < def.drop.minThinking) return false
  if (def.drop.minQuestion !== undefined && stats.questionIdeas < def.drop.minQuestion) return false
  if (def.drop.minTotal !== undefined && stats.totalIdeas < def.drop.minTotal) return false
  return true
}

function requirementCompletion(
  requirement: TitleRequirement,
  stats: Required<CompanionInteractionStats>,
): number {
  const ratios: number[] = []
  const diversity = diversityScore(stats)
  if (requirement.coding !== undefined) ratios.push(Math.min(1, stats.codingIdeas / requirement.coding))
  if (requirement.thinking !== undefined) ratios.push(Math.min(1, stats.thinkingIdeas / requirement.thinking))
  if (requirement.question !== undefined) ratios.push(Math.min(1, stats.questionIdeas / requirement.question))
  if (requirement.total !== undefined) ratios.push(Math.min(1, stats.totalIdeas / requirement.total))
  if (requirement.diversity !== undefined) ratios.push(Math.min(1, diversity / requirement.diversity))
  if (ratios.length === 0) return 1
  return Math.min(...ratios)
}

function weightedPick<T extends { weight: number }>(items: T[]): T | undefined {
  if (items.length === 0) return undefined
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  if (totalWeight <= 0) return undefined

  let roll = Math.random() * totalWeight
  for (const item of items) {
    roll -= item.weight
    if (roll <= 0) return item
  }
  return items[items.length - 1]
}

export function getCompanionTitleProgress(companion: Companion): {
  nextTitle?: CompanionTitleId
  percent: number
} {
  const unlocked = new Set(normalizeTitles(companion.titles))
  const stats = getStatsOrDefault(companion.interactionStats)

  let best: { id: CompanionTitleId; completion: number } | undefined
  for (const id of COMPANION_TITLE_IDS) {
    if (unlocked.has(id)) continue
    const def = COMPANION_TITLE_DEFINITIONS[id]
    if (!def.requirement) continue
    const completion = requirementCompletion(def.requirement, stats)
    if (!best || completion > best.completion) {
      best = { id, completion }
    }
  }

  if (!best) {
    return { percent: 100 }
  }

  return {
    nextTitle: best.id,
    percent: Math.round(best.completion * 100),
  }
}

export function triggerCompanionInsight(
  companion: Companion,
  kind: CompanionInsightKind,
): CompanionInsightResult | undefined {
  let unlockedTitles: CompanionTitleId[] = []
  let shouldSpeak = false

  updateStoredCompanion(companion, target => {
    const now = Date.now()
    const cooldownMs = INSIGHT_COOLDOWNS[kind]
    const lastOfKind =
      kind === 'coding'
        ? target.lastCodingInsightAt
        : kind === 'thinking'
          ? target.lastThinkingInsightAt
          : target.lastQuestionInsightAt

    if (lastOfKind && now - lastOfKind < cooldownMs) {
      return
    }

    const stats = getStatsOrDefault(target.interactionStats)

    if (kind === 'coding') stats.codingIdeas += 1
    if (kind === 'thinking') stats.thinkingIdeas += 1
    if (kind === 'question') stats.questionIdeas += 1
    stats.totalIdeas += 1

    const titles = new Set(normalizeTitles(target.titles))
    for (const title of COMPANION_TITLE_IDS) {
      const def = COMPANION_TITLE_DEFINITIONS[title]
      if (def.requirement && isRequirementMet(def.requirement, stats) && !titles.has(title)) {
        titles.add(title)
        unlockedTitles.push(title)
      }
    }

    const baseDropChance =
      kind === 'coding'
        ? 0.12
        : kind === 'question'
          ? 0.1
          : 0.08
    const pity = target.titleDropPity ?? 0
    const guaranteeDrop = pity >= 11
    const shouldRollDrop = guaranteeDrop || Math.random() < baseDropChance

    if (shouldRollDrop) {
      const dropCandidates = COMPANION_TITLE_IDS
        .filter(id => !titles.has(id))
        .map(id => COMPANION_TITLE_DEFINITIONS[id])
        .filter(def => isDropEligible(def, kind, stats))
        .map(def => ({
          id: def.id,
          weight: def.drop!.weight,
        }))

      const picked = weightedPick(dropCandidates)
      if (picked && !titles.has(picked.id)) {
        titles.add(picked.id)
        unlockedTitles.push(picked.id)
        target.titleDropPity = 0
      } else {
        target.titleDropPity = guaranteeDrop ? 0 : pity + 1
      }
    } else {
      target.titleDropPity = pity + 1
    }

    target.interactionStats = stats
    target.titles = Array.from(titles)
    target.lastInsightAt = now
    if (kind === 'coding') target.lastCodingInsightAt = now
    if (kind === 'thinking') target.lastThinkingInsightAt = now
    if (kind === 'question') target.lastQuestionInsightAt = now
    shouldSpeak = true
  })

  if (!shouldSpeak) return undefined

  const reaction =
    kind === 'coding'
      ? randomLine(CODING_IDEAS)
      : kind === 'question'
        ? randomLine(QUESTION_IDEAS)
        : randomLine(THINKING_IDEAS)

  if (unlockedTitles.length === 0) {
    return { reaction }
  }

  return { reaction, newlyUnlockedTitles: unlockedTitles }
}

/** 
 * 放生指定索引宠物，若成功则返回放生的信息，同时若主宠不是自己则主宠获得经验。
 * 不能放生唯一的一只宠物。
 */
export function releaseCompanion(index: number): { released: StoredCompanion | null, newActiveIndex: number } {
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
