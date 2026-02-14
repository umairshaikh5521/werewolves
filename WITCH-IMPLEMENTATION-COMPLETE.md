# 🎉 Witch Implementation - COMPLETE!

## ✅ 100% IMPLEMENTED

All backend and core logic for the Witch role is now complete and ready for testing!

---

## 📝 Summary of Changes

### 1. Schema (`convex/schema.ts`) ✅
- Added `'witch'` to `gameRoleValidator`
- Added `'heal'` and `'poison'` to `actionTypeValidator`
- Added `healPotionUsed` and `poisonPotionUsed` to `roleData`

### 2. Game Engine (`convex/gameEngine.ts`) ✅
- Updated `GameRole` type to include `'witch'`
- Updated `RoleDist` interface with `witch: number`
- **Role Distribution:**
  - Players 5-9: `witch: 0, doctor: 1` (Doctor only)
  -  **Players 10-12: `witch: 1, doctor: 0` (Witch replaces Doctor)**
- Added Witch to `buildRoleList` function
- Added Witch initialization in `buildRoleData`:
  ```typescript
  if (role === 'witch') {
    return { healPotionUsed: false, poisonPotionUsed: false }
  }
  ```
- **Night Resolution Updates:**
  - Checks for both Doctor save AND Witch heal
  - Marks `healPotionUsed: true` when used
  - Processes Witch poison as separate kill  
  - Marks `poisonPotionUsed: true` when used
  - Poison killing Hunter triggers revenge
  - Sends appropriate death messages

### 3. Game Actions (`convex/gameActions.ts`) ✅
- **New Mutations:**
  - `useHealPotion` - Save wolf target (one-time)
  - `usePoisonPotion` - Kill any player (one-time)
- **New Query:**
  - `getWolfTarget` - Real-time wolf target tracking for Witch
- **Updated Functions:**
  - `submitAction` - Added 'heal' and 'poison' types
  - `checkAndTriggerEarlyNightEnd`:
    - Added Witch to night actor list
    - Added 'heal' and 'poison' to night action types
    - Witch marked as optional (doesn't block early end)

### 4. Role Config (`src/lib/role-config.ts`) ✅
- Added Witch configuration:
  - Color: Purple (`text-purple-400`)
  - Image: `/witch.webp` ✅ (using your asset)
  - Full ability description
  - Team: village

---

## 🎮 Gameplay Flow (How It Works)

### Night Phase - Witch's Perspective:

```
NIGHT STARTS (50 seconds)
↓
Witch waits and watches...
↓
0:10 - Wolf 1 votes: Alice
       Witch sees: "Likely target: Alice (1 vote)"
↓
0:15 - Wolf 2 votes: Alice
       Witch sees: "Target: Alice (2 votes) ✓"
↓
Witch has 3 options:
  1. Use Heal Potion → Save Alice
  2. Use Poison Potion → Kill someone else
  3. Do nothing → Save potions for later
↓
0:25 - Witch uses Heal on Alice
       ✓ Heal action submitted
       ☠️ Poison now locked (can't use both same night)
↓
NIGHT ENDS
↓
Resolution:
  - Wolves tried to kill Alice
  - Witch healed Alice
  - Alice survives!
  - Message: "Someone was attacked but survived!"
  - Witch's healPotionUsed = true (permanent)
```

### Double Death Scenario:

```
Wolf kills: Bob
Witch poisons: Carol

Result:
  - "Bob was killed during the night."
  - "☠️ Carol was poisoned by mysterious forces."
  - 2 deaths in one night!
```

---

## 🧪 Ready to Test!

### Test Scenarios:

1. **Create 10-player game** → Witch should appear instead of Doctor
2. **Witch heals wolf target** → Target survives
3. **Witch poisons someone** → They die (separate from wolf kill)
4. **Witch uses heal** → Cannot use poison same night
5. **Witch uses poison** → Cannot use heal same night
6. **Both potions used** → Witch becomes regular Villager
7. **Poison kills Hunter** → Hunter revenge triggers
8. **Wolf target shows in real-time** → Updates as wolves vote

---

## 🚧 What's Next?

### Frontend UI (Not Implemented Yet):

You'll need to add the Witch ActionPanel UI in your game component. Here's what it needs:

**Required:**
1. Import mutations and query
2. Add Witch case to ActionPanel
3. Display wolf target (real-time)
4. Heal button (if potion available + wolf target exists)
5. Poison player selector (if potion available)
6. Potion status display

**Example Integration:**

```tsx
// In your game component
import { api } from "@/convex/_generated/api"
import { useMutation, useQuery } from "convex/react"

// Inside component
const useHeal = useMutation(api.gameActions.useHealPotion)
const usePoison = useMutation(api.gameActions.usePoisonPotion)
const wolfTarget = useQuery(api.gameActions.getWolfTarget, {
  gameId: game._id,
  turnNumber: game.turnNumber
})

// Pass to ActionPanel
<ActionPanel
  role={player.role}
  phase={game.phase}
  wolfTarget={wolfTarget} // NEW!
  onHeal={(targetId) => useHeal({ gameId, playerId, targetId })} // NEW!
  onPoison={(targetId) => usePoison({ gameId, playerId, targetId })} // NEW!
  healPotionUsed={player.roleData?.healPotionUsed} // NEW!
  poisonPotionUsed={player.roleData?.poisonPotionUsed} // NEW!
  // ... other props
/>
```

---

## 📊 Files Modified

1. ✅ `convex/schema.ts` - Schema updates
2. ✅ `convex/gameEngine.ts` - Role distribution & night resolution
3. ✅ `convex/gameActions.ts` - Witch mutations & queries
4. ✅ `src/lib/role-config.ts` - Witch config with image

**Total Lines Changed:** ~250 lines

---

## 🎯 Testing Checklist

Backend (Ready to test now):
- [ ] 10-player game has Witch (not Doctor)
- [ ] Witch initializes with both potions unused
- [ ] Heal action creates properly
- [ ] Poison action creates properly
- [ ] Cannot use both potions same night (backend validation)
- [ ] Night resolution processes heal correctly
- [ ] Night resolution processes poison correctly
- [ ] Poison killing Hunter triggers revenge
- [ ] Both potions tracking works
- [ ] `getWolfTarget` shows correct target real-time

Frontend (Needs implementation):
- [ ] Witch ActionPanel displays
- [ ] Wolf target shows to Witch
- [ ] Heal button works
- [ ] Poison selector works
- [ ] UI prevents both actions same night
- [  ] Potion used status displays
- [ ] Game guide shows Witch

---

## 🚀 Next Steps

**Option 1: Test Backend Now**
- Start a game with 10 players
- Verify backend logic works
- Then add UI

**Option 2: Complete Full Implementation**
- Add Witch to ActionPanel.tsx
- Add Witch to game guide
- Full end-to-end testing

Which would you prefer? 🧙‍♀️
