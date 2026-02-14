# New Role Suggestions for Moonrise Werewolf

## Current Role Analysis

### Existing Roles Summary

**Evil Team (3 roles):**
- Wolf - Basic kill vote
- Kitten Wolf - One-time conversion
- Shadow Wolf - Kill + Mute ability

**Village Team (7 roles):**
- Villager - No ability (System AI gossip)
- Seer - Nightly role scan (Wolf/Villager)
- Doctor - Protect from wolf kills
- Gunner - 2 daytime bullets
- Detective - Compare two players
- Hunter - Revenge kill on death
- Revenant - One-time role absorption

### Gaps & Opportunities

1. **No Neutral Roles** - All players are binary good/evil
2. **Limited Deception Mechanics** - Only Kitten Wolf conversion
3. **No Role Blocking** - Shadow Wolf mutes chat, but no ability blocking
4. **No Investigation Manipulation** - Seer/Detective can't be fooled
5. **Limited Late-Game Swings** - Few comeback mechanics
6. **No Resource Management** - Only Gunner has limited uses
7. **No Player Protection for Wolves** - Villages has Doctor, wolves have nothing
8. **No Day-Phase Chaos** - Most abilities are night-only

---

## 🌟 NEW ROLE SUGGESTIONS

### Priority 1: High Impact, Balanced Roles

#### 1. 🎭 **The Jester** (Neutral - Solo Win)
**Team:** Neutral  
**Win Condition:** Get voted out during the day

**Mechanics:**
- Has no night ability
- Appears as "Villager" to Seer
- Shows as "Same Team" with any role to Detective (always ambiguous)
- If voted out → Jester wins alone, game continues for others
- If killed at night or by Gunner → Becomes regular ghost (no win)

**Why It's Exciting:**
- Creates paranoia - "Are they acting suspicious on purpose?"
- Makes villages second-guess obvious suspects
- Adds a third win condition to track
- Encourages wild plays and unpredictable behavior

**Implementation Notes:**
```typescript
// In schema.ts, add to gameRoleValidator
v.literal('jester')

// Win condition check
if (eliminatedPlayer.role === 'jester') {
  // Jester wins but game continues
  await ctx.db.patch(eliminatedPlayer._id, { wonAsJester: true })
  // Send special message
}
```

**Balance:** Best at 8+ players, max 1 per game

---

#### 2. 🛡️ **The Bodyguard** (Village)
**Team:** Good  
**Ability:** Protect one player per night. If that player is attacked, the Bodyguard dies instead.

**Mechanics:**
- Choose one player to guard each night
- Can guard the same player multiple nights (unlike Doctor)
- If guarded player is attacked → Bodyguard dies, target survives
- Cannot guard self
- If Bodyguard is Hunter → Revenge triggers

**Why It's Exciting:**
- Sacrificial play creates emotional moments
- Different from Doctor (trades life instead of blocking)
- Creates interesting wolf decisions (worth killing Bodyguard?)
- Synergizes with Hunter (Bodyguard-Hunter combo = revenge on protection)

**Balance:** Replace 1 Villager at 9+ players

---

#### 3. 🎪 **The Illusionist** (Evil)
**Team:** Bad  
**Ability:** Once per game, appear as "Villager" to the next Seer scan or Detective check

**Mechanics:**
- Passive ability, activates at night
- Choose to activate on any night (one-time use)
- If activated, next investigation on this player shows false result
- Seer sees "Villager" instead of "Werewolf"
- Detective comparison treats them as "Good Team"
- Buff lasts until used, then gone forever

**Why It's Exciting:**
- Counters Seer/Detective meta
- Creates false information scenarios
- "I scanned Bob, he's clear!" → Bob kills someone
- Strategic timing: Save for when you're suspected

**Balance:** Replaces regular Wolf at 10+ players

##### 🎪 Illusionist - Deep Dive

**Strategic Timing:**

When to Activate:
- ❌ **Bad:** Night 1 (too early), when not suspected, after being scanned
- ✅ **Good:** Night 2-3, when about to be suspected, after risky wolf plays

**Strategic Plays:**

**Play 1 - The Clean Slate:**
```
Night 2: Activate Illusion
Day 3: Play aggressively, act suspicious
Night 3: Seer scans you → "Villager" (FALSE)
Day 4: Seer claims "Bob is clear!"
Result: Confirmed innocent, can manipulate freely
```

**Play 2 - The Detective Trap:**
```
Night 3: Activate Illusion
Day 4: Detective compares you with Villager
Result: "Same Team" (FALSE - both different!)
Outcome: Detective thinks you're innocent
```

**Play 3 - The Bait:**
```
Chat: "Alice is very suspicious!"
Night X: Activate Illusion (anticipate scan)
Seer: "Let me check Bob who's pushing Alice"
Result: Shows "Villager", you gain trust
```

**Edge Cases:**

1. **Multiple Investigations Same Night:**
   - Only FIRST investigation is fooled
   - Seer scan = fooled, Detective after = truth

2. **Revenant Absorbs Dead Illusionist:**
   - Revenant gets FRESH Illusion ability
   - Can use it like new Illusionist

3. **Illusion Active When Killed:**
   - Illusion wasted (never triggered)
   - Oracle can check true role after death

**Counters:**
- Oracle checking dead Illusionist (shows true role)
- Multiple scans (only fools once)
- Behavioral analysis (can't fake actions)

**Synergies:**
- Shadow Wolf: Mute Seer after being cleared
- Kitten Wolf: Convert the Seer who cleared you
- Regular Wolves: Coordinate heat/scans

**Implementation:**
```typescript
// Action Panel (Night)
if (role === 'illusionist' && !roleData?.illusionUsed) {
  <button>
    {roleData?.illusionActive ? 
      "✨ Illusion Active (Waiting...)" : 
      "🎪 Activate Illusion"}
  </button>
}

// Investigation Resolution
async function resolveSeerScan(seerId, targetId) {
  const target = await getPlayer(targetId)
  
  if (target.roleData?.illusionActive) {
    // Fool the scan
    const fakeResult = target.team === 'bad' ? 'Villager' : 'Werewolf'
    
    // Consume illusion
    await ctx.db.patch(targetId, {
      roleData: { illusionActive: false, illusionUsed: true }
    })
    
    // Notify wolves
    await sendWolfChat("✨ Illusion triggered!")
    
    return fakeResult
  }
  
  return target.team === 'bad' ? 'Werewolf' : 'Villager'
}
```

**Power Level:** Medium-High
- Not as strong as Kitten Wolf conversion
- Stronger than Shadow Wolf mute
- Creates false information (very powerful)

---

#### 4. 🔮 **The Oracle** (Village)
**Team:** Good  
**Ability:** Once per game, learn the EXACT role of a dead player

**Mechanics:**
- Can activate ability starting Night 2 (needs deaths)
- Choose any dead player
- Learn their exact role (not just team)
- One-time use
- Can reveal converted players' original roles

**Why It's Exciting:**
- Confirms information from dead claims
- "John said he was Seer, let me check" → Actually Wolf
- Creates forensic investigation gameplay
- Helps village recover from misinformation

**Balance:** Replaces Detective at 8-9 players

---

#### 5. 🌙 **The Insomniac** (Village)
**Team:** Good  
**Ability:** Learns how many players used night abilities (not who or what)

**Mechanics:**
- Passive ability every night
- Receives count: "X players were active last night"
- Count includes: Wolf kills, Seer scans, Doctor saves, Shadow Wolf mutes, etc.
- Cannot identify who acted or what they did
- Just a number

**Why It's Exciting:**
- Meta-gaming info: "4 abilities used, but only 3 claimed?"
- Catches liars without direct evidence
- Math-based deduction for analytical players
- Doesn't break game (info is vague)

**Balance:** Replaces 1 Villager at 8+ players

---

### Priority 2: Advanced Mechanics

#### 6. 🗡️ **The Assassin** (Evil)
**Team:** Bad  
**Ability:** Once per game, perform a solo kill (separate from wolf pack kill)

**Mechanics:**
- Once per game, at night
- Kill happens IN ADDITION to the wolf pack kill
- Two players can die in one night (both wolf vote + Assassin)
- Cannot be blocked by Doctor (different attack type)
- Reveals self to other wolves when used

**Why It's Exciting:**
- High-risk, high-reward for wolves
- Creates "double kill" nights
- Village never expects two deaths
- Balances powerful village roles

**Balance:** Only at 11-12 players, replaces regular Wolf

---

#### 7. 🎯 **The Vigilante** (Village)
**Team:** Good  
**Ability:** Kill one player at night, but if you kill a villager, you die too

**Mechanics:**
- Can kill one player per night (limited uses: 1-2 total)
- If target is Wolf → Target dies
- If target is Villager → Both you AND target die
- Creates chaos if used wrong
- Can activate starting Night 2

**Why It's Exciting:**
- High-risk village power role
- "I'm 90% sure Bob is wolf" → Shoots → Bob was Seer → Both die
- Creates dramatic moments
- Balances by punishing poor deduction

**Balance:** 1 bullet at 8-10 players, 2 bullets at 11-12 players

---

#### 8. 🦊 **The Trickster** (Neutral)
**Team:** Neutral  
**Win Condition:** Survive until the end, regardless of who wins

**Mechanics:**
- Appears as "Villager" to Seer
- Shows as "Different Team" from everyone to Detective
- Cannot be killed at night (wolves see "Someone survived" even without Doctor)
- CAN be voted out or shot by Gunner
- Wins if alive when game ends (wins WITH the winning team)

**Why It's Exciting:**
- Impossible to kill at night creates wolf confusion
- "We killed Bob but someone survived!" → Was it Doctor or Trickster?
- True neutral - benefits from chaos
- Incentive to keep game balanced

**Balance:** Only 1 per game, appears at 10+ players

---

#### 9. 🧙 **The Witch** (Village)
**Team:** Good  
**Ability:** Has 2 potions - one heal potion (save from death), one poison potion (kill someone)

**Mechanics:**
- **Heal Potion:** Save the wolf kill target (like Doctor, but one-time)
- **Poison Potion:** Kill any player at night (one-time)
- Can use both in same game, but only one per night
- Can use poison on wolves OR villagers
- Knows who the wolves targeted (learns target before deciding to heal)

**Why It's Exciting:**
- Classic Werewolf role with dual nature
- Can save OR kill
- Risk: Poison the wrong person → Help wolves
- Info leak: "Wolves tried to kill Sarah" if Witch saves

**Balance:** Replaces Doctor at 10+ players (too powerful with Doctor)

> 📖 **[See Complete Witch Analysis](./witch-complete-analysis.md)** for:
> - Detailed gameplay impact & role distribution changes
> - Strategic plays & edge cases
> - Implementation guide & code examples
> - Testing scenarios & success metrics

---

#### 10. 🎲 **The Gambler** (Village)
**Team:** Good  
**Ability:** Once per game, during day phase, declare a player as Wolf publicly. If correct, that player dies. If wrong, you die.

**Mechanics:**
- One-time use, during day phase
- Must publicly announce in chat: "I gamble on [Player]"
- Immediate resolution:
  - If target is Wolf → Target dies (like Gunner shot)
  - If target is NOT Wolf → You die
- Cannot be taken back once declared
- Reveals your role when used

**Why It's Exciting:**
- Ultimate high-stakes play
- "I KNOW Bob is a wolf" → Gambles → Right = Hero / Wrong = Goat
- Creates dramatic chat moments
- All-in deduction mechanic

**Balance:** 9+ players only, replaces 1 Villager

---

### Priority 3: Fun Chaos Roles

#### 11. 🎭 **The Doppelganger** (Village initially)
**Team:** Starts Good, can change  
**Ability:** On Night 1 only, choose a player. You become their role if they die.

**Mechanics:**
- Night 1: Choose one player to "copy"
- While they're alive: You're a Villager
- If they die: You inherit their EXACT role and abilities
- If they're converted by Kitten Wolf: You stay as Villager
- If they're Revenant who absorbed: You get base Revenant

**Why It's Exciting:**
- Early-game gambit: "What role do I want?"
- Can become Wolf if you copy a wolf (team switch)
- Backup for key roles
- Forces strategic Night 1 choice

**Balance:** 8+ players, replaces 1 Villager

---

#### 12. 🧨 **The Anarchist** (Neutral)
**Team:** Neutral  
**Win Condition:** Cause 2 players to be eliminated during day phase (via vote or Gunner)

**Mechanics:**
- Needs 2 eliminations during day/voting
- Night kills don't count
- Only vote eliminations and Gunner shots count
- If 2+ players eliminated during day → Anarchist wins and leaves game
- Game continues for remaining players

**Why It's Exciting:**
- Incentivizes chaos and aggressive voting
- "We should vote someone out" gets support from Anarchist
- Creates vote manipulation gameplay
- Can ally temporarily with either side

**Balance:** 11-12 players only (needs volume)

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Core Additions (Balanced & Fun)
1. **Jester** - Adds neutral win condition, creates paranoia
2. **Bodyguard** - Simple but emotional, different from Doctor
3. **Illusionist** - Counters investigation meta

### Phase 2: Info & Strategy
4. **Oracle** - Forensic investigation
5. **Insomniac** - Meta-info layer
6. **Witch** - Classic role, beloved by players

### Phase 3: High-Risk
7. **Gambler** - Ultimate high-stakes
8. **Vigilante** - Night-kill risk
9. **Assassin** - Wolf power role

### Phase 4: Advanced Neutral
10. **Trickster** - Survivor role
11. **Doppelganger** - Role copying
12. **Anarchist** - Chaos win condition

---

## 📊 UPDATED ROLE DISTRIBUTION SUGGESTION

With new roles, here's a suggested distribution:

| Players | Wolves | Village Roles | Neutral | Special |
|---------|--------|---------------|---------|---------|
| **8**   | 2      | 5             | 1       | Jester (1) |
| **9**   | 2      | 5             | 1       | Bodyguard (1), Jester (1) |
| **10**  | 2      | 6             | 1       | Witch (1), Oracle (1), Jester (1) |
| **11**  | 2      | 7             | 1       | + Insomniac (1), Trickster (1) |
| **12**  | 3      | 7             | 1       | + Gambler (1), Doppelganger (1) |

**Key Changes:**
- Replace some Villagers with specialized roles
- Add 1 Neutral role at 8+ players
- Keep wolf ratio ~25-30% for balance
- More chaos and deduction tools

---

## 🎨 ROLE SYNERGIES & COUNTERS

### Strong Synergies
- **Bodyguard + Hunter** = Protected player death → Bodyguard dies → Hunter revenge
- **Oracle + Seer** = Verify dead Seer claims, confirm info
- **Insomniac + Detective** = Activity count + Team checks = Powerful deduction
- **Witch + Doctor** = Double protection potential (if separate targets)
- **Illusionist + Conversion** = "I was scanned clean" → Actually wolf

### Counter Plays
- **Jester counters** → Aggressive voting strategies (be cautious)
- **Illusionist counters** → Seer/Detective info reliability
- **Trickster counters** → Wolf night kill (wasted kill)
- **Gambler counters** → Wolf blending (instant death if caught)
- **Oracle counters** → Dead role claims (no more lying)

---

## 💡 IMPLEMENTATION TIPS

### Schema Updates Needed
```typescript
// Add to gameRoleValidator in schema.ts
export const gameRoleValidator = v.union(
  // ... existing roles
  v.literal('jester'),
  v.literal('bodyguard'),
  v.literal('illusionist'),
  v.literal('oracle'),
  v.literal('insomniac'),
  v.literal('witch'),
  v.literal('gambler'),
  v.literal('vigilante'),
  v.literal('assassin'),
  v.literal('trickster'),
  v.literal('doppelganger'),
  v.literal('anarchist'),
)

// Add to teamValidator
v.literal('neutral') // Already exists
```

### RoleData Extensions
```typescript
roleData: v.optional(v.object({
  // ... existing
  healPotionUsed: v.optional(v.boolean()), // Witch
  poisonPotionUsed: v.optional(v.boolean()), // Witch
  illusionActive: v.optional(v.boolean()), // Illusionist
  gambleUsed: v.optional(v.boolean()), // Gambler
  copiedPlayerId: v.optional(v.id('players')), // Doppelganger
  eliminationsWitnessed: v.optional(v.number()), // Anarchist
  wonAsJester: v.optional(v.boolean()), // Jester
}))
```

### UI Considerations
- Add neutral team color (e.g., purple/yellow)
- Show neutral win conditions in game guide
- Update role reveal animations
- Add special icons for unique abilities

---

## 🔥 MOST EXCITING COMBINATIONS

**Top 3 Must-Add:**
1. **Jester** - Game-changer, adds paranoia
2. **Witch** - Classic, beloved, dual nature
3. **Bodyguard** - Emotional, unique protection

**Best for Chaos Mode:**
- Jester + Gambler + Anarchist = Maximum chaos
- Funny names + unpredictable wins = Perfect combo

**Best for Experienced Players:**
- Oracle + Insomniac + Doppelganger = Deep strategy
- Information warfare at its peak

---

## SUMMARY

Current game is **excellent** but has room for:
✅ Neutral roles (Jester, Trickster, Anarchist)
✅ More deception (Illusionist, Doppelganger)  
✅ Risk-reward mechanics (Gambler, Vigilante)  
✅ Alternative protection (Bodyguard, Witch)  
✅ Meta-information (Insomniac, Oracle)

**Recommended First Addition:** Start with **Jester**, **Bodyguard**, and **Witch** - they're balanced, fun, and well-understood in the Werewolf community.
