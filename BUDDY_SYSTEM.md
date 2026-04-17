# 🐾 Buddy (Companion) System Guide

Welcome to UniCore's built-in interactive pet module: **Buddy**.
Your companion follows you while you code, think, battle, and explore, and can trigger idea bubbles plus title drops over time.

Buddy is enabled by default. If you turned it off before, re-enable it with:

```bash
/buddy enable
```

If you want Buddy to take a break (hide display and stop reactions), use:

```bash
/buddy disable
```

---

## 💬 Command Reference (Detailed)

### `/buddy`
**What it does**: Opens your active companion profile card.  
**Shows**:
- Name, personality, species, rarity, level, current XP
- Current HP / SP
- Unlocked titles
- Next title + progress percentage
- Full stat bars (PATIENCE/SNARK/WISDOM/DEBUGGING/CHAOS)

---

### `/buddy pet`
**What it does**: Daily affection interaction.  
**Effect**: `XP +5`.

---

### `/buddy list`
**What it does**: Lists all owned companions.  
**Shows**:
- Index number
- Species, level, rarity
- Which one is `ACTIVE`
- Latest unlocked title (if any)

---

### `/buddy swap [number]`
**What it does**: Switches active companion.  
**Example**: `/buddy swap 2`

---

### `/buddy rename [new-name]`
**What it does**: Renames your active companion.  
**Two modes**:
- With argument: manual rename (for example `/buddy rename Overclock Beast`)
- Without argument: AI regenerates name + personality text

---

### `/buddy feed`
**What it does**: Feeds your companion.  
**Effect**:
- `XP +15`
- `SP +20` (capped at max SP)
- Cooldown: **5 minutes**

---

### `/buddy wild` or `/buddy encounter`
**What it does**: Starts turn-based wild battle.  
**Battle actions**:
- `[A]` Basic attack: damage from `SNARK` + `CHAOS`
- `[S]` Special attack: costs `20 SP`, scales with `WISDOM`
- `[D]` Defend: active damage reduction for the incoming hit
- `[C]` Capture: lower HP means higher capture chance
- `[T]` Swap: switch to another alive companion
- `[R]` Run: immediate retreat

**Outcome rules**:
- Successful capture: active companion gets `+20 XP`
- Defeat wild target (without capture): active companion gets `+15 XP`
- Run: whole party gets `-10 XP`
- Party wipe: whole party gets `-10 XP`

---

### `/buddy raid` or `/buddy boss`
**What it does**: Starts boss raid (capture disabled).  
**Notes**:
- Very high boss HP, team rotation (`[T]`) is important
- Defend damage reduction is active

**Outcome rules**:
- Victory: whole party gets `+100 XP`
- Run or fail: whole party gets `-20 XP`

---

### `/buddy explore`
**What it does**: Sends your active companion on an expedition.  
**Flow**:
1. First use: starts expedition timer
2. After `3 minutes`: use again to resolve rewards and get expedition log text

**Reward tiers**:
- Routine: `XP +30`, `HP +0`, `SP +4`
- Rare: `XP +40`, `HP +4`, `SP +8`
- Mythic: `XP +50`, `HP +8`, `SP +15`

---

### `/buddy digest` or `/buddy evaluate`
**What it does**: Code-tasting interaction.
Buddy samples workspace code and returns flavor commentary.

**Effect**: `XP +25`.

---

### `/buddy fuse [index1] [index2]`
**What it does**: Irreversibly fuses two companions.  
**Fusion behavior**:
- Fused appearance/stats are preserved
- New fused companion becomes ACTIVE
- New fused companion starts at full HP/SP

---

### `/buddy free [number]` or `/buddy release [number]`
**What it does**: Irreversibly releases a companion.  
**Compensation**: Active companion gains `releasedLevel * 7` XP.

---

### `/buddy mute` / `/buddy unmute`
**What it does**: Mutes/unmutes companion reaction bubbles.  
**Note**: This only affects reaction display, not pet data.

---

### `/buddy enable` / `/buddy disable`
**What it does**: Global Buddy power switch.  
**Note**: Setting is persisted across restarts.

---

## ✨ Interaction Triggers (How Buddy “talks”)

Buddy idea/reaction output comes from 3 channels:

### 1) Typing trigger (`coding` / `question`)
Triggered while you type, typically when:
- Enough time has passed since last same-type trigger (~`15s`)
- Input has meaningful growth and length (roughly `18+` chars)
- A meaningful boundary appears (`?`, newline, `)`, `;`, `}`)

### 2) Thinking pause trigger (`thinking`)
If input is long enough and you pause, Buddy may trigger after about `7s`, with a longer per-type cooldown (~`30s`).

### 3) Turn observer trigger
After model turns, Buddy may post short in-character reactions. Mentioning Buddy by name makes reaction more likely.

---

## 🏅 Title System (Milestones + Random Drops)

Titles unlock in two ways:

1. **Milestone unlocks**: deterministic thresholds from interaction stats  
2. **Random drops**: weighted RNG among eligible title candidates

### Current per-kind cooldowns
- `coding`: 15s
- `thinking`: 30s
- `question`: 12s

### Current base drop chances
- `coding`: 12%
- `question`: 10%
- `thinking`: 8%

### Pity behavior
- Missed drops increase pity counter
- At threshold, drop attempt becomes guaranteed
- Successful drop resets pity

### Current title pool
- Syntax Sniffer / Flow Channeler / Question Hunter / Pairing Oracle
- Bug Trapper / Mind Gardener / Architecture Owl / Soul Partner
- Stack Trace Diver / Lint Whisperer / Merge Conflict Tamer / Breakpoint Ranger
- Refactor Ritualist / Null Guardian / Cache Alchemist / Commit Bard
- Rubber Duck Archmage / Semicolon Sorcerer

---

## 📊 Stats and Recovery

### Core formulas
- `MaxHP = PATIENCE * 2 + 50`
- `MaxSP = WISDOM + 20`
- Level requirement: `lv * 20 + 20`

### Auto recovery
- HP: `+1` every `30s`
- SP: `+1` every `45s`
- Both are capped at max values

---

## ❓ FAQ

### 1) Why is Buddy not reacting?
Check:
- Buddy is not muted
- Trigger conditions are met (input length, pause, cooldown)
- Same-type trigger is not currently cooling down

### 2) Why are title drops slow?
Mix all three interaction paths (`coding`, `thinking`, `question`) instead of farming one path only.

### 3) Why does UI sometimes look condensed?
That is usually a UI display branch, not companion data loss.

---

Happy coding with your Buddy.
