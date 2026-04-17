# 🐾 Companion (Buddy) System User Guide

Welcome to the hidden entertainment module built into UniCore: **The Companion (Buddy) System**! In between busy coding sessions, a little ASCII-art sprite will always be by your side right next to your terminal input bar.

By default, this feature is built-in and enabled. Just start UniCore, and you'll see a companion next to your input line. If you previously disabled it, you can re-enable it using:

```bash
/buddy enable
```

Once enabled, you'll find an incubating egg or a newborn pixel pet. If you want to take a break (hide displays and notifications), you can type `/buddy disable` at any time.

## 💬 Core Commands Overview

In the terminal exchange interface, simply type the following commands starting with `/buddy` to interact with your pet:

### `/buddy`
**Description**: View the profile card of your currently active (following) companion.
**Details**: Displays its pixel appearance, name, personality, and its 5-dimensional RPG stats along with its rarity distribution.

### `/buddy pet` 
**Description**: Pet your little companion.
**Effect**: A heart effect will pop up on the pet's interface, and it will gain a small amount of experience (**XP +5**). Keep nurturing it, and it will level up!

### `/buddy wild` or `/buddy encounter` 
**Description**: 🎮 **Core Gameplay**. Go on an adventure in the cyber world and encounter a random wild mystery pet for a turn-based battle!
**Encounter Panel Actions**:
- `[A]` Attack: A normal physical attack calculated using your main pet's snark value (`SNARK`) and chaos factor.
- `[S]` Special Attack: Because casting spells costs stamina (`SP`), it has extremely high stable damage! Decided by your wisdom value (`WISDOM`).
- `[D]` Defend: Retreat into your shell and massively reduce the monster's incoming attack damage this turn.
- `[C]` Capture: Throw a Pokeball! **Remember, the lower you weaken the wild pet's health (HP), the higher the capture success rate.** Throwing a ball right at the start is very unlikely to succeed.
- `[T]` Team Relay: Swap your currently active buddy with another healthy companion from your backpack. Essential when your current pet faints!
- `[R]` Run: If you can't beat them, run!

*Note:*
*1. Winning a battle or successfully capturing a new pet will reward your active companion with generous combat experience (XP) bonuses!*
*2. Tucking tail and Running, or suffering a total Party Wipe (all companions reach 0 HP), will invoke a **severe penalty** where your entire team suffers a heavy loss of XP (-10).*

### `/buddy list`
**Description**: Check your "Pet Storage Backpack" list.
**Details**: A glance at all the little guys you have hatched and captured. The list will detail and track their levels and species statuses.

### `/buddy swap [number]`
**Description**: Switch the pet displayed on the bottom right of your input bar.
**Example**: If you want to set the 2nd captured Cat in your list as your active follower, simply type `/buddy swap 2` to switch instantly. Subsequent leveling and battles will default to this one.

### `/buddy feed`
**Description**: Daily care. Feed your starving mascot!
**Effect**: Throwing them a snack grants a massive satisfaction XP boost (**XP +15**)! Note that this action has a 5-minute real-time cooldown to prevent overfeeding. Check back often!

### `/buddy explore`
**Description**: ⛺ **Idle Expedition Feature**. Pack a bag for your active pet and send them on a journey entirely on their own!
**Effect**: A proper expedition takes roughly 3 real-world minutes. If dispatched, repeated use of this command shows their estimated time of return. Once they are back, trigger it again to secure substantial idle rewards (**XP +30**) and read an **AI-generated personalized adventure log**, which is completely uniquely generated based on their personality and current environment!

### `/buddy digest` or `/buddy evaluate`
**Description**: ☢️ **Break the 4th Wall: Code Taster**. Let your pet secretly snack on your codebase!
**Effect**: The agent randomly pulls lines from a source code file within your immediate workspace (e.g., `./src`) and forces your pet to "eat" it. The built-in AI will then roleplay your pet to ruthlessly review or praise your code block based on their unique personality. Not only do you get a hilarious AI code review, but your pet also earns a massive 25 XP!

### `/buddy raid` or `/buddy boss`
**Description**: 🐉 **Epic Raid: Abyss Siege**. Tag team an overpowered Bug Boss using your entire pet storage!
**Effect**: Summons a deeply terrifying `【Abyss Lord】NullPointerException` boss whose hit points scale to the combined maximum health of your entire party. Put your `[T] Relay Swap` skills to the final test! Be careful—if you survive this relentless team-wide barrage and slay the bug, all standing pets will be crowned with a majestic +100 XP enlightenment bonus!

### `/buddy fuse [id1] [id2]`
**Description**: 🧬 **Cyber Alchemy: Genetic Fusion**. Sacrifice two benched pets to amalgamate a horrifying titan.
**Effect**: Append two roster numbers (e.g., `/buddy fuse 1 2`). The AI model physically sutures their names, species, and personalities into a literal "hybrid monstrosity." The offspring inherits the maximum stat values of both parents and develops uniquely unhinged/schizophrenic lore. **Warning: Fusion is irreversible!**

### `/buddy free [number]` or `/buddy release [number]`
**Description**: Storage management. Release your unwanted or duplicate wild catches back into the cyber wild.
**Effect**: Releasing a pet is permanent! However, as a parting gift, the released companion will convert its accumulated levels into pure "Essence of Enlightenment" and pass it safely onto your active follower, giving your main pet a massive one-time XP boost scaled by the released pet's level.

### `/buddy rename [custom name]`
**Description**: Reutilize the power of AI to weave a new soul, or manually attach a sticker tag with their name.
**Effect**: Using the command alone triggers the AI to wipe their memory and forge a completely new, snarky personality. However, by appending a parameter (e.g., `/buddy rename Godzilla`), you exert your god-given right to manually overwrite their name instantly!

### `/buddy mute` / `/buddy unmute`
**Description**: Toggle the "chatterbox" mute status of your companion.
**Effect**: There might be times when you don't want your pet to frequently pop up speech bubbles due to terminal inputs, so use the mute command.

### `/buddy enable` / `/buddy disable`
**Description**: Master power switch for the Buddy system.
**Effect**: If you want to completely turn off pet display, hide the sidebar footprint, and stop all background notifications, use `disable`; use `enable` to bring them back. This setting is automatically persisted across UniCore restarts.


## 📊 Stats System Dictionary

From birth, every pet is endowed with the following stats panel, which not only affects their personality description but also dictates their hard power during wild encounters:

- **PATIENCE**: The defense line. Determines the Maximum Health Points (MAX HP). The higher, the more hits it can take.
- **SNARK**: Primary combat ability. Determines the physical damage dealt by each normal attack.
- **WISDOM**: High-energy strikes. Affects the power of special moves and the maximum stamina gauge (MAX SP) during each encounter.
- **DEBUGGING**: Critical hit rate. (Reserved for hidden trait systems).
- **CHAOS**: Extreme lows and extreme highs. The higher this value, the more Schrödinger's random fluctuations it will show during normal attacks and evasions.

---

*Wishing you a bountiful journey of both coding and capturing in UniCore!*
