# System Glitch Bug Fix - Edge Cases Analysis

## Problem Summary
The System Glitch message was showing roles that shouldn't be revealed, including:
- Roles of dead players
- Already revealed roles (like Gunner who shot)
- Potentially roles not in the current active player pool

## Edge Cases Identified & Fixed

### 1. **Dead Players' Roles** ✅
**Issue:** Dead players' roles were included in the role pool for the glitch message.
**Problem:** This could reveal roles that are no longer in play, giving players false information.
**Fix:** Filter candidates to only include `p.isAlive === true`

**Example Scenario:**
- Hunter dies Night 1
- Glitch triggers Night 2
- Without fix: Could show "Hunter" even though all Hunters are dead
- With fix: Only shows roles from alive players

### 2. **Revealed Players (Gunner)** ✅
**Issue:** Gunner who already shot (and revealed their identity) could be targeted by glitch.
**Problem:** Re-revealing an already known role wastes the glitch mechanic.
**Fix:** Filter candidates to exclude `p.roleData?.isRevealed === true`

**Example Scenario:**
- Gunner shoots someone Day 2 (becomes revealed)
- Glitch triggers after Day 2
- Without fix: Could target the Gunner again
- With fix: Gunner is excluded from candidates

### 3. **Role Pool From Dead Players** ✅
**Issue:** The role pool was built from ALL players (including dead ones).
**Problem:** Could suggest roles that only dead players have.
**Fix:** Build role pool ONLY from alive, non-revealed players

**Example Scenario:**
- Game has: 2 Wolves (alive), 1 Seer (dead), 1 Doctor (dead), 3 Villagers (alive)
- Without fix: Could say "Player X is a Doctor" when no Doctors are alive
- With fix: Only shows Wolf or Villager (roles that are alive)

### 4. **Converted Players (Kitten Wolf Bite)** ✅
**Issue:** Player bitten by Kitten Wolf changes from their original role to Wolf.
**Problem:** Need to ensure we use their current role, not original.
**Fix:** Using `p.role` directly (which is updated on conversion)

**Example Scenario:**
- Seer gets bitten Night 1, becomes Wolf
- Glitch triggers Night 2
- Correct behavior: Shows "Wolf" not "Seer"
- Our fix: Uses current `p.role` which is already updated to 'wolf'

### 5. **Revenant with Absorbed Role** ✅
**Issue:** Revenant can absorb a dead player's role starting Night 2.
**Problem:** Need to show the absorbed role, not "Revenant".
**Fix:** Using `p.role` which gets updated when Revenant absorbs

**Example Scenario:**
- Revenant absorbs dead Doctor Night 2
- Glitch triggers Night 3
- Correct behavior: Shows "Doctor" not "Revenant"
- Our fix: Uses current `p.role` (already updated to 'doctor')

### 6. **Null/Undefined Roles** ✅
**Issue:** During lobby or edge cases, players might not have roles assigned.
**Problem:** Could cause crashes or undefined behavior.
**Fix:** Added `.filter((role): role is string => role !== undefined && role !== null)`

### 7. **No Eligible Players** ✅
**Issue:** In extreme cases (all alive players revealed), no candidates remain.
**Problem:** Could crash when trying to select from empty array.
**Fix:** Added safety check with console warning

**Example Scenario:**
- Only 2 players alive: Both Gunners who already shot (both revealed)
- Glitch tries to trigger
- Our fix: Warns and skips the glitch message

### 8. **Empty Role Pool** ✅
**Issue:** After filtering, role pool could be empty.
**Problem:** Would crash when selecting random role.
**Fix:** Added `if (presentRoles.length === 0)` check before selecting

## Code Changes Summary

### Before:
```typescript
const candidates = updatedPlayers.filter((p: any) => p.isAlive && !p.roleData?.isRevealed)
const presentRoles = Array.from(new Set(updatedPlayers.map((p: any) => p.role)))
const randomRole = presentRoles[Math.floor(Math.random() * presentRoles.length)]
```

**Problems:**
- ❌ Role pool built from ALL players (dead included)
- ❌ Could suggest dead players' roles
- ❌ No null safety

### After:
```typescript
const candidates = updatedPlayers.filter((p: any) => p.isAlive && !p.roleData?.isRevealed)
const eligibleRoles = candidates
  .map((p: any) => p.role)
  .filter((role): role is string => role !== undefined && role !== null)
const presentRoles = Array.from(new Set(eligibleRoles))

if (presentRoles.length === 0) {
  console.warn('[Glitch] No eligible roles found for glitch message')
} else {
  const randomRole = presentRoles[Math.floor(Math.random() * presentRoles.length)]
  // ... create message
}
```

**Improvements:**
- ✅ Role pool built ONLY from alive, non-revealed players
- ✅ Null/undefined filtering
- ✅ Safety checks for empty arrays

## Testing Scenarios

1. **Normal case:** 8 players alive, none revealed → Glitch works normally
2. **With deaths:** 5 alive, 3 dead → Only shows roles from the 5 alive
3. **Gunner revealed:** Gunner shot someone → Gunner excluded from candidates
4. **Post-conversion:** Seer got bitten → Shows as Wolf, not Seer
5. **Revenant absorbed:** Revenant absorbed Doctor → Shows as Doctor
6. **All revealed edge case:** All alive players revealed → Glitch skips with warning
7. **Late game:** Only 2 players left → Works correctly with limited pool

## Additional Notes

- The glitch only triggers once per game (`game.chaosRevealUsed` flag)
- Probability increases: 35% Round 2, 60% Round 3, 100% Round 4+
- Works in both normal and chaos game modes
- Message format differs between modes but logic is identical
