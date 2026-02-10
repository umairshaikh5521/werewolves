# Moonrise: Werewolf Game - Complete Mechanics Documentation

**Version:** 1.0  
**Last Updated:** February 10, 2026  
**Game Type:** Social Deduction, Hidden Role  
**Players:** 5-12  

---

## Table of Contents

1. [Game Overview](#game-overview)
2. [Teams & Win Conditions](#teams--win-conditions)
3. [Game Phases](#game-phases)
4. [Role Distribution](#role-distribution)
5. [Roles & Abilities](#roles--abilities)
6. [Game Flow](#game-flow)
7. [Action Priority & Resolution](#action-priority--resolution)
8. [Special Mechanics](#special-mechanics)
9. [Chat System](#chat-system)
10. [Technical Implementation](#technical-implementation)

---

## Game Overview

**Moonrise** is a real-time, multiplayer social deduction game where players are secretly assigned roles as either **Villagers** (good team), **Werewolves** (evil team), or **Neutral** roles. The game alternates between **Night** and **Day** phases, where players use their abilities and vote to eliminate opponents.

### Core Objective
- **Village Team:** Eliminate all werewolves
- **Werewolf Team:** Equal or outnumber the villagers
- **Neutral (Jester):** Get voted out by the village

### Game Limits
- **Player Range:** 5-12 players
- **Maximum Rounds:** 10 rounds (1 round = Night → Day → Voting)
- **Round Limit Behavior:** If 10 rounds are reached, the game ends. The Werewolves win if they equal or outnumber the Villagers (ties favor Werewolves).

---

## Teams & Win Conditions

### 🛡️ Village Team (Good)
**Roles:** Villager, Seer, Doctor, Gunner, Detective, Hunter

**Win Condition:**  
Eliminate all werewolves (all players with `team: 'bad'`)

**Victory Triggers:**
- Last werewolf is eliminated during voting
- Last werewolf is shot by the Gunner
- Last werewolf is killed by Hunter's revenge

---

### 🐺 Werewolf Team (Evil)
**Roles:** Werewolf, Kitten Wolf, Shadow Wolf

**Win Condition:**  
Equal or outnumber non-werewolf players

**Victory Triggers:**
- After night phase resolution: `wolves.length >= nonWolves.length`
- After voting phase resolution: `wolves.length >= nonWolves.length`
- After Hunter revenge: `wolves.length >= nonWolves.length`

**Important Notes:**
- Converted players (bitten by Kitten Wolf) count as werewolves
- The Jester (neutral) counts as a non-werewolf for win condition purposes

---

### 🃏 Neutral Team
**Roles:** Jester

**Win Condition:**  
Get voted out by the village during the voting phase

**Victory Triggers:**
- Jester receives majority votes during voting phase
- Game immediately ends when Jester wins

**Loss Conditions:**
- Killed by werewolves at night
- Shot by the Gunner during the day
- Killed by Hunter's revenge
- Game ends with Village or Werewolf victory

---

## Game Phases

### 🌙 Night Phase
**Duration:** 
- 40 seconds (5-8 players)
- 50 seconds (9-12 players)

**Active Roles:**
- Werewolves (vote to kill)
- Kitten Wolf (kill OR convert - one-time)
- Shadow Wolf (kill vote + mute)
- Seer (scan one player)
- Doctor (protect one player)
- Detective (compare two players)

**Phase End Conditions:**
- Timer expires, OR
- All night actors have submitted their actions (early end)

**Early End Requirements:**
- All wolves have voted to kill
- Shadow Wolf has submitted mute or skip mute
- Seer has scanned (if alive)
- Doctor has protected (if alive)
- Detective has investigated (if alive)
- Kitten Wolf has killed or converted (if alive and hasn't used bite)

---

### ☀️ Day Phase
**Duration:** 60 seconds (fixed)

**Activities:**
- All alive players can chat in village chat
- Werewolves can chat in wolf chat (locked during day)
- Gunner can shoot (reveals identity)
- Muted players cannot send messages

**Phase End Conditions:**
- Timer expires
- No early end for day phase

**Special Events:**
- Gunner shooting triggers immediate kill
- If Gunner shoots Hunter → Hunter Revenge phase
- If Gunner's shot ends the game → Game ends immediately

---

### 🗳️ Voting Phase
**Duration:**
- 25 seconds (5-8 players)
- 35 seconds (9-12 players)

**Mechanics:**
- All alive players vote to eliminate one player
- Players can change their vote before phase ends
- Muted players CAN vote (mute only affects chat)

**Phase End Conditions:**
- Timer expires, OR
- All alive players have voted (early end)

**Elimination Rules:**
- Majority required: `Math.floor(alivePlayers.length / 2) + 1`
- If majority reached: Player is eliminated
- If no majority: No one is eliminated

**Special Cases:**
- If Jester is voted out → Jester wins, game ends
- If Hunter is voted out → Hunter Revenge phase
- If last werewolf is voted out → Village wins

---

### 🏹 Hunter Revenge Phase
**Duration:** 20 seconds

**Trigger Conditions:**
- Hunter is killed at night by werewolves
- Hunter is voted out during voting
- Hunter is shot by Gunner during day

**Mechanics:**
- Only the dying Hunter can act
- Hunter selects one alive player to kill
- Selection is immediate (no timer wait)
- If Hunter doesn't select → No one dies

**Phase Transitions:**
After Hunter Revenge:
- If triggered from **Night** → Day Phase
- If triggered from **Voting** → Next Night Phase (new round)
- If triggered from **Day** (Gunner shot) → Voting Phase

**Win Condition Check:**
Game checks for victory after Hunter's revenge shot resolves

---

## Role Distribution

Roles are automatically assigned based on the number of players in the lobby.

| Players | Wolf | Kitten | Shadow | Seer | Doctor | Gunner | Detective | Hunter | Jester | Villager |
|---------|------|--------|--------|------|--------|--------|-----------|--------|--------|----------|
| **5**   | 1    | 0      | 0      | 1    | 1      | 0      | 0         | 0      | 0      | 2        |
| **6**   | 1    | 0      | 0      | 1    | 1      | 1      | 0         | 0      | 0      | 2        |
| **7**   | 2    | 0      | 0      | 1    | 1      | 1      | 0         | 1      | 0      | 1        |
| **8**   | 1    | 0      | 1      | 1    | 1      | 1      | 1         | 1      | 0      | 1        |
| **9**   | 1    | 1      | 0      | 1    | 1      | 1      | 0         | 1      | 1      | 2        |
| **10**  | 0    | 1      | 1      | 1    | 1      | 1      | 1         | 1      | 1      | 2        |
| **11**  | 0    | 1      | 1      | 1    | 1      | 1      | 1         | 1      | 1      | 3        |
| **12**  | 0    | 1      | 1      | 1    | 1      | 1      | 1         | 1      | 1      | 4        |

### Distribution Notes:
- **5-6 players:** Basic setup (Wolf, Seer, Doctor, Villagers)
- **7 players:** Introduces multiple wolves and Hunter
- **8 players:** Adds Shadow Wolf and Detective
- **9+ players:** Full role set including Kitten Wolf and Jester
- **Scaling:** More wolves added at 7 and 12 players for balance

---

## Roles & Abilities

### 🐺 Werewolf (Evil Team)
**Team:** Bad  
**Count:** 1-2 (based on player count)

**Night Ability:**
- Vote to kill one non-werewolf player
- All werewolves must vote (majority determines target)
- Cannot target fellow werewolves
- Can see other werewolves

**Day Ability:**
- Access to private wolf chat
- Must blend in with villagers

**Strategic Notes:**
- Coordinate kills in wolf chat
- Avoid suspicion during day discussions
- If multiple wolves, majority vote determines kill target

---

### 🐱 Kitten Wolf (Evil Team)
**Team:** Bad  
**Count:** 0-1 (appears at 9+ players)

**Night Ability - Choice:**
1. **Kill Vote:** Vote like a regular werewolf, OR
2. **Bite (One-Time):** Convert a villager to werewolf team

**Bite Mechanics:**
- Can only be used ONCE per game
- Target must be on the good team (not neutral or bad)
- Target loses their original role and becomes a Werewolf
- Target joins werewolf team immediately
- Converted player gains access to wolf chat
- Converted player's `wasConverted` flag is set to `true`
- Converted player's `convertedAtTurn` is recorded
- If bite is used, no one dies that night

**Important Rules:**
- Cannot kill AND bite in the same night
- Once bite is used, `hasBitten` flag prevents future use
- Choosing to bite removes any kill votes from that Kitten Wolf
- Bite does NOT trigger Hunter revenge (not a death)

**Strategic Notes:**
- Best used on powerful roles (Seer, Doctor, Detective)
- Timing is critical - use early for advantage or save for key moment
- Converted players know they were converted

---

### 🌑 Shadow Wolf (Evil Team)
**Team:** Bad  
**Count:** 0-1 (appears at 8+ players)

**Night Ability:**
- Vote to kill (like regular werewolf)
- **AND** Mute one non-werewolf player

**Mute Mechanics:**
- Must select a target to mute OR explicitly skip mute
- Muted player cannot send messages during next day phase
- Mute lasts only for the following day
- Mute is cleared at the start of next night
- Cannot mute fellow werewolves
- Muted players CAN still vote during voting phase

**Action Requirements:**
- Must submit both kill vote AND mute action for early night end
- Can submit `skipMute` action to proceed without muting

**Strategic Notes:**
- Silence key information roles (Seer, Detective)
- Prevent coordination among villagers
- Use to create confusion and suspicion

---

### 🔮 Seer (Village Team)
**Team:** Good  
**Count:** 1 (always present)

**Night Ability:**
- Scan one player to learn their team
- Result shows: "Werewolf" (bad team) or "Villager" (good/neutral)

**Scan Results:**
- Werewolf, Kitten Wolf, Shadow Wolf → Shows as "Werewolf"
- Seer, Doctor, Gunner, Detective, Hunter, Villager → Shows as "Villager"
- **Jester** → Shows as "Villager" (neutral appears good)
- Converted players → Show as "Werewolf" after conversion

**Result Delivery:**
- Results available at the start of day phase
- Only the Seer can see their scan results
- Results persist and can be reviewed

**Strategic Notes:**
- Most powerful village role
- High-priority target for werewolves
- Must share information carefully to avoid being killed
- Jester appears innocent to Seer

---

### 💉 Doctor (Village Team)
**Team:** Good  
**Count:** 1 (always present)

**Night Ability:**
- Protect one player from werewolf attacks
- If protected player is targeted by wolves, they survive

**Protection Rules:**
- Cannot protect the same player two nights in a row
- Can protect themselves
- Protection only blocks werewolf kills (not Gunner shots or votes)
- `lastProtectedId` is tracked to enforce consecutive protection rule

**Save Mechanics:**
- If wolves target protected player → "Someone was attacked but survived!"
- If wolves target unprotected player → Player dies
- Protection does NOT prevent Kitten Wolf conversion

**Strategic Notes:**
- Protect suspected Seer or other key roles
- Self-protection is valid and sometimes necessary
- Must vary protection to comply with consecutive rule

---

### 🔫 Gunner (Village Team)
**Team:** Good  
**Count:** 0-1 (appears at 6+ players)

**Day Ability:**
- Shoot any player during day phase
- Has 2 bullets total for entire game
- Can only shoot once per round

**Shooting Mechanics:**
- Immediate kill (no save possible)
- Reveals Gunner's identity to all players
- `isRevealed` flag set to `true` after first shot
- `bullets` count decremented after each shot
- Cannot shoot if no bullets remaining
- Cannot shoot during night or voting phases

**Special Interactions:**
- Shooting Hunter → Triggers Hunter Revenge phase
- Shooting last werewolf → Village wins immediately
- Shooting villager → Helps werewolves

**Strategic Notes:**
- High-risk, high-reward role
- Revealing identity makes you a wolf target
- Best used when confident about wolf identity
- Shooting wrong target can lose the game

---

### 🔍 Detective (Village Team)
**Team:** Good  
**Count:** 0-1 (appears at 8+ players)

**Night Ability:**
- Compare two players to learn if they're on the same team
- Result shows: "Same Team" or "Different Teams"

**Comparison Results:**
- Two werewolves → Same Team
- Two villagers → Same Team
- Villager + Jester → Same Team (both non-bad)
- Werewolf + Villager → Different Teams
- Werewolf + Jester → Different Teams

**Team Groupings:**
- **Bad Team:** Werewolf, Kitten Wolf, Shadow Wolf, Converted Players
- **Non-Bad Team:** Seer, Doctor, Gunner, Detective, Hunter, Jester, Villager

**Strategic Notes:**
- Powerful deduction tool
- Can confirm or eliminate suspects
- Works well with Seer information
- Jester appears as "same team" with villagers

---

### 🏹 Hunter (Village Team)
**Team:** Good  
**Count:** 0-1 (appears at 7+ players)

**Passive Ability:**
- No night action
- When killed, gets one final revenge shot

**Revenge Trigger Conditions:**
1. Killed by werewolves at night
2. Voted out during voting phase
3. Shot by Gunner during day

**Revenge Mechanics:**
- Game enters special "Hunter Revenge" phase (20 seconds)
- Hunter selects any alive player to kill
- Selection triggers immediate phase transition
- If no selection made → No one dies, phase ends

**Phase Flow After Revenge:**
- From Night → Hunter Revenge → Day
- From Voting → Hunter Revenge → Next Night
- From Day (Gunner) → Hunter Revenge → Voting

**Strategic Notes:**
- Powerful deterrent against voting out
- Can swing game with final shot
- Werewolves may avoid killing to prevent revenge
- Best used to take down suspected wolf

---

### 🃏 Jester (Neutral Team)
**Team:** Neutral  
**Count:** 0-1 (appears at 9+ players)

**Win Condition:**
- Get voted out during voting phase (majority vote required)

**Loss Conditions:**
- Killed by werewolves at night
- Shot by Gunner during day
- Killed by Hunter's revenge
- Game ends with Village or Werewolf victory

**Abilities:**
- No night action
- No special powers
- Only has chat and voting

**Detection:**
- Appears as "Villager" to Seer
- Appears as "Same Team" with villagers to Detective
- Counts as non-werewolf for win conditions

**Victory Behavior:**
- If voted out with majority → Game ends immediately
- Jester wins, all other players lose
- Message: "🃏 JESTER WINS! [Name] was the Jester and fooled the entire village!"

**Strategic Notes:**
- Must act suspicious enough to get voted
- Cannot be too obvious or players will avoid voting
- Must survive night and avoid Gunner
- Unique solo victory condition

---

### 👤 Villager (Village Team)
**Team:** Good  
**Count:** 1-2 (fills remaining slots)

**Abilities:**
- No special night action
- Can chat and vote

**Role:**
- Participate in discussions
- Vote during voting phase
- Help identify werewolves through deduction

**Strategic Notes:**
- Most common role
- Voting power is crucial
- Must pay attention to behavior and claims
- Can pretend to be power roles to draw wolf attacks

---

## Game Flow

### Pre-Game: Lobby
1. Host creates room with unique room code
2. Players join using room code
3. All non-host players must click "Ready"
4. Host clicks "Start Game" when 5-12 players ready
5. 6-second countdown begins
6. Roles are randomly assigned
### Host Powers & Management
- **Start Game:** Only host can start the game once players are ready
- **Kick Players:** Host can remove players from the lobby (but not during active game)
- **Reset Game:** Host can reset the game to lobby state after it ends
- **Host Migration:** If the host leaves, the role is automatically transferred to the next joiner
- **Room Code:** Unique 4-character code used for joining (e.g., `ABCD`)

### Round Structure
Each round consists of:
1. **Night Phase** → 2. **Day Phase** → 3. **Voting Phase**

### Turn Progression
- Turn number increments after Voting phase
- Turn 1 = First night
- Maximum 10 turns (rounds)

### Phase Transition Flow

```
LOBBY
  ↓ (Start Game)
NIGHT (Turn 1)
  ↓
DAY
  ↓
VOTING
  ↓ (if Hunter voted out)
HUNTER_REVENGE
  ↓
NIGHT (Turn 2)
  ↓
[Repeat until win condition or max rounds]
```

### Special Phase Interruptions

**Hunter Killed at Night:**
```
NIGHT → HUNTER_REVENGE → DAY
```

**Hunter Voted Out:**
```
VOTING → HUNTER_REVENGE → NIGHT (next turn)
```

**Hunter Shot by Gunner:**
```
DAY → HUNTER_REVENGE → VOTING
```

**Jester Voted Out:**
```
VOTING → GAME_ENDED (Jester wins)
```

---

## Action Priority & Resolution

### Night Phase Resolution Order

1. **Shadow Wolf Mute** (Applied first)
   - Old mutes cleared
   - New mute applied
   - Muted player's `isMuted` flag set

2. **Doctor Save** (Recorded)
   - Doctor's `lastProtectedId` updated
   - Protection recorded for kill resolution

3. **Kitten Wolf Conversion** (If used)
   - Target converted to werewolf
   - Target's role, team, roleData changed
   - `wasConverted` and `convertedAtTurn` set
   - Conversion message sent to wolf chat
   - **No death occurs** - night ends here
   - Skip to win condition check

4. **Werewolf Kill Vote** (If no conversion)
   - All wolf kill votes tallied
   - Majority target determined
   - Check if target was saved by Doctor
   - If saved: "Someone was attacked but survived!"
   - If not saved: Target dies, check if Hunter

5. **Hunter Check** (If killed)
   - If victim is Hunter → Set `hunterRevengePlayerId`
   - Transition to Hunter Revenge phase
   - Skip Day phase

6. **Seer Scan** (Processed independently)
   - Result stored in actions table
   - Available to Seer at day start

7. **Detective Investigation** (Processed independently)
   - Result stored in actions table
   - Available to Detective at day start

### Day Phase Resolution Order

1. **Mute Status** (Active)
   - Muted players cannot send chat messages
   - Mute only affects village chat (not wolf chat)

2. **Gunner Shot** (If fired)
   - Immediate kill
   - Gunner revealed (`isRevealed = true`)
   - Bullet count decremented
   - If target is Hunter → Hunter Revenge phase
   - If last werewolf → Village wins
   - Otherwise → Continue to Voting

### Voting Phase Resolution Order

1. **Vote Tallying**
   - All votes counted
   - Majority calculated: `Math.floor(alive / 2) + 1`

2. **Elimination Check**
   - If majority reached → Eliminate player
   - If no majority → No elimination

3. **Special Role Check**
   - If Jester eliminated → Jester wins, game ends
   - If Hunter eliminated → Hunter Revenge phase
   - Otherwise → Check win condition

4. **Win Condition Check**
   - Check if all wolves dead (Village wins)
   - Check if wolves >= non-wolves (Werewolf wins)
   - Check if max rounds reached

5. **Phase Transition**
   - If Hunter eliminated → Hunter Revenge
   - If max rounds → Game ends
   - Otherwise → Next Night (increment turn)

---

## Special Mechanics

### Conversion System (Kitten Wolf Bite)

**Conversion Process:**
1. Kitten Wolf selects target and uses bite
2. Target must be `team: 'good'` (cannot convert neutral or bad)
3. Target's properties updated:
   ```javascript
   {
     role: 'wolf',
     team: 'bad',
     roleData: undefined, // Original role data removed
     wasConverted: true,
     convertedAtTurn: currentTurn
   }
   ```
4. Converted player immediately joins wolf team
5. Converted player gains access to wolf chat
6. Kitten Wolf's `hasBitten` flag set to `true` (cannot bite again)

**Conversion Rules:**
- Cannot convert werewolves or Jester
- Conversion does NOT trigger Hunter revenge
- Converted player knows they were converted
- Seer will see converted player as werewolf
- Detective will see converted player as werewolf team
- No death occurs on conversion night

**Strategic Impact:**
- Converting Seer removes village's information source
- Converting Doctor removes village's protection
- Converting Gunner removes village's day kill ability
- Timing is crucial - early conversion vs. saving for key moment

---

### Mute System (Shadow Wolf)

**Mute Application:**
1. Shadow Wolf selects target at night (or skips)
2. At night resolution, old mutes cleared
3. New mute applied: `target.isMuted = true`
4. Mute lasts entire following day phase
5. Mute cleared at start of next night

**Mute Effects:**
- Muted player cannot send messages in village chat
- Muted player CAN send messages in wolf chat (if werewolf)
- Muted player CAN vote during voting phase
- UI shows mute indicator to muted player
- Other players see muted player's silence

**Mute Restrictions:**
- Cannot mute fellow werewolves
- Cannot mute dead players
- Must mute or skip each night

**Skip Mute Mechanic:**
- Shadow Wolf can choose not to mute
- Must submit `skipMute` action for early night end
- `skipMute` action recorded with self as target

---

### Hunter Revenge System

**Trigger Detection:**
1. Hunter death detected during phase resolution
2. Game state updated:
   ```javascript
   {
     phase: 'hunter_revenge',
     phaseEndTime: now + 20000,
     hunterRevengePlayerId: hunterId,
     previousPhase: 'night' | 'voting' | 'day'
   }
   ```
3. System message sent to all players
4. 20-second timer starts

**Hunter Action:**
- Hunter UI shows all alive players
- Hunter selects target
- Selection submits `revenge` action
- Immediate phase transition triggered

**Revenge Resolution:**
1. Check for revenge action in actions table
2. If action exists: Kill target, send message
3. If no action: "Hunter's aim falters... no shot was fired"
4. Clear `hunterRevengePlayerId` and `previousPhase`
5. Check win condition
6. Transition to appropriate next phase based on `previousPhase`

**Phase Routing:**
- `previousPhase: 'night'` → Day Phase
- `previousPhase: 'voting'` → Night Phase (next turn)
- `previousPhase: 'day'` → Voting Phase

---

### Early Phase End System

**Night Phase Early End:**
Triggers when ALL of the following are true:
- All alive werewolves (including converted) have submitted kill votes
- Shadow Wolf (if alive) has submitted BOTH a kill vote AND a mute/skipMute action
- Seer (if alive) has submitted scan
- Doctor (if alive) has submitted save
- Detective (if alive) has submitted investigation
- Kitten Wolf (if alive) has submitted kill OR convert

**Voting Phase Early End:**
- Triggers immediately when all alive players have cast a vote

---

### Game Reset & Cleanup

**Reset Function:**
- Host can trigger `resetToLobby` from the end screen
- **Effects:**
  - Clears all player roles, teams, and statuses
  - Wipes all game actions and chat history
  - Resets turn counter to 0
  - Sets game status back to `lobby`
  - Keeps players in the room (doesn't kick them)
- **Host Status:** The player who resets remains the host

**Implementation:**
- After each action submission, check conditions
- If conditions met, schedule immediate phase transition
- `scheduler.runAfter(0, transitionPhase, ...)`

---

### Round Limit System

**Maximum Rounds:** 10

**Limit Check:**
- Checked after voting phase resolution
- Checked after Hunter revenge (if from voting)

**Limit Reached Behavior:**
1. Count alive wolves: `wolves = alive.filter(p => p.team === 'bad')`
2. Count alive non-wolves: `nonWolves = alive.filter(p => p.team !== 'bad')`
3. Determine winner:
   - If `wolves.length >= nonWolves.length` → Werewolves win
   - Otherwise → Village wins
4. Set game status:
   ```javascript
   {
     status: 'ended',
     winningTeam: winner,
     endReason: 'Maximum rounds (10) reached'
   }
   ```

---

### Win Condition Checking

**Check Timing:**
- After night phase resolution
- After voting phase resolution
- After Hunter revenge resolution
- After Gunner shot (if kills last wolf)

**Win Condition Logic:**
```javascript
function checkWinCondition(players) {
  const alive = players.filter(p => p.isAlive)
  const wolves = alive.filter(p => p.team === 'bad')
  const nonWolves = alive.filter(p => p.team !== 'bad')
  
  if (wolves.length === 0) return 'good'  // Village wins
  if (wolves.length >= nonWolves.length) return 'bad'  // Werewolves win
  return null  // Game continues
}
```

**Special Cases:**
- Jester voted out → Immediate neutral win (bypasses normal check)
- Round 10 reached → Force winner determination
- Converted players count as werewolves

---

## Chat System

### Chat Channels

**Global Channel:**
- **Visibility:** All players can see
- **Posting (Day/Voting):** Alive players can send (except muted players)
- **Posting (Night):** **LOCKED** - No one can send messages
- **Dead Players:** Cannot send messages at any time
- **System Messages:** Appear here for all major events

**Wolves Channel:**
- **Visibility:** Only werewolves (Wolf, Kitten, Shadow, Converted)
- **Posting:** **LOCKED during Day & Voting** - Only allowed during **Night Phase**
- **Restrictions:** Only alive werewolves can send
- **Function:** Coordinate night kills and strategies privately

**Dead Channel:**
- **Visibility:** Only dead players
- **Posting:** Dead players can chat freely at any time
- **Note:** Currently not fully implemented in UI

### Chat Restrictions

**Muted Players:**
- Cannot send messages in global chat
- CAN send messages in wolf chat (if werewolf)
- Can still vote
- Mute indicator shown in UI

**Day Phase Wolf Chat Lock:**
- Werewolves cannot send messages in wolf chat during day
- Can read previous messages
- Unlocked at night and voting
- Prevents accidental reveals

### System Messages

**Night Resolution:**
- "X was killed during the night"
- "Someone was attacked but survived!"
- "The village wakes up... No one died last night!"
- "Strange... the village was quiet last night. No one died." (conversion)

**Voting Resolution:**
- "The village has spoken! X has been eliminated."
- "No votes were cast. No one was eliminated."
- "No majority was reached. No one was eliminated."

**Hunter Revenge:**
- "🏹 The Hunter has fallen! With their dying breath, they take aim..."
- "🏹 [Hunter]'s final shot strikes [Target]!"
- "The Hunter's aim falters... no shot was fired."

**Gunner Shot:**
- "BANG! [Gunner] shot [Target]!"

**Jester Win:**
- "🃏 JESTER WINS! [Name] was the Jester and fooled the entire village!"

**Wolf Chat:**
- "[Name] has joined the wolf pack." (conversion)
- Kill messages also appear in wolf chat

---

## Technical Implementation

### Database Schema

**Games Table:**
```javascript
{
  roomCode: string,              // Unique 6-character code
  status: 'lobby' | 'active' | 'ended',
  hostId: string,                // User ID of host
  turnNumber: number,            // Current round (1-10)
  phase: 'night' | 'day' | 'voting' | 'hunter_revenge',
  phaseEndTime: number,          // Timestamp when phase ends
  winningTeam?: string,          // 'good' | 'bad' | 'neutral'
  endReason?: string,            // Description of how game ended
  startCountdownAt?: number,     // Countdown start timestamp
  hunterRevengePlayerId?: Id,    // Hunter taking revenge
  previousPhase?: string,        // Phase before hunter_revenge
  jesterWinnerId?: Id            // Jester who won
}
```

**Players Table:**
```javascript
{
  gameId: Id<'games'>,
  userId: string,                // Better Auth user ID
  name: string,
  role?: GameRole,               // Assigned after game starts
  team?: 'good' | 'bad' | 'neutral',
  isAlive: boolean,
  isHost: boolean,
  roleData?: {
    lastProtectedId?: Id,        // Doctor: last protected player
    bullets?: number,            // Gunner: remaining bullets (0-2)
    isRevealed?: boolean,        // Gunner: identity revealed
    hasBitten?: boolean          // Kitten Wolf: bite used
  },
  wasConverted?: boolean,        // Converted by Kitten Wolf
  convertedAtTurn?: number,      // Turn when converted
  isReady?: boolean,             // Lobby ready status
  isMuted?: boolean              // Shadow Wolf mute status
}
```

**Actions Table:**
```javascript
{
  gameId: Id<'games'>,
  turnNumber: number,
  phase: string,                 // Phase when action taken
  type: 'vote' | 'kill' | 'save' | 'scan' | 'shoot' | 
        'investigate' | 'convert' | 'mute' | 'skipMute' | 'revenge',
  actorId: Id<'players'>,        // Player performing action
  targetId: Id<'players'>,       // Primary target
  targetId2?: Id<'players'>      // Secondary target (Detective)
}
```

**Chat Table:**
```javascript
{
  gameId: Id<'games'>,
  senderId: Id<'players'>,
  senderName: string,
  content: string,
  channel: 'global' | 'wolves' | 'dead',
  timestamp: number
}
```

### Phase Durations

```javascript
// Dynamic based on player count
function getNightDuration(playerCount) {
  return playerCount > 8 ? 50_000 : 40_000  // 50s or 40s
}

function getVotingDuration(playerCount) {
  return playerCount > 8 ? 35_000 : 25_000  // 35s or 25s
}

// Fixed durations
const DAY_DURATION = 60_000           // 60 seconds
const HUNTER_REVENGE_DURATION = 20_000  // 20 seconds
const COUNTDOWN_DURATION = 6_000       // 6 seconds
const MAX_ROUNDS = 10
```

### Action Validation

**Kill Action:**
- Phase must be 'night'
- Actor must be wolf/kittenWolf/shadowWolf
- Actor must be alive
- Target cannot be fellow werewolf

**Save Action:**
- Phase must be 'night'
- Actor must be doctor
- Actor must be alive
- Target cannot be same as `lastProtectedId`

**Scan Action:**
- Phase must be 'night'
- Actor must be seer
- Actor must be alive

**Vote Action:**
- Phase must be 'voting'
- Actor must be alive
- Target must be alive

**Shoot Action:**
- Phase must be 'day'
- Actor must be gunner
- Actor must be alive
- Actor must have bullets > 0
- Target must be alive
- Cannot shoot self

**Investigate Action:**
- Phase must be 'night'
- Actor must be detective
- Actor must be alive
- targetId1 !== targetId2

**Convert Action:**
- Phase must be 'night'
- Actor must be kittenWolf
- Actor must be alive
- `hasBitten` must be false
- Target must be alive
- Target team must be 'good'

**Mute Action:**
- Phase must be 'night'
- Actor must be shadowWolf
- Actor must be alive
- Target must be alive
- Target team cannot be 'bad'

**Revenge Action:**
- Phase must be 'hunter_revenge'
- Actor must be `hunterRevengePlayerId`
- Actor role must be 'hunter'
- Target must be alive

---

## Game Balance Notes

### Role Power Levels

**High Power:**
- Seer (information)
- Doctor (protection)
- Kitten Wolf (conversion)

**Medium Power:**
- Detective (deduction)
- Gunner (day kill)
- Shadow Wolf (mute)
- Hunter (revenge)

**Low Power:**
- Werewolf (basic kill)
- Jester (unique win)
- Villager (voting only)

### Balance Considerations

**5-6 Players:**
- Simple setup for learning
- 1 wolf vs 4-5 villagers
- Basic roles only

**7-8 Players:**
- Introduces complexity
- Multiple wolves or special wolves
- Hunter adds deterrent

**9-12 Players:**
- Full role diversity
- Jester adds chaos
- Multiple wolves for balance
- Conversion adds swing potential

### Strategic Depth

**Information Roles:**
- Seer: Direct team knowledge
- Detective: Comparative deduction
- Synergy: Combine results for certainty

**Protection Roles:**
- Doctor: Prevents night kills
- Hunter: Deters elimination
- Gunner: Removes threats

**Deception Roles:**
- Werewolves: Blend and mislead
- Jester: Act suspicious
- Shadow Wolf: Silence key players

---

## Future Expansion Possibilities

### Potential New Roles

**Village Team:**
- **Bodyguard:** Die instead of protected player
- **Mayor:** Vote counts as 2
- **Priest:** Can revive one dead player

**Werewolf Team:**
- **Alpha Wolf:** Extra kill every 3 rounds
- **Lone Wolf:** Wins if last player standing

**Neutral Team:**
- **Survivor:** Win by surviving to end
- **Witch:** Has poison and healing potion

### Potential Mechanics

- **Items:** Collectible items with special effects
- **Events:** Random events that affect gameplay
- **Roles Reveal:** Option to reveal role on death
- **Custom Role Sets:** Host can customize distribution
- **Achievements:** Track player statistics and wins

---

## Glossary

**Action:** A choice made by a player during their phase (vote, kill, save, etc.)

**Alive:** Player status indicating they can participate in the game

**Conversion:** Kitten Wolf's ability to turn a villager into a werewolf

**Early End:** Phase ending before timer expires when all required actions are submitted

**Majority:** More than half of alive players (Math.floor(alive/2) + 1)

**Mute:** Status preventing a player from sending chat messages

**Phase:** A distinct period of the game (Night, Day, Voting, Hunter Revenge)

**Resolution:** The process of applying actions and determining outcomes

**Revenge:** Hunter's ability to kill one player upon death

**Round:** One complete cycle of Night → Day → Voting phases

**Team:** Group of players with shared win condition (Good, Bad, Neutral)

**Turn:** Numeric counter for rounds (1-10)

**Win Condition:** Criteria that must be met for a team to win the game

---

## Version History

**v1.0 - February 10, 2026**
- Initial comprehensive documentation
- All 10 roles documented
- Complete mechanics coverage
- Phase flow diagrams
- Technical implementation details

---

**Document Maintained By:** Game Development Team  
**For Questions:** Refer to codebase in `/convex` directory  
**Last Review:** February 10, 2026
