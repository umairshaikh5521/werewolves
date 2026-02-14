# 🔍 Witch Edge Cases Analysis

## Critical Edge Cases Identified

### 1. **Wolf Vote Tie (2+ wolves, different targets)**
**Scenario:**
- Wolf 1 votes Alice (1 vote)
- Wolf 2 votes Bob (1 vote)

**Current Behavior:**
- Query returns whichever target appears first in Map iteration (non-deterministic)
- Could flicker between Alice/Bob as votes come in
- Witch sees inconsistent information

**Problem:**
- ❌ Confusing UX
- ❌ Non-deterministic behavior
- ❌ Witch doesn't know it's a tie

**Solution Options:**

**Option A: Show "No Clear Target"**
```
Wolf Target: Multiple targets (no majority)
Vote Status: Tied - cannot heal
```
- Pros: Clear, honest, simple
- Cons: Witch can't heal on tie nights

**Option B: Show All Tied Targets**
```
Wolf Target: Alice OR Bob (1 vote each)
Tied targets - final victim unknown
```
- Pros: Shows all info
- Cons: Complex UI, still can't heal effectively

**Option C: Return Null on Tie**
```
Wolf Target: Wolves haven't decided yet...
```
- Pros: Simple, prevents wrong heals
- Cons: Less information for Witch

**Option D: Show Leading Target (Current)**
```
Wolf Target: Alice (1 vote) - Not confirmed
```
- Pros: Shows something
- Cons: Misleading, could be wrong

**RECOMMENDED: Option A**
- Show clear "Tie" message when maxVotes == 1 and multiple targets
- Only show confirmed target when votes > 1 OR all wolves voted same target

---

### 2. **Wolves Change Votes**
**Scenario:**
- 0:10 - Both wolves vote Alice (2 votes)
- Witch sees: "Alice (2 votes) ✓"
- 0:30 - Wolf 1 changes vote to Bob
- Now: Alice (1), Bob (1)

**Current Behavior:**
- Query recalculates on every call
- Witch sees target change in real-time

**Status:** ✅ **WORKING AS INTENDED**
- Real-time updates are a feature
- Witch must watch until the end

---

### 3. **Wolf Votes After Witch Uses Heal**
**Scenario:**
- 0:10 - Wolf 1 votes Alice
- 0:15 - Witch heals Alice
- 0:25 - Wolf 2 votes Bob (changing the target)

**Current Behavior:**
- Witch already used heal on Alice
- Wolves kill Bob
- Alice survives (unnecessary heal), Bob dies

**Status:** ✅ **WORKING AS INTENDED**
- This is strategic risk of healing early
- Encourages Witch to wait

---

### 4. **Only 1 Wolf Votes**
**Scenario:**
- Wolf 1 votes Alice
- Wolf 2 doesn't vote (AFK or strategic)

**Current Behavior:**
- maxVotes = 1, totalWolves = 1
- Shows: "Alice (1 vote)"
- UI shows as "Likely" not "Confirmed"

**Question:** Should we show this as:
- "Likely: Alice (1 vote)" ← Current
- "Not confirmed - only 1 wolf voted"
- Wait for majority?

**Status:** ✅ **WORKING AS INTENDED**
- Current UI correctly shows uncertainty with "Likely" label
- 1 vote still counts (that wolf's choice)

---

### 5. **Witch Has No Heal Potion**
**Scenario:**
- Witch already used heal potion
- Wolf target should NOT be visible

**Current Behavior:**
```tsx
{!healPotionUsed && (
  <div>Wolf Target: ...</div>
)}
```

**Status:** ✅ **ALREADY IMPLEMENTED**
- Wolf target only shows if heal potion available
- Working as requested by user

---

### 6. **Witch Uses Poison Before Wolves Vote**
**Scenario:**
- 0:05 - Witch poisons Bob
- 0:10 - Wolves vote Alice
- Witch can't heal Alice (already used action)

**Current Behavior:**
- `usedActionThisNight` prevents using heal
- UI shows "Already used poison this night"

**Status:** ✅ **WORKING AS INTENDED**
- One action per night enforced

---

### 7. **All Wolves Vote at Exactly Same Time**
**Scenario:**
- Wolf 1 and Wolf 2 both click Alice at 0:10

**Current Behavior:**
- Both actions created separately
- Query counts both votes
- Shows: "Alice (2 votes) ✓"

**Status:** ✅ **WORKING AS INTENDED**
- Race condition safe (separate DB inserts)

---

### 8. **Wolf Kills Witch**
**Scenario:**
- Wolves target the Witch
- Witch sees own name as target
- Can Witch heal themselves?

**Current Behavior:**
- `useHealPotion` mutation requires:
  ```ts
  - target.isAlive check ✅
  - No self-heal restriction ❓
  ```

**Question:** Should Witch be able to heal themselves?
- **Classic Werewolf:** Yes, usually allowed
- **Balance:** Makes Witch very strong
- **Current Code:** ALLOWS self-heal

**Decision Needed:**
- Option A: Allow self-heal (classic)
- Option B: Prevent self-heal (balance)

**RECOMMENDED: Allow** (classic rules)

---

### 9. **Witch Poisons a Wolf**
**Scenario:**
- Witch poisons Wolf 1
- Wolves kill Alice
- Result: Alice + Wolf 1 die

**Current Behavior:**
- Both deaths processed in night resolution
- Reduces wolf count
- Good for village

**Status:** ✅ **WORKING AS INTENDED**
- Strategic poison use

---

### 10. **3+ Wolves in Game (Future-Proofing)**
**Scenario:**
- 13+ player game (if added later)
- Wolf 1: Alice, Wolf 2: Alice, Wolf 3: Bob
- Alice has 2 votes (majority)

**Current Behavior:**
- Query correctly counts votes
- Returns Alice (2 votes)
- totalWolves = 3

**Status:** ✅ **FUTURE-PROOF**
- Works with any number of wolves

---

## 🔧 Required Fixes

### Priority 1: FIX TIE-BREAKING ⚠️

**Current Issue:**
When 2 wolves vote different targets (1 vote each), the query returns arbitrary target.

**Fix Implementation:**
```typescript
// In getWolfTarget query
if (maxVotes === 1 && voteCounts.size > 1) {
  // Multiple targets with 1 vote each = TIE
  return {
    targetId: null,
    targetName: null,
    voteCount: 0,
    totalWolves: killVotes.length,
    isTie: true,
    tiedTargetCount: voteCounts.size
  }
}
```

**UI Update:**
```tsx
{wolfTarget?.isTie ? (
  <div className="text-xs text-amber-400">
    Wolves are tied on {wolfTarget.tiedTargetCount} different targets
    <div className="text-[10px] text-muted-foreground mt-0.5">
      Cannot heal - no majority vote yet
    </div>
  </div>
) : wolfTarget && wolfTarget.voteCount > 0 ? (
  // Show confirmed/likely target
) : (
  // No votes yet
)}
```

---

## ✅ Working Edge Cases (No Fix Needed)

1. ✅ Wolves change votes → Real-time updates
2. ✅ Witch heals before final wolf vote → Strategic risk
3. ✅ Only 1 wolf votes → Shows as "Likely"
4. ✅ Heal potion used → Wolf target hidden
5. ✅ Poison used first → Can't heal same night
6. ✅ Simultaneous votes → Counted correctly
7. ✅ Witch heals self → Allowed (classic rules)
8. ✅ Witch poisons wolf → Both deaths occur
9. ✅ 3+ wolves → Query scales correctly

---

## 📋 Testing Checklist

### Tie Scenarios:
- [ ] 2 wolves, 2 different targets (1v1 tie)
- [ ] 2 wolves, both vote same → No tie
- [ ] 1 wolf votes, other AFK → Shows single target
- [ ] Wolves start tied, then align → Updates correctly

### Vote Changes:
- [ ] Wolf changes vote during night → Target updates
- [ ] Majority shifts mid-night → Witch sees update
- [ ] All wolves align after being split → Shows confirmed

### Timing:
- [ ] Witch heals early, wolves change target → Heal wasted
- [ ] Witch waits until end → Correct target
- [ ] Wolf votes at last second → Witch sees it

### UI Display:
- [ ] 0 votes → "Wolves haven't voted yet"
- [ ] 1 vote → "Likely: [Name] (1 vote) - Not confirmed"
- [ ] 2+ votes same target → "[Name] (2 votes) ✓"
- [ ] Tie → "Multiple targets (no majority)"

---

## 🚀 Action Items

**MUST FIX:**
1. ⚠️ Add tie detection to `getWolfTarget` query
2. ⚠️ Update ActionPanel UI to handle tie scenario
3. ⚠️ Add `isTie` flag to return type

**NICE TO HAVE:**
4. Show list of tied targets (informational)
5. Add "Wolves are discussing..." flavor text during ties
6. Show vote distribution (Alice: 1, Bob: 1, Carol: 1)

**CURRENT STATUS:**
- ✅ 9/10 edge cases handled correctly
- ⚠️ 1/10 needs fix (tie scenario)
