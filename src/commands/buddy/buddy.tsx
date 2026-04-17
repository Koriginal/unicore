import * as React from 'react'
import { useEffect, useState, useCallback } from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { SpinnerGlyph } from '../../components/Spinner/SpinnerGlyph.js'
import { Box, Text } from '../../ink.js'
import { useSetAppState } from '../../state/AppState.js'
import { getSystemLocaleLanguage } from '../../utils/intl.js'
import type {
  LocalJSXCommandCall,
  LocalJSXCommandOnDone,
  LocalCommandResult,
} from '../../types/command.js'
import type { ToolUseContext } from '../../Tool.js'
import {
  getCompanion,
  getCompanions,
  swapCompanion,
  gainXP,
  companionUserId,
  roll,
  rollWithSeed,
  captureCompanion,
  renameCompanion,
  feedCompanion,
  releaseCompanion,
  updateExploreState,
  updateCompanions,
  getCompanionTitleProgress,
} from '../../buddy/companion.js'
import {
  type CacheSafeParams,
  getLastCacheSafeParams,
  runForkedAgent,
  extractResultText,
} from '../../utils/forkedAgent.js'
import { createUserMessage, extractTextContent } from '../../utils/messages.js'
import { renderSprite, renderFace } from '../../buddy/sprites.js'
import {
  RARITY_STARS,
  RARITY_COLORS,
  STAT_NAMES,
  type Companion,
  type CompanionBones,
  type CompanionSoul,
  type CompanionTitleId,
  type StoredCompanion,
} from '../../buddy/types.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import { getUserContext, getSystemContext } from '../../context.js'
import { asSystemPrompt } from '../../utils/systemPromptType.js'
import type { Message } from '../../types/message.js'

const RARITY_LABELS: Record<string, string> = {
  common: l('普通', 'Common'),
  uncommon: l('不寻常', 'Uncommon'),
  rare: l('稀有', 'Rare'),
  epic: l('史诗', 'Epic'),
  legendary: l('传说', 'Legendary'),
}

function titleLabel(id: CompanionTitleId): string {
  switch (id) {
    case 'syntax_sniffer':
      return l('语法嗅探者', 'Syntax Sniffer')
    case 'flow_channeler':
      return l('思路引流师', 'Flow Channeler')
    case 'question_hunter':
      return l('疑点猎手', 'Question Hunter')
    case 'pairing_oracle':
      return l('结对先知', 'Pairing Oracle')
    case 'bug_trapper':
      return l('漏洞捕手', 'Bug Trapper')
    case 'mind_gardener':
      return l('思维园丁', 'Mind Gardener')
    case 'architecture_owl':
      return l('架构猫头鹰', 'Architecture Owl')
    case 'soul_partner':
      return l('灵魂搭子', 'Soul Partner')
    case 'stack_trace_diver':
      return l('栈追猎手', 'Stack Trace Diver')
    case 'lint_whisperer':
      return l('Lint 低语者', 'Lint Whisperer')
    case 'merge_conflict_tamer':
      return l('冲突驯服师', 'Merge Conflict Tamer')
    case 'breakpoint_ranger':
      return l('断点游侠', 'Breakpoint Ranger')
    case 'refactor_ritualist':
      return l('重构仪式师', 'Refactor Ritualist')
    case 'null_guardian':
      return l('空值守卫', 'Null Guardian')
    case 'cache_alchemist':
      return l('缓存炼金师', 'Cache Alchemist')
    case 'commit_bard':
      return l('提交吟游诗人', 'Commit Bard')
    case 'rubber_duck_archmage':
      return l('鸭鸭大法师', 'Rubber Duck Archmage')
    case 'semicolon_sorcerer':
      return l('分号术士', 'Semicolon Sorcerer')
    default:
      return id
  }
}

function l(zh: string, en: string) {
  const lang = getSystemLocaleLanguage()
  return lang?.startsWith('en') ? en : zh
}

function decodeEntities(str: string) {
  return (str || '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

// --- 动画 Hook ---
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = React.useRef(callback)
  useEffect(() => {
    savedCallback.current = callback
  }, [callback])
  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay)
      return () => clearInterval(id)
    }
  }, [delay])
}

// --- 灵魂生成 (Soul generation) ---

function buildHatchPrompt(
  bones: CompanionBones,
  inspirationSeed: number,
): string {
  const statsStr = Object.entries(bones.stats)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')

  return `<system-reminder>你是一个虚拟宠物命名引擎。请为这个小伙伴生成一个名字和性格描述。
  
物种: ${bones.species}
稀有度: ${bones.rarity}
眼睛样式: ${bones.eye}
帽子: ${bones.hat}
闪光 (Shiny): ${bones.shiny}
属性: ${statsStr}
灵感种子: ${inspirationSeed}

规则:
- 名字 (Name): 1-2个词，最多15个字符，要有创意且符合物种特征（可以使用中文）。
- 性格 (Personality): 一句话，最多60个字符，反映其属性特征（可以使用中文）。
- 高 CHAOS (混乱) → 不可预测；高 SNARK (吐槽) → 毒舌/讽刺；高 WISDOM (智慧) → 深思熟虑
- 高 PATIENCE (耐心) → 沉稳；高 DEBUGGING (调试) → 细节控

请仅返回一个简洁、合规的 JSON 对象，严禁使用 markdown 代码块或包裹任何前言。直接输出内容：
{"name": "名字", "personality": "性格描述"}</system-reminder>`
}

/**
 * 确保在冷启动状态下（无对话历史）也能获取到 CacheSafeParams。
 * 核心思路是从当前的 ToolUseContext 中提取渲染后的系统提示词及上下文。
 */
async function ensureCacheParams(context: ToolUseContext): Promise<CacheSafeParams> {
  const lastParams = getLastCacheSafeParams()
  if (lastParams) return lastParams

  // 如果没有上一次的缓存，则利用当前指令的上下文构造一个临时的
  return {
    systemPrompt: context.renderedSystemPrompt || asSystemPrompt(['You are a helpful assistant.']),
    userContext: await getUserContext(),
    systemContext: await getSystemContext(),
    toolUseContext: context,
    forkContextMessages: context.messages || [],
  }
}

function parseSoulResponse(
  messages: Array<any>,
): { name: string; personality: string } | null {
  const rawText = extractResultText(messages).trim()
  if (!rawText || rawText === 'Execution completed') return null

  // 1. Try to find the first valid JSON block {...}
  let text = rawText
  const start = rawText.indexOf('{')
  const end = rawText.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    text = rawText.substring(start, end + 1)
  }

  // 2. Strip markdown code fences if they are still wrapped
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')

  try {
    const parsed = JSON.parse(text)
    if (
      typeof parsed.name === 'string' &&
      typeof parsed.personality === 'string'
    ) {
      return {
        name: decodeEntities(parsed.name.slice(0, 15)),
        personality: decodeEntities(parsed.personality.slice(0, 60)),
      }
    }
  } catch {
    // 3. Regex fallback
    const nameMatch = text.match(/"name"\s*:\s*"([^"]+)"/)
    const persMatch = text.match(/"personality"\s*:\s*"([^"]+)"/)
    if (nameMatch?.[1] && persMatch?.[1]) {
      return {
        name: decodeEntities(nameMatch[1].slice(0, 15)),
        personality: decodeEntities(persMatch[1].slice(0, 60)),
      }
    }
  }
  return null
}

async function generateSoul(
  bones: CompanionBones,
  inspirationSeed: number,
  context?: ToolUseContext,
): Promise<{ name: string; personality: string }> {
  // Use passed context or last cached params
  let cacheSafeParams: CacheSafeParams | null = null
  if (context) {
    cacheSafeParams = await ensureCacheParams(context)
  } else {
    cacheSafeParams = getLastCacheSafeParams()
  }

  if (!cacheSafeParams) {
    return {
      name: `小${bones.species}`,
      personality: '由于无法预测它的性格，它显得格外神秘。',
    }
  }

  try {
    const result = await runForkedAgent({
      promptMessages: [
        createUserMessage({
          content: buildHatchPrompt(bones, inspirationSeed),
        }),
      ],
      cacheSafeParams,
      canUseTool: async () => ({
        behavior: 'deny' as const,
        message: '灵魂生成过程无法使用工具',
        decisionReason: { type: 'other' as const, reason: 'buddy_hatch' },
      }),
      querySource: 'buddy_hatch',
      forkLabel: 'buddy_hatch',
      maxTurns: 1,
      skipCacheWrite: true,
      skipTranscript: true,
    })

    return (
      parseSoulResponse(result.messages) ?? {
        name: `小${bones.species}`,
        personality: '由于无法预测它的性格，它显得格外神秘。',
      }
    )
  } catch (error) {
    console.error('Buddy soul generation failed:', error)
    return {
      name: `小${bones.species}`,
      personality: '由于无法预测它的性格，它显得格外神秘。',
    }
  }
}

// --- 属性条渲染 ---

function StatBar({
  name,
  value,
  color,
}: {
  name: string
  value: number
  color: string
}) {
  const barWidth = 15
  const filled = Math.round((value / 100) * barWidth)
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled)
  // Localize stat names
  const labels: Record<string, string> = {
    'CHAOS': l('混乱', 'CHAOS'),
    'SNARK': l('吐槽', 'SNARK'),
    'WISDOM': l('智慧', 'WISDOM'),
    'PATIENCE': l('耐心', 'PATIENCE'),
    'DEBUGGING': l('调试', 'DEBUGGING'),
  }
  const label = (labels[name] || name).padEnd(6)
  const numStr = String(value).padStart(3)
  return (
    <Text>
      {'  '}
      <Text dimColor>{label}</Text>{' '}
      <Text color={color}>{bar}</Text>{' '}
      <Text bold>{numStr}</Text>
    </Text>
  )
}

// --- 宠物详情卡 ---

function CompanionCard({
  companion,
  onDone,
}: {
  companion: Companion
  onDone: LocalJSXCommandOnDone
}) {
  const color = RARITY_COLORS[companion.rarity] || 'white'
  const stars = RARITY_STARS[companion.rarity] || ''
  const sprite = renderSprite(companion, 0)
  const face = renderFace(companion)
  const titleProgress = getCompanionTitleProgress(companion)

  const handleKeyDown = useCallback(
    (e: { key: string; ctrl?: boolean; preventDefault: () => void }) => {
      if (
        e.key === 'escape' ||
        e.key === 'return' ||
        (e.ctrl && (e.key === 'c' || e.key === 'd'))
      ) {
        e.preventDefault()
        onDone(undefined, { display: 'skip' })
      }
    },
    [onDone],
  )

  return (
    <Box
      flexDirection="column"
      paddingX={1}
      paddingY={1}
      borderStyle="round"
      borderColor={color}
      tabIndex={0}
      autoFocus={true}
      onKeyDown={handleKeyDown}
    >
      <Box>
        <Text bold color={color}>
          {stars} {RARITY_LABELS[companion.rarity] || companion.rarity.toUpperCase()}{companion.shiny ? ' ✨' : ''}
        </Text>
      </Box>
      <Box flexDirection="row">
        <Box flexDirection="column" marginRight={2}>
          {sprite.map((line, i) => (
            <Text key={i} color={color}>
              {line}
            </Text>
          ))}
        </Box>
        <Box flexDirection="column">
          <Text bold color="cyan">{companion.name}</Text>
          <Text dimColor>{l(`品种: ${companion.species} | 等级 ${companion.level || 1} (${companion.xp || 0} / ${((companion.level || 1) * 20 + 20)} XP)`, `Species: ${companion.species} | Level ${companion.level || 1} (${companion.xp || 0} / ${((companion.level || 1) * 20 + 20)} XP)`)}</Text>
          <Box flexDirection="row" paddingY={1}>
             <Text color="red">HP: {Math.floor(companion.hp ?? ((companion.stats.PATIENCE || 10) * 2 + 50))}</Text>
             <Text>  </Text>
             <Text color="blue">SP: {Math.floor(companion.sp ?? ((companion.stats.WISDOM || 10) + 20))}</Text>
          </Box>
          <Text italic dimColor>"{companion.personality}"</Text>
          <Text dimColor>
            {l('称号: ', 'Titles: ')}
            {(companion.titles && companion.titles.length > 0)
              ? companion.titles.map(titleLabel).join(' / ')
              : l('暂无', 'None')}
          </Text>
          <Text dimColor>
            {l('互动灵感: ', 'Insight Count: ')}
            {companion.interactionStats?.totalIdeas ?? 0}
          </Text>
          {titleProgress.nextTitle && (
            <Text dimColor>
              {l('下一称号: ', 'Next Title: ')}
              {titleLabel(titleProgress.nextTitle)} ({titleProgress.percent}%)
            </Text>
          )}
        </Box>
      </Box>
      <Text> </Text>
      {STAT_NAMES.map(stat => (
        <StatBar
          key={stat}
          name={stat}
          value={companion.stats[stat]}
          color={color}
        />
      ))}
      <Text> </Text>
      <Text dimColor>
        {'  '}{l('按 ESC 关闭。试试 /buddy pet 来摸摸它！', 'Press ESC to close. Try /buddy pet to pat it!')}
      </Text>
    </Box>
  )
}

// --- 孵化动画 ---

const HATCH_FRAMES = [
  '    ___   \n   /   \\  \n  |     | \n  |     | \n   \\___/  ',
  '    ___   \n   / . \\  \n  |     | \n  |     | \n   \\___/  ',
  '   _/\\_   \n  / .  \\  \n |      | \n |      | \n  \\____/  ',
  '  _/ \\_   \n /  .  \\  \n|   *   | \n \\     /  \n  \\___/   ',
  ' *       *\n  _/ \\_   \n /     \\  \n|  !!!  | \n  \\   /   ',
]

function HatchingView({
  bones,
  inspirationSeed,
  onHatched,
  context,
}: {
  bones: CompanionBones
  inspirationSeed: number
  onHatched: (companion: Companion) => void
  context: ToolUseContext
}) {
  const [frame, setFrame] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useInterval(
    () => setFrame(f => f + 1),
    generating && frame < HATCH_FRAMES.length - 1 ? 400 : null,
  )

  useEffect(() => {
    let cancelled = false
    setGenerating(true)

    void generateSoul(bones, inspirationSeed, context).then(
      soul => {
        if (cancelled) return
        const maxHp = (bones.stats.PATIENCE || 10) * 2 + 50
        const maxSp = (bones.stats.WISDOM || 10) + 20
        const stored: StoredCompanion = {
          name: soul.name,
          personality: soul.personality,
          hatchedAt: Date.now(),
          level: 1,
          xp: 0,
          hp: maxHp,
          sp: maxSp,
          lastUpdatedAt: Date.now(),
        }
        saveGlobalConfig(cfg => {
          const companions = [...(cfg.companions || (cfg.companion ? [cfg.companion] : []))]
          companions.push(stored)
          return {
            ...cfg,
            companions,
            activeCompanionIndex: companions.length - 1,
          }
        })
        const companion = getCompanion()
        if (companion) {
          onHatched(companion)
        }
      },
      err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      },
    )

    return () => {
      cancelled = true
    }
  }, [])

  const color = RARITY_COLORS[bones.rarity] || 'white'
  const eggFrame = HATCH_FRAMES[Math.min(frame, HATCH_FRAMES.length - 1)]!

  if (error) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text color="red">{l('孵化失败', 'Hatching failed')}: {error}</Text>
        <Text dimColor>{l('按 ESC 关闭。', 'Press ESC to close.')}</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box>
        <SpinnerGlyph />
        <Text bold color={color}>
          {' '}{l('正在孵化你的编程小伙伴', 'Hatching your coding buddy')}...
        </Text>
      </Box>
      <Text> </Text>
      {eggFrame.split('\n').map((line, i) => (
        <Text key={i} color={color}>
          {line}
        </Text>
      ))}
    </Box>
  )
}

// --- 主组件 ---

function BuddyMain({
  onDone,
  context,
}: {
  onDone: LocalJSXCommandOnDone
  context: ToolUseContext
}) {
  const [companion, setCompanion] = useState<Companion | undefined>(
    getCompanion,
  )
  const [hatching, setHatching] = useState(!companion)

  if (hatching && !companion) {
    const userId = companionUserId()
    const { bones, inspirationSeed } = roll(userId)
    return (
      <HatchingView
        bones={bones}
        inspirationSeed={inspirationSeed}
        context={context}
        onHatched={c => {
          setCompanion(c)
          setHatching(false)
        }}
      />
    )
  }

  if (!companion) {
    onDone(undefined, { display: 'skip' })
    return null
  }

  return <CompanionCard companion={companion} onDone={onDone} />
}

function BuddyPet({ onDone }: { onDone: LocalJSXCommandOnDone }) {
  const setAppState = useSetAppState()
  useEffect(() => {
    setAppState(prev => ({ ...prev, companionPetAt: Date.now() }))
    const companion = getCompanion()
    if (companion) {
      gainXP(companion, 5)
    }
    onDone(
      companion ? l(`你摸了摸 ${companion.name}! 它看起来很开心 (XP+5)。`, `You pat ${companion.name}! It looks happy (XP+5).`) 
                : l('你还没有小伙伴可以摸。', 'You have no buddy to pat.'),
      { display: 'system' },
    )
  }, [])
  return null
}

// --- RPG 战斗及捕获 (RPG Encounter System) ---
function BuddyEncounter({ onDone, context }: { onDone: LocalJSXCommandOnDone, context: ToolUseContext }) {
  const [allPets] = useState(() => getCompanions())
  const [activeIdx, setActiveIdx] = useState(() => {
    const config = getGlobalConfig()
    const def = config.activeCompanionIndex ?? 0
    return allPets[def] ? def : 0
  })
  
  const [wildSeed] = useState(() => Math.random().toString(36).substring(7))
  const [wildRoll] = useState(() => rollWithSeed(wildSeed))
  const wildBones = wildRoll.bones

  // HP = PATIENCE * 2 + 50
  // SP = WISDOM + 20
  const calcMaxHp = (stats: CompanionBones['stats']) => (stats.PATIENCE || 10) * 2 + 50
  const calcMaxSp = (stats: CompanionBones['stats']) => (stats.WISDOM || 10) + 20

  const [partyHp, setPartyHp] = useState(() => allPets.map(p => p.hp ?? calcMaxHp(p.stats)))
  const [partySp, setPartySp] = useState(() => allPets.map(p => p.sp ?? calcMaxSp(p.stats)))
  const partyHpRef = React.useRef(partyHp)
  const partySpRef = React.useRef(partySp)
  
  const myPet = allPets[activeIdx]
  const myHp = myPet ? partyHp[activeIdx] : 0
  const mySp = myPet ? partySp[activeIdx] : 0

  const [wildMaxHp] = useState(() => calcMaxHp(wildBones.stats))
  const [wildHp, setWildHp] = useState(wildMaxHp)

  const [logs, setLogs] = useState<string[]>([l('一只野生的宠物跳了出来！', 'A wild buddy appeared!')])
  const [status, setStatus] = useState<'active'|'captured'|'fled'|'generating'>('active')
  const [defending, setDefending] = useState(false)
  const defendingRef = React.useRef(false)

  const addLog = (l: string) => setLogs(prev => [...prev.slice(-4), l])

  const [error, setError] = useState<string | null>(null)

  const handleAsyncCapture = async () => {
    setStatus('generating')
    addLog(l('捕获成功！正在安抚并确认它的灵魂印记...', 'Capture success! Calming it down and confirming its soul imprint...'))
    try {
      const soul = await generateSoul(wildBones, wildRoll.inspirationSeed, context)
      captureCompanion(soul, wildSeed)
      
      // Batch update: save current stats + give XP
      const hpSnapshot = partyHpRef.current
      const spSnapshot = partySpRef.current
      updateCompanions(list => {
        list.forEach((p, i) => {
          if (i < hpSnapshot.length) p.hp = hpSnapshot[i]
          if (i < spSnapshot.length) p.sp = spSnapshot[i]
          if (p.hatchedAt === myPet?.hatchedAt) {
             // Main pet gets XP
             let lv = p.level || 1
             let xp = (p.xp || 0) + 20
             const xpNeeded = (lv: number) => lv * 20 + 20
             if (xp >= xpNeeded(lv)) { xp -= xpNeeded(lv); lv += 1; }
             p.xp = xp; p.level = lv;
          }
        })
      })

      onDone(l(`🎉 捕获成功！你获得了新伙伴 ${soul.name}！使用 /buddy list 查看。`, `🎉 Capture success! You obtained new buddy ${soul.name}! Use /buddy list to view.`), { display: 'system' })
    } catch(err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const finishBattle = (xpGained: number) => {
    const hpSnapshot = partyHpRef.current
    const spSnapshot = partySpRef.current
    updateCompanions(list => {
      list.forEach((p, i) => {
        if (i < hpSnapshot.length) p.hp = hpSnapshot[i]
        if (i < spSnapshot.length) p.sp = spSnapshot[i]
        if (xpGained !== 0 && p.hatchedAt === myPet?.hatchedAt) {
           let lv = p.level || 1
           let xp = (p.xp || 0) + xpGained
           const xpNeeded = (lv: number) => lv * 20 + 20
           if (xp >= xpNeeded(lv)) { xp -= xpNeeded(lv); lv += 1; }
           p.xp = xp; p.level = lv;
        } else if (xpGained < 0) {
           p.xp = Math.max(0, (p.xp || 0) + xpGained)
        }
      })
    })
  }

  const enemyTurn = (targetTargetIdx?: number) => {
    const curIdx = targetTargetIdx ?? activeIdx
    const curPet = allPets[curIdx]
    if (wildHp <= 0) {
      addLog(l('野生宠物倒下了！你赢了！但是它趁机溜走了...', 'The wild buddy fainted! You won! But it took the chance to flee...'))
      finishBattle(15)
      setTimeout(() => onDone(undefined, { display: 'skip' }), 2000)
      setStatus('fled')
      return
    }
    
    // Enemy attacks
    const snark = wildBones.stats.SNARK || 10
    const chaos = wildBones.stats.CHAOS || 10
    let dmg = Math.max(1, Math.floor(snark * 0.4 + (Math.random() * (chaos * 0.2))))
    
    if (defendingRef.current) {
      dmg = Math.floor(dmg / 2)
      defendingRef.current = false
      setDefending(false)
    }

    setPartyHp(prev => {
      const next = [...prev]
      if (next[curIdx] <= 0) return next // already dead
      next[curIdx] = Math.max(0, next[curIdx] - dmg)
      partyHpRef.current = next
      addLog(`野生 ${RARITY_LABELS[wildBones.rarity]} 对你的 ${curPet.name} 造成了 ${prev[curIdx] - next[curIdx]} 点伤害。`)
      
      if (next[curIdx] <= 0) {
        // check if others alive
        const hasAlive = next.some(hp => hp > 0)
        if (hasAlive) {
          addLog(l(`${curPet.name} 倒下了！快换下一个宠物！(按 [T] 换宠)`, `${curPet.name} fainted! Swap to next buddy! (Press [T])`))
        } else {
          addLog(l('全军覆没！你的防线崩溃了，落荒而逃...', 'Party wiped out! Your line collapsed and you fled in panic...'))
          setStatus('fled')
          setTimeout(() => {
            // Apply Penalty
            if (allPets.length > 0) {
               allPets.forEach(p => gainXP(p, -10))
            }
            onDone(l('战斗全军覆没大失败，整支队伍吓坏了，各自掉落了 10 点 XP。', 'Battle failed spectacularly. The entire party was terrified, each losing 10 XP.'), { display: 'system' })
          }, 3000)
        }
      }
      return next
    })
  }

  const handleAction = useCallback((action: 'A'|'S'|'D'|'C'|'R'|'T') => {
    if (status !== 'active') return
    if (!myPet) {
      onDone('你必须先获得一只宠物才能进行野外探索！', { display: 'system' })
      return
    }

    if (action === 'R') {
      addLog(l('放弃了尊严，你带领队伍落荒而逃了...', 'Giving up dignity, you led the party to flee in panic...'))
      setStatus('fled')
      setTimeout(() => {
          finishBattle(-10)
          onDone(l('虽然成功逃脱，但队伍因为怯战均流失了 10 点 XP。', 'Successfully escaped, but the party lost 10 XP due to cowardice.'), { display: 'system' })
      }, 1000)
      return
    }

    if (action === 'T') {
      const nextIdx = partyHp.findIndex((hp, i) => hp > 0 && i > activeIdx)
      const targetIdx = nextIdx !== -1 ? nextIdx : partyHp.findIndex(hp => hp > 0)
      if (targetIdx === -1 || targetIdx === activeIdx) {
        addLog('没有其他存活的宠物可以换了！')
        return
      }
      const isFainted = partyHp[activeIdx] <= 0
      setActiveIdx(targetIdx)
      addLog(l(`换上了 ${allPets[targetIdx].name}！`, `Swapped to ${allPets[targetIdx].name}!`))
      
      if (!isFainted) {
        // 如果是活着的时候强行换宠，这回合由于失去先机，野兽会趁虚而入打新上来的宠物。
        setTimeout(() => enemyTurn(targetIdx), 500)
      }
      return
    }

    if (myHp <= 0) {
       addLog('当前宠物已倒下，无法下达指令！请按 [T] 选择接力登场。')
       return
    }

    if (action === 'D') {
      defendingRef.current = true
      setDefending(true)
      addLog(l(`${myPet.name} 采取了防守姿态。`, `${myPet.name} took a defensive stance.`))
      enemyTurn(activeIdx)
      return
    }

    if (action === 'C') {
      const hpPct = wildHp / wildMaxHp
      const chance = (1 - hpPct) * 0.6 + 0.1
      if (Math.random() < chance) {
        handleAsyncCapture()
      } else {
        addLog(l('捕捉失败！被它挣脱了！', 'Capture failed! It broke free!'))
        enemyTurn(activeIdx)
      }
      return
    }

    if (action === 'A') {
      const atk = myPet.stats.SNARK || 10
      const dmg = Math.max(1, Math.floor(atk * 0.4 + (Math.random() * (myPet.stats.CHAOS || 10) * 0.2)))
      setWildHp(prev => {
        const next = Math.max(0, prev - dmg)
        addLog(l(`${myPet.name} 使用了普通攻击，造成 ${prev - next} 点伤害！`, `${myPet.name} used basic attack, dealing ${prev - next} damage!`))
        return next
      })
      setTimeout(() => enemyTurn(activeIdx), 500)
      return
    }

    if (action === 'S') {
      if (mySp < 20) {
        addLog('精力(SP)不足！')
        return
      }
      setPartySp(prev => {
        const next = [...prev]
        next[activeIdx] -= 20
        partySpRef.current = next
        return next
      })
      const matk = myPet.stats.WISDOM || 10
      const dmg = Math.max(5, Math.floor(matk * 0.8 + (Math.random() * 20)))
      setWildHp(prev => {
        const next = Math.max(0, prev - Math.floor(dmg))
        addLog(l(`${myPet.name} 释放了特殊攻击！造成 ${prev - next} 点伤害！`, `${myPet.name} unleashed a special attack, dealing ${prev - next} damage!`))
        return next
      })
      setTimeout(() => enemyTurn(activeIdx), 500)
      return
    }
  }, [status, myPet, wildHp, wildMaxHp, myHp, partyHp, activeIdx, allPets, mySp, onDone])

  const handleKeyDown = useCallback(
    (e: { key: string; ctrl?: boolean; preventDefault: () => void }) => {
      if (status !== 'active') return
      const k = e.key.toUpperCase()
      if (['A', 'S', 'D', 'C', 'R', 'T'].includes(k)) {
        e.preventDefault()
        handleAction(k as any)
      } else if (e.key === 'escape' || (e.ctrl && (k === 'C' || k === 'D'))) {
        e.preventDefault()
        onDone(undefined, { display: 'skip' })
      }
    },
    [status, handleAction, onDone]
  )

  if (!myPet) {
    onDone('你需要先领取一只宠物 ( /buddy )！', { display: 'system' })
    return null
  }

  if (error) {
    return <Text color="red">遭遇战出错: {error}</Text>
  }

  const wildSprite = renderSprite(wildBones, 0)
  const mySprite = renderSprite(myPet, 0)

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} tabIndex={0} autoFocus={true} onKeyDown={handleKeyDown}>
      <Text bold color="yellow">=== {l('野外遭遇战', 'Wild Encounter')} ===</Text>
      <Box flexDirection="row" justifyContent="space-between" paddingTop={1}>
        <Box flexDirection="column" width="40%">
          <Text color="cyan">{myPet.name}</Text>
          <Text dimColor>HP: {Math.floor(myHp)} / {calcMaxHp(myPet.stats)}</Text>
          <Text dimColor>SP: {Math.floor(mySp)} / {calcMaxSp(myPet.stats)}</Text>
          <Box paddingTop={1} flexDirection="column">
            {mySprite.map((line, i) => <Text key={i}>{line}</Text>)}
          </Box>
        </Box>
        <Box flexDirection="column" width="20%">
          <Text bold color="red">   VS   </Text>
        </Box>
        <Box flexDirection="column" width="40%">
          <Text color="red">野生 {RARITY_LABELS[wildBones.rarity] || '未知'}</Text>
          <Text dimColor>HP: {Math.floor(wildHp)} / {wildMaxHp}</Text>
          <Box paddingTop={1} flexDirection="column">
            {wildSprite.map((line, i) => <Text key={i} color={RARITY_COLORS[wildBones.rarity]}>{line}</Text>)}
          </Box>
        </Box>
      </Box>

      <Box flexDirection="column" paddingTop={1} minHeight={4}>
        {logs.map((L, i) => <Text italic key={i} color={i === logs.length - 1 ? 'white' : 'gray'}>&gt; {L}</Text>)}
      </Box>
      
      {status === 'active' ? (
        <Box paddingTop={1}>
          <Text>{l('操作：', 'Actions: ')}  </Text>
          {myHp > 0 ? (
            <>
              <Text color="green" bold>[A]</Text><Text> {l('攻击', 'Atk')}  </Text>
              <Text color="blue" bold>[S]</Text><Text> {l('特殊(20SP)', 'Sp(20SP)')}  </Text>
              <Text color="yellow" bold>[D]</Text><Text> {l('防守', 'Def')}  </Text>
              <Text color="magenta" bold>[C]</Text><Text> {l('捕捉', 'Cap')}  </Text>
            </>
          ) : <Text color="red">{l('当前已阵亡', 'Fainted')}  </Text>}
          <Text color="cyan" bold>[T]</Text><Text> {l('换宠', 'Swap')}  </Text>
          <Text dimColor bold>[R]</Text><Text dimColor>{l('逃跑', 'Run')}</Text>
        </Box>
      ) : status === 'generating' ? (
        <Text color="green">{l('正在给新伙伴生成灵魂...', 'Generating soul for new buddy...')}</Text>
      ) : (
        <Text dimColor>{l('战斗已结束。', 'Battle ended.')}</Text>
      )}
    </Box>
  )
}

function BuddyList({ onDone }: { onDone: LocalJSXCommandOnDone }) {
  useEffect(() => {
    const list = getCompanions()
    if (list.length === 0) {
      onDone('你还没有任何小伙伴。使用 /buddy 孵化一只，或者 /buddy wild 去野外抓捕！', { display: 'system' })
      return
    }
    
    // Create text representation
    const lines = [l('你的宠物列表：', 'Your Buddies:')]
    list.forEach((c, idx) => {
      const activeStr = idx === (getGlobalConfig().activeCompanionIndex ?? 0) ? ' [ACTIVE]' : ''
      const lvlStr = `Lv.${c.level ?? 1}`
      const latestTitle = c.titles?.at(-1)
      const titleStr = latestTitle ? ` | ${l('称号', 'Title')}: ${titleLabel(latestTitle)}` : ''
      lines.push(`${idx + 1}. ${c.name} (${c.species} ${lvlStr}) - ${RARITY_LABELS[c.rarity]}${activeStr}${titleStr}`)
    })
    lines.push('\n使用 /buddy swap [数字] 来切换当前跟随的小伙伴。')
    
    onDone(lines.join('\n'), { display: 'system' })
  }, [])
  return null
}

function BuddySwap({ onDone, arg }: { onDone: LocalJSXCommandOnDone, arg: string }) {
  useEffect(() => {
    const index = parseInt(arg, 10) - 1
    if (isNaN(index) || index < 0) {
      onDone('使用方法: /buddy swap <数字>', { display: 'system' })
      return
    }
    if (swapCompanion(index)) {
      onDone(`切换成功！现在跟随你的是 ${getCompanion()?.name ?? '小伙伴'}。`, { display: 'system' })
    } else {
      onDone('找不到对应的小伙伴。请用 /buddy list 查看列表。', { display: 'system' })
    }
  }, [])
  return null
}

function BuddyMute({
  onDone,
  mute,
}: {
  onDone: LocalJSXCommandOnDone
  mute: boolean
}) {
  useEffect(() => {
    saveGlobalConfig(cfg => ({ ...cfg, companionMuted: mute }))
    onDone(mute ? '小伙伴进入了静静模式。' : '小伙伴重新开始活跃了。', {
      display: 'system',
    })
  }, [])
  return null
}

function BuddyRename({ onDone, arg, context }: { onDone: LocalJSXCommandOnDone, arg: string, context: ToolUseContext }) {
  const [companion, setCompanion] = useState<Companion | undefined>(
    getCompanion,
  )
  const [renaming, setRenaming] = useState(!arg)

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!companion) {
      onDone('没有小伙伴可以改名。请先使用 /buddy 领取一只。', {
        display: 'system',
      })
      return
    }

    if (arg) {
      renameCompanion(companion, arg)
      onDone(`名牌贴好了！它现在叫 "${arg}"。`, { display: 'system' })
      return
    }

    let cancelled = false
    const bones: CompanionBones = {
      species: companion.species,
      rarity: companion.rarity,
      stats: companion.stats,
      eye: companion.eye,
      hat: companion.hat,
      shiny: companion.shiny,
    }
    const inspirationSeed = Math.floor(Math.random() * 1e9)

    void generateSoul(bones, inspirationSeed, context).then(
      soul => {
        if (cancelled) return
        saveGlobalConfig(cfg => {
          const companions = [...(cfg.companions || [])]
          const activeIdx = cfg.activeCompanionIndex ?? 0
          if (companions[activeIdx]) {
            companions[activeIdx] = {
              ...companions[activeIdx]!,
              name: soul.name,
              personality: soul.personality,
            }
          }
          return { ...cfg, companions }
        })
        const updated = getCompanion()
        if (updated) setCompanion(updated)
        setRenaming(false)
      },
      err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      },
    )

    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <Box paddingX={1} flexDirection="column">
        <Text color="red">灵魂重构失败: {error}</Text>
        <Text dimColor>请检查网络或模型配置，按 ESC 关闭。</Text>
      </Box>
    )
  }

  if (renaming && !arg) {
    return (
      <Box paddingX={1} flexDirection="column">
        <Box>
            <SpinnerGlyph />
            <Text bold color="yellow"> {l('正在为小伙伴重新构思名字和性格', 'Reimaging name and personality')}...</Text>
        </Box>
        <Text> </Text>
        <Box paddingLeft={2}>
           <Text dimColor>AI 正在扫描其数码基因并产生灵感...</Text>
        </Box>
      </Box>
    )
  }

  if (!companion) return null
  return <CompanionCard companion={companion} onDone={onDone} />
}

function BuddyFeed({ onDone }: { onDone: LocalJSXCommandOnDone }) {
  const comp = getCompanion()
  useEffect(() => {
    if (!comp) {
      onDone('你还没有小伙伴可以投喂！', { display: 'system' })
      return
    }
    const COOL_DOWN = 5 * 60 * 1000
    const now = Date.now()
    if (comp.lastFedAt && now - comp.lastFedAt < COOL_DOWN) {
      const wait = Math.ceil((COOL_DOWN - (now - comp.lastFedAt)) / 1000 / 60)
      onDone(l(`它刚吃饱，还在打嗝呢！(还需要等待 ${wait} 分钟)`, `It just ate and is still burping! (Need to wait ${wait} minutes)`), { display: 'system' })
      return
    }
    
    feedCompanion(comp)
    gainXP(comp, 15)
    onDone(l(`🍎 吧唧吧唧... ${comp.name} 吃得很开心！经验值大幅提升 (XP +15)！`, `🍎 Munch munch... ${comp.name} is eating happily! XP increased significantly (XP +15)!`), { display: 'system' })
  }, [])
  return null
}

function BuddyFree({ onDone, arg }: { onDone: LocalJSXCommandOnDone, arg: string }) {
  useEffect(() => {
    const idx = parseInt(arg, 10) - 1
    const { released } = releaseCompanion(idx)
    if (!released) {
      onDone('放生失败：可能是序号错啦，或者是你只剩最后一只小伙伴了，舍不得放生！', { display: 'system' })
      return
    }
    
    const active = getCompanion()
    if (active) {
      // 返还等级 * 7的感悟精华给主宠
      const inheritVal = (released.level ?? 1) * 7
      gainXP(active, inheritVal)
      onDone(l(`🍃 你将 ${released.name} 放归了赛博荒野。\n它在临走前转身看了看你，留下了一股精纯的感悟精华，使 ${active.name} 获得了 ${inheritVal} XP！`, 
               `🍃 You released ${released.name} into the cyber wilds.\nIt looked back at you before leaving, leaving a pure essence which gave ${active.name} ${inheritVal} XP!`), { display: 'system' })
    } else {
      onDone(l(`🍃 你将 ${released.name} 放归了赛博荒野。`, `🍃 You released ${released.name} into the cyber wilds.`), { display: 'system' })
    }
  }, [])
  return null
}

function BuddyExplore({ onDone, context }: { onDone: LocalJSXCommandOnDone, context: ToolUseContext }) {
  const [loading, setLoading] = useState(false)
  const [comp] = useState(() => getCompanion())
  const calcMaxHp = (stats: CompanionBones['stats']) => (stats.PATIENCE || 10) * 2 + 50
  const calcMaxSp = (stats: CompanionBones['stats']) => (stats.WISDOM || 10) + 20

  const rollExploreReward = (pet: Companion) => {
    const wisdom = pet.stats.WISDOM || 10
    const luck = Math.random() + wisdom / 200
    if (luck > 1.2) {
      return {
        tierLabel: l('神话奇遇', 'Mythic Find'),
        xp: 50,
        hp: 8,
        sp: 15,
      }
    }
    if (luck > 0.9) {
      return {
        tierLabel: l('稀有收获', 'Rare Haul'),
        xp: 40,
        hp: 4,
        sp: 8,
      }
    }
    return {
      tierLabel: l('普通探索', 'Routine Scout'),
      xp: 30,
      hp: 0,
      sp: 4,
    }
  }

  useEffect(() => {
    if (!comp) {
        onDone('你需要有一只可以出门的小伙伴。', { display: 'system' })
        return
    }

    const DURATION = 3 * 60 * 1000 // 3分钟一趟
    const now = Date.now()
    
    if (!comp.exploreStartedAt) {
      updateExploreState(comp, now)
      onDone(l(`✨ ${comp.name} 带上小包裹，背上行囊，踏上了荒野探险的旅途！`, `✨ ${comp.name} packed a bag and started the expedition! Check back in 3 mins.`), { display: 'system' })
      return
    }
    
    if (now - comp.exploreStartedAt < DURATION) {
      const wait = Math.ceil((DURATION - (now - comp.exploreStartedAt)) / 1000 / 60)
      onDone(l(`🌍 ${comp.name} 还在外面野呢！(还需要等待 ${wait} 分钟)`, `🌍 ${comp.name} is still exploring! (ETA: ${wait} min)`), { display: 'system' })
      return
    }
    
    // 到了！
    setLoading(true)
    const lang = getSystemLocaleLanguage() || 'zh-CN'
    const prompt = `你是一个放置游戏的日志生成器。宠物名字叫"${comp.name}"，物种是"${comp.species}"。
它在外出探险3分钟后回来了！
请用目标语言区号（${lang}）对应的语言，写一段极其简短（50个字符左右），带点幽默或者程序员地狱笑话的探险日志，描述它遭遇了什么并带了什么回来。
不要输出其他任何格式，且只能包含一种语言。`

    const startExpedition = async () => {
        try {
            const cacheParams = await ensureCacheParams(context)

            const res = await runForkedAgent({
                promptMessages: [createUserMessage({ content: prompt })],
                cacheSafeParams: cacheParams,
                canUseTool: () => Promise.resolve({ 
                    behavior: 'deny', 
                    message: 'Buddy system limited', 
                    decisionReason: { type: 'asyncAgent', reason: 'Buddy system limited' } 
                } as any),
                querySource: 'buddy_system' as any,
                forkLabel: 'buddy_explore',
            })

            const answer = decodeEntities(extractResultText(res.messages))
            const reward = rollExploreReward(comp)
            updateExploreState(comp, undefined) // clear
            updateCompanions(list => {
              const idx = list.findIndex(p => p.hatchedAt === comp.hatchedAt && p.seed === comp.seed)
              if (idx === -1) return
              const target = list[idx]!
              const bones = target.seed ? rollWithSeed(target.seed).bones : roll(companionUserId()).bones
              const maxHp = calcMaxHp(bones.stats)
              const maxSp = calcMaxSp(bones.stats)
              target.hp = Math.min(maxHp, (target.hp ?? maxHp) + reward.hp)
              target.sp = Math.min(maxSp, (target.sp ?? maxSp) + reward.sp)
            })
            gainXP(comp, reward.xp)
            onDone(
              l(
                `🎉 ${comp.name} 探险归来啦！[${reward.tierLabel}] (XP +${reward.xp})\n🧪 额外恢复: HP +${reward.hp} / SP +${reward.sp}\n📝 探险日记：\n${answer}`,
                `🎉 ${comp.name} returned! [${reward.tierLabel}] (XP +${reward.xp})\n🧪 Bonus Recovery: HP +${reward.hp} / SP +${reward.sp}\n📝 Adventure Log:\n${answer}`,
              ),
              { display: 'system' },
            )
        } catch (e) {
            updateExploreState(comp, undefined)
            gainXP(comp, 10)
            onDone(l(`😵 探险由于信号不佳中断了: ${String(e)}`, `😵 Expedition interrupted due to poor signal: ${String(e)}`), { display: 'system' })
        }
    }

    startExpedition()
  }, [])

  if (loading) {
    return (
      <Box paddingX={1}>
        <SpinnerGlyph />
        <Text> {l('正在与小伙伴使用无线电通讯询问探险报告', 'Receiving expedition log')}...</Text>
      </Box>
    )
  }
  return null
}

function BuddyDigest({ onDone, context }: { onDone: LocalJSXCommandOnDone, context: ToolUseContext }) {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<string[]>([])
  const [comp] = useState(() => getCompanion())

  useEffect(() => {
    if (!comp) {
      onDone('你需要有一只闲置的宠物来帮你试毒。', { display: 'system' })
      return
    }

    try {
      const cwd = process.cwd()
      const searchDir = fs.existsSync(path.join(cwd, 'src')) ? path.join(cwd, 'src') : cwd
      
      const getAllFiles = (dir: string): string[] => {
        let results: string[] = []
        const list = fs.readdirSync(dir)
        list.forEach(file => {
          let f = path.join(dir, file)
          const stat = fs.statSync(f)
          if (stat && stat.isDirectory()) { 
            if (!f.includes('node_modules') && !f.includes('.git') && !f.includes('dist')) {
              results = results.concat(getAllFiles(f))
            }
          } else {
             if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.md')) {
               results.push(f)
             }
          }
        })
        return results
      }

      const files = getAllFiles(searchDir)
      if (files.length === 0) {
        onDone('小伙伴找了一圈，没发现任何好吃的代码文件！', { display: 'system' })
        return
      }

      const randomFile = files[Math.floor(Math.random() * files.length)]
      const content = fs.readFileSync(randomFile, 'utf-8').split('\n')
      const startIdx = Math.floor(Math.random() * Math.max(1, content.length - 30))
      const snippet = content.slice(startIdx, startIdx + 30).join('\n')
      const shortName = path.relative(cwd, randomFile)

      setLogs([l(`🔍 ${comp.name} 哧溜一下钻进了工作区，抱起源文件 \`${shortName}\` 第 ${startIdx + 1} 行附近的逻辑开始大快朵颐...`, 
                 `🔍 ${comp.name} sneaked into your workspace and started digesting \`${shortName}\` around line ${startIdx + 1}...`)])

      const lang = getSystemLocaleLanguage() || 'zh-CN'
      const prompt = `你是一只名为"${comp.name}"的极客小精灵（设定种族"${comp.species}"，性格特征"${String(comp.personality)}"）。
刚才你在主人的工程中找到了一段代码并吃了它。代码如下：
\`\`\`
${snippet}
\`\`\`
请你使用目标语言区号（${lang}）对应的自然语言，极其简短地（50字符以内）、充满你个性口吻且带有吐槽或赞赏性质的话语，向主人反馈这段代码的“口感”或“逻辑味道”。
直接输出台词即可，不要任何双语甚至旁白翻译。`

      const startDigest = async () => {
        try {
          const cacheParams = await ensureCacheParams(context)

          const res = await runForkedAgent({
            promptMessages: [createUserMessage({ content: prompt })],
            cacheSafeParams: cacheParams,
            canUseTool: () => Promise.resolve({ 
                behavior: 'deny', 
                message: 'Buddy system limited', 
                decisionReason: { type: 'asyncAgent', reason: 'Buddy system limited' } 
            } as any),
            querySource: 'buddy_system' as any,
            forkLabel: 'buddy_digest',
          })

          const answer = decodeEntities(extractResultText(res.messages))
          setLoading(false)
          gainXP(comp, 25)
          onDone(l(`🍽️ 代码试毒完毕！它的体质获得了大幅强化 (XP +25)！\n${comp.name} 擦了擦嘴说：\n"${answer}"`, 
                   `🍽️ Code Tasted! Its physique has been greatly strengthened (XP +25)!\n${comp.name} wiped its mouth and said:\n"${answer}"`), { display: 'system' })
        } catch (e) {
          setLoading(false)
          onDone(l(`🍽️ ${comp.name} 吃代码吃坏肚子了 (API 错误): ${String(e)}`, `🍽️ ${comp.name} got an indigestion (API Error): ${String(e)}`), { display: 'system' })
        }
      }

      startDigest()
    } catch (e) {
      setLoading(false)
      onDone(`发生错误 (Error)：${String(e)}`, { display: 'system' })
    }
  }, [])

  return (
    <Box flexDirection="column" paddingX={1}>
      {logs.map((L, i) => <Text key={i} color="magenta">{L}</Text>)}
      {loading && (
        <Box paddingTop={1}>
          <SpinnerGlyph />
          <Text dimColor> {l('它正在吧唧吧唧地品尝这块代码的业务逻辑', 'Tasting business logic')}...</Text>
        </Box>
      )}
    </Box>
  )
}

function BuddyFuse({ onDone, context, arg }: { onDone: LocalJSXCommandOnDone, context: ToolUseContext, arg: string }) {
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [resultSprite, setResultSprite] = useState<string[]>([])

  useEffect(() => {
    const list = getCompanions()
    const parts = arg.trim().split(/\s+/)
    if (parts.length < 2) {
      onDone('请提供两只要融合的宠物序号！例如：/buddy fuse 1 2', { display: 'system' })
      return
    }

    const idx1 = parseInt(parts[0]!, 10) - 1
    const idx2 = parseInt(parts[1]!, 10) - 1

    if (idx1 === idx2) {
      onDone('自己怎么和自己融合！', { display: 'system' })
      return
    }

    const p1 = list[idx1]
    const p2 = list[idx2]

    if (!p1 || !p2) {
      onDone(`找不到对应的宠物。当前只有 ${list.length} 只宠物！`, { display: 'system' })
      return
    }

    if (list.length <= 1) {
        onDone(l('数量不足以进行融合。', 'Not enough buddies to fuse.'), { display: 'system' })
        return
    }

    setLogs([l(`🧬 正在将 [${p1.species}]${p1.name} 和 [${p2.species}]${p2.name} 放入赛博提纯炉...`, `🧬 Initiating Cyber Fusion for [${p1.species}]${p1.name} and [${p2.species}]${p2.name}...`)])
    setLoading(true)

    const lang = getSystemLocaleLanguage() || 'zh-CN'
    const prompt = `你是一个赛博怪兽合成器。
现在我要把这两只宠物进行变异融合：
1. 名字"${p1.name}"，物种"${p1.species}"，性格"${String(p1.personality)}"
2. 名字"${p2.name}"，物种"${p2.species}"，性格"${String(p2.personality)}"

请你生成这只全新变异体的：
1. 新名字（必须结合父母双方的名字特征，要非常搞怪或中二）
2. 性格描述短语并包含两句话（体现出两种物种的杂交特征或是精神分裂状态）

注意：名字和性格必须使用目标语言区号（${lang}）对应的系统语言！
请严格只返回一个 JSON 格式，不要包含任何 markdown 代码块或解释！
格式必须为：{"name": "...", "personality": ["...", "..."]}`

    const startFuse = async () => {
      try {
        const cacheParams = getLastCacheSafeParams() || {
          systemPrompt: context.renderedSystemPrompt || asSystemPrompt(['You are a helpful assistant.']),
          userContext: await getUserContext(),
          systemContext: await getSystemContext(),
          toolUseContext: context,
          forkContextMessages: context.messages || [],
        }

        const res = await runForkedAgent({
          promptMessages: [createUserMessage({ content: prompt })],
          cacheSafeParams: cacheParams,
          canUseTool: () => Promise.resolve({ 
              behavior: 'deny', 
              message: 'Buddy system limited', 
              decisionReason: { type: 'asyncAgent', reason: 'Buddy system limited' } 
          } as any),
          querySource: 'buddy_system' as any,
          forkLabel: 'buddy_fuse',
        })

        let data
        const answer = decodeEntities(extractResultText(res.messages))
        try {
            const raw = answer.replace(/```json/g, '').replace(/```/g, '').trim()
            data = JSON.parse(raw)
        } catch (e) {
            data = { name: `${p1.name}与${p2.name}的融合物`, personality: ['疯狂突变'] }
        }

      const newBones: CompanionBones = {
          species: p1.species, // 脸继承自一方
          rarity: p2.rarity, // 体格继承自另一方
          eye: p1.eye,
          hat: p2.hat,
          shiny: p1.shiny || p2.shiny,
          stats: {
              PATIENCE: Math.max(p1.stats.PATIENCE, p2.stats.PATIENCE),
              SNARK: Math.max(p1.stats.SNARK, p2.stats.SNARK),
              WISDOM: Math.max(p1.stats.WISDOM, p2.stats.WISDOM),
              DEBUGGING: Math.max(p1.stats.DEBUGGING, p2.stats.DEBUGGING),
              CHAOS: Math.min(100, (p1.stats.CHAOS || 10) + (p2.stats.CHAOS || 10))
          }
      }
      
      const soul: CompanionSoul = {
          name: data.name || '疯狂缝合怪',
          personality: Array.isArray(data.personality) ? data.personality.join(', ') : (data.personality || '精分')
      }

      saveGlobalConfig(cfg => {
          let companions = [...(cfg.companions || (cfg.companion ? [cfg.companion] : []))]
          const maxHp = (newBones.stats.PATIENCE || 10) * 2 + 50
          const maxSp = (newBones.stats.WISDOM || 10) + 20
          const fused: StoredCompanion = {
              ...soul,
              hatchedAt: Date.now(),
              seed: Math.random().toString(36).substring(7),
              fusedBones: newBones,
              level: Math.max(p1.level ?? 1, p2.level ?? 1) + 1,
              xp: 0,
              hp: maxHp,
              sp: maxSp,
              lastUpdatedAt: Date.now(),
          }
          
          const indices = [idx1, idx2].sort((a,b) => b - a)
          companions.splice(indices[0]!, 1)
          companions.splice(indices[1]!, 1)
          companions.push(fused)
          
          return { ...cfg, companions, activeCompanionIndex: companions.length - 1 }
      })

        setLoading(false)
      const previewCompanion: Companion = {
        ...newBones,
        ...soul,
        hatchedAt: Date.now(),
        level: Math.max(p1.level ?? 1, p2.level ?? 1) + 1,
        xp: 0,
      }
      const sprite = renderSprite(previewCompanion, 0)
      setResultSprite(sprite)
      setLogs(prev => [...prev, l(`💥 融合成功！一只崭新的 Lv.${Math.max(p1.level ?? 1, p2.level ?? 1) + 1} 极品缝合怪诞生了！`, `💥 Fusion Complete! A brand new Lv.${Math.max(p1.level ?? 1, p2.level ?? 1) + 1} mutant has been born!`)])
      onDone(l('大工程！由于强烈的羁绊，它已跑到前台跟随。', 'Grand project! Due to a strong bond, it is now your ACTIVE companion.'), { display: 'system' })
    } catch (e) {
        setLoading(false)
        onDone(l(`融合失败，反应炉炸开了: ${String(e)}`, `Fusion Failed! The reactor exploded: ${String(e)}`), { display: 'system' })
      }
    }

    startFuse()

  }, [])

  return (
    <Box flexDirection="column" paddingX={1}>
      {logs.map((L, i) => <Text key={i} color="yellow">{L}</Text>)}
      {loading && (
        <Box paddingTop={1}>
          <SpinnerGlyph />
          <Text dimColor> {l('AI 正在暴力揉捏这两条灵魂', 'AI is mashing these two souls together')}...</Text>
        </Box>
      )}
      {!loading && resultSprite.length > 0 && (
         <Box paddingTop={1} flexDirection="column">
            {resultSprite.map((line, i) => <Text key={i} color="cyan">{line}</Text>)}
         </Box>
      )}
    </Box>
  )
}

function BuddyRaid({ onDone }: { onDone: LocalJSXCommandOnDone }) {
  const [allPets] = useState(() => getCompanions())
  const [activeIdx, setActiveIdx] = useState(() => {
    const config = getGlobalConfig()
    const def = config.activeCompanionIndex ?? 0
    return allPets[def] ? def : 0
  })
  
  const calcMaxHp = (stats: CompanionBones['stats']) => (stats.PATIENCE || 10) * 2 + 50
  const calcMaxSp = (stats: CompanionBones['stats']) => (stats.WISDOM || 10) + 20

  const [partyHp, setPartyHp] = useState(() => allPets.map(p => p.hp ?? calcMaxHp(p.stats)))
  const [partySp, setPartySp] = useState(() => allPets.map(p => p.sp ?? calcMaxSp(p.stats)))
  const partyHpRef = React.useRef(partyHp)
  const partySpRef = React.useRef(partySp)
  
  const myPet = allPets[activeIdx]
  const myHp = myPet ? partyHp[activeIdx] : 0
  const mySp = myPet ? partySp[activeIdx] : 0

  const [bossHp, setBossHp] = useState(() => allPets.reduce((acc, p) => acc + calcMaxHp(p.stats), 0) + 500)
  const bossMaxHp = allPets.reduce((acc, p) => acc + calcMaxHp(p.stats), 0) + 500
  const bossName = l('【深渊首领】NullPointerException', '[Abyss Boss] NullPointerException')

  const [logs, setLogs] = useState<string[]>([l(`⚠️ 警告！时空裂缝撕开，${bossName} 降临了！无法执行捕获！`, `⚠️ WARNING! Space-time rift torn, ${bossName} has arrived! Capture disabled!`)])
  const [status, setStatus] = useState<'active'|'victory'|'fled'>('active')
  const [defending, setDefending] = useState(false)
  const defendingRef = React.useRef(false)

  const addLog = (l: string) => setLogs(prev => [...prev.slice(-4), l])

  const finishRaid = (isVictory: boolean) => {
    const hpSnapshot = partyHpRef.current
    const spSnapshot = partySpRef.current
    updateCompanions(list => {
      list.forEach((p, i) => {
        // Sync HP/SP back to storage
        if (i < hpSnapshot.length) p.hp = hpSnapshot[i]
        if (i < spSnapshot.length) p.sp = spSnapshot[i]
        
        if (isVictory) {
          // Massive Level up logic
          let lv = p.level || 1
          let xp = (p.xp || 0) + 100
          const xpNeeded = (lv: number) => lv * 20 + 20
          while (xp >= xpNeeded(lv)) {
            xp -= xpNeeded(lv)
            lv += 1
          }
          p.xp = xp
          p.level = lv
        } else {
          // Penalty
          p.xp = Math.max(0, (p.xp || 0) - 20)
        }
      })
    })
  }

  const enemyTurn = (targetTargetIdx?: number) => {
    const curIdx = targetTargetIdx ?? activeIdx
    const curPet = allPets[curIdx]
    if (bossHp <= 0) {
      addLog('首领轰然倒塌，化为了无数的代码碎屑！你们赢了！(Boss defeated!)')
      finishRaid(true)
      addLog('全队获得了 100 点海量 XP。(Massive +100 XP to entire party!)')
      setTimeout(() => onDone(undefined, { display: 'skip' }), 3000)
      setStatus('victory')
      return
    }
    
    // Boss attacks (Hits like a truck)
    let dmg = Math.floor(40 + Math.random() * 60)
    
    if (defendingRef.current) {
      dmg = Math.floor(dmg / 3)
      defendingRef.current = false
      setDefending(false)
    }

    setPartyHp(prev => {
      const next = [...prev]
      if (next[curIdx] <= 0) return next 
      next[curIdx] = Math.max(0, next[curIdx] - dmg)
      partyHpRef.current = next
      addLog(`${bossName} 爆发出了一阵红光，对 ${curPet!.name} 造成了惊人的 ${prev[curIdx]! - next[curIdx]!} 点碾压伤害 (Massive hit)!`)
      
      if (next[curIdx] <= 0) {
        const hasAlive = next.some(hp => hp > 0)
        if (hasAlive) {
          addLog(`${curPet!.name} 倒下了！快换下一个宠物！(Fainted! Press [T] to swap!)`)
        } else {
          addLog('全军覆没！你的整个团队都被深渊吞噬了！(Party WIPED OUT!)')
          setStatus('fled')
          setTimeout(() => {
            finishRaid(false)
            onDone('讨伐失败。队伍大伤元气，各自流失了 20 点 XP。(Raid failed. -20 XP penalty to all members.)', { display: 'system' })
          }, 3000)
        }
      }
      return next
    })
  }

  const handleAction = useCallback((action: 'A'|'S'|'D'|'R'|'T') => {
    if (status !== 'active') return
    if (!myPet) {
      onDone('你必须先获得一只宠物才能挑战首领！(Need a pet to raid!)', { display: 'system' })
      return
    }

    if (action === 'R') {
      addLog('你在绝望中按下了 Ctrl+C 强制逃离了战场... (Forced abort...)')
      setStatus('fled')
      setTimeout(() => {
          finishRaid(false)
          onDone('讨伐中途溃败，队伍士气低落，均流失了 20 点 XP。(Raid aborted. -20 XP penalty.)', { display: 'system' })
      }, 1000)
      return
    }

    if (action === 'T') {
      const nextIdx = partyHp.findIndex((hp, i) => hp > 0 && i > activeIdx)
      const targetIdx = nextIdx !== -1 ? nextIdx : partyHp.findIndex(hp => hp > 0)
      if (targetIdx === -1 || targetIdx === activeIdx) {
        addLog('没有其他存活的宠物可以换了！(No other alive pets available!)')
        return
      }
      const isFainted = partyHp[activeIdx]! <= 0
      setActiveIdx(targetIdx)
      addLog(`决不认输！换上了 ${allPets[targetIdx]!.name}！(Swapped buddy!)`)
      
      if (!isFainted) {
        setTimeout(() => enemyTurn(targetIdx), 500)
      }
      return
    }

    if (myHp <= 0) {
       addLog('当前宠物已倒下！请按 [T] 接力。 (Fainted! Press T to swap.)')
       return
    }

    if (action === 'D') {
      defendingRef.current = true
      setDefending(true)
      addLog(`${myPet.name} 采取了绝对防守姿态 (Absolute Defense).`)
      enemyTurn(activeIdx)
      return
    }

    if (action === 'A') {
      const atk = myPet.stats.SNARK || 10
      const dmg = Math.max(1, Math.floor(atk * 0.4 + (Math.random() * (myPet.stats.CHAOS || 10) * 0.2)))
      setBossHp(prev => {
        const next = Math.max(0, prev - dmg)
        addLog(`${myPet.name} 发起了毫无畏惧的普攻，造成 ${prev - next} 点伤害！(Basic Attack!)`)
        return next
      })
      setTimeout(() => enemyTurn(activeIdx), 500)
      return
    }

    if (action === 'S') {
      if (mySp < 20) {
        addLog('精力(SP)不足！(Not enough SP!)')
        return
      }
      setPartySp(prev => {
        const next = [...prev]
        next[activeIdx]! -= 20
        partySpRef.current = next
        return next
      })
      const matk = myPet.stats.WISDOM || 10
      const dmg = Math.max(5, Math.floor(matk * 0.8 + (Math.random() * 20)))
      setBossHp(prev => {
        const next = Math.max(0, prev - Math.floor(dmg))
        addLog(`${myPet.name} 释放了毁天灭地的绝技！造成 ${prev - next} 点伤害！(Devastating Spell!)`)
        return next
      })
      setTimeout(() => enemyTurn(activeIdx), 500)
      return
    }
  }, [status, myPet, bossHp, bossMaxHp, myHp, partyHp, activeIdx, allPets, mySp, onDone])

  const handleKeyDown = useCallback(
    (e: { key: string; ctrl?: boolean; preventDefault: () => void }) => {
      if (status !== 'active') return
      const k = e.key.toUpperCase()
      if (['A', 'S', 'D', 'R', 'T'].includes(k)) {
        e.preventDefault()
        handleAction(k as any)
      } else if (e.key === 'escape' || (e.ctrl && (k === 'C' || k === 'D'))) {
        e.preventDefault()
        onDone(undefined, { display: 'skip' })
      }
    },
    [status, handleAction, onDone]
  )

  if (!myPet) {
    onDone('队伍为空！', { display: 'system' })
    return null
  }

  const mySprite = renderSprite(myPet, 0)
  const bossSprite = [
    "   █▓▒░",
    " ▟██████▙",
    " ██ ☠️  ██",
    " ▜██████▛",
    "  ██████",
    "  / || \\",
  ]

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} tabIndex={0} autoFocus={true} onKeyDown={handleKeyDown}>
      <Text bold color="bgRed" backgroundColor="white"> === ⚠️ 深渊首领讨伐战 (RAID) ⚠️ === </Text>
      <Box flexDirection="row" justifyContent="space-between" paddingTop={1}>
        <Box flexDirection="column" width="40%">
          <Text color="cyan">{myPet.name}</Text>
          <Text dimColor>HP: {Math.floor(myHp)} / {calcMaxHp(myPet.stats)}</Text>
          <Text dimColor>SP: {Math.floor(mySp)} / {calcMaxSp(myPet.stats)}</Text>
          <Box paddingTop={1} flexDirection="column">
            {mySprite.map((line, i) => <Text key={i}>{line}</Text>)}
          </Box>
        </Box>
        <Box flexDirection="column" width="20%">
          <Text bold color="red">   VS   </Text>
        </Box>
        <Box flexDirection="column" width="40%">
          <Text color="red" bold>{bossName}</Text>
          <Text dimColor color="red">HP: {Math.floor(bossHp)} / {bossMaxHp}</Text>
          <Box paddingTop={1} flexDirection="column">
            {bossSprite.map((line, i) => <Text key={i} color="red">{line}</Text>)}
          </Box>
        </Box>
      </Box>

      <Box flexDirection="column" paddingTop={1} minHeight={4}>
        {logs.map((L, i) => <Text italic key={i} color={i === logs.length - 1 ? 'white' : 'red'}>&gt; {L}</Text>)}
      </Box>
      
      {status === 'active' ? (
        <Box paddingTop={1}>
          <Text>{l('操作：', 'Actions: ')}  </Text>
          {myHp > 0 ? (
            <>
              <Text color="green" bold>[A]</Text><Text> {l('攻击', 'Attack')}  </Text>
              <Text color="blue" bold>[S]</Text><Text> {l('绝招(20SP)', 'Special(20SP)')}  </Text>
              <Text color="yellow" bold>[D]</Text><Text> {l('防守', 'Defense')}  </Text>
            </>
          ) : <Text color="red">{l('当前已阵亡', 'Currently fainted')}  </Text>}
          <Text color="cyan" bold>[T]</Text><Text> {l('换主力', 'Swap')}  </Text>
          <Text dimColor bold>[R]</Text><Text dimColor>{l('逃跑', 'Run')}</Text>
        </Box>
      ) : (
        <Text dimColor>{l('史诗级讨伐已结束。', 'Epic Raid Finished.')}</Text>
      )}
    </Box>
  )
}

const BuddyDisable: React.FC<{ onDone: LocalCommandResult['onDone'] }> = ({ onDone }) => {
  React.useEffect(() => {
    const config = getGlobalConfig()
    saveGlobalConfig(cfg => ({ ...cfg, buddyDisabled: true }))
    onDone(l('🚫 Buddy 系统已禁用。小精灵们已回到了数字荒野中。', '🚫 Buddy system disabled. Companions returned to the digital wild.'), { display: 'system' })
  }, [])
  return null
}

const BuddyEnable: React.FC<{ onDone: LocalCommandResult['onDone'] }> = ({ onDone }) => {
  React.useEffect(() => {
    const config = getGlobalConfig()
    saveGlobalConfig(cfg => ({ ...cfg, buddyDisabled: false }))
    onDone(l('✅ Buddy 系统已启用！欢迎回来！', '✅ Buddy system enabled! Welcome back!'), { display: 'system' })
  }, [])
  return null
}

export const call: LocalJSXCommandCall = async (onDone, context, args) => {
  const argsTrimmed = args.trim()
  const subcommand = argsTrimmed.split(/\s+/)[0]?.toLowerCase() || ''
  const argValue = argsTrimmed.substring(subcommand.length).trim()

  const config = getGlobalConfig()
  const isDisabled = config.buddyDisabled

  if (isDisabled && subcommand !== 'enable' && subcommand !== '开启') {
    onDone(
      l('⚠️ Buddy 系统当前处于禁用状态。运行 /buddy enable 来唤醒小精灵。', '⚠️ Buddy system is currently disabled. Run /buddy enable to wake up your companions.'),
      { display: 'system' }
    )
    return null
  }

  switch (subcommand) {
    case 'enable':
    case '开启':
      return <BuddyEnable onDone={onDone} />
    case 'disable':
    case '关闭':
      return <BuddyDisable onDone={onDone} />
    case 'pet':
    case '摸摸':
      return <BuddyPet onDone={onDone} />
    case 'list':
      return <BuddyList onDone={onDone} />
    case 'swap':
      return <BuddySwap onDone={onDone} arg={argValue} />
    case 'wild':
    case 'encounter':
      return <BuddyEncounter onDone={onDone} context={context} />
    case 'mute':
    case '静音':
      return <BuddyMute onDone={onDone} mute={true} />
    case 'unmute':
    case '取消静音':
      return <BuddyMute onDone={onDone} mute={false} />
    case 'rename':
    case '改名':
      return <BuddyRename onDone={onDone} arg={argValue} context={context} />
    case 'feed':
      return <BuddyFeed onDone={onDone} />
    case 'free':
    case 'release':
      return <BuddyFree onDone={onDone} arg={argValue} />
    case 'explore':
      return <BuddyExplore onDone={onDone} context={context} />
    case 'digest':
    case 'evaluate':
      return <BuddyDigest onDone={onDone} context={context} />
    case 'fuse':
    case '融合':
      return <BuddyFuse onDone={onDone} context={context} arg={argValue} />
    case 'raid':
    case 'boss':
      return <BuddyRaid onDone={onDone} />
    default:
      return <BuddyMain onDone={onDone} context={context} />
  }
}
