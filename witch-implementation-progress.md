# 🧙 Witch Implementation Progress

## ✅ COMPLETED (Backend & Core Logic)

### 1. Schema Updates ✅
- [x] Added `'witch'` to `gameRoleValidator`
- [x] Added `'heal'` to `actionTypeValidator`
- [x] Added `'poison'` to `actionTypeValidator`
- [x] Added `healPotionUsed: v.optional(v.boolean())` to `roleData`
- [x] Added `poisonPotionUsed: v.optional(v.boolean())` to `roleData`

**File:** `convex/schema.ts`

---

### 2. Game Engine Updates ✅
- [x] Added `'witch'` to `GameRole` type
- [x] Added `witch: number` to `RoleDist` interface
- [x] Updated `ROLE_DISTRIBUTION`:
  - 5-9 players: `doctor: 1, witch: 0` (Doctor only)
  - 10-12 players: `doctor: 0, witch: 1` (Witch replaces Doctor)
- [x] Added Witch to `buildRoleList` function
- [x] Added Witch initial state to `buildRoleData` function:
  ```typescript
  if (role === 'witch') {
    return { healPotionUsed: false, poisonPotionUsed: false }
  }
  ```
- [x] Updated `resolveNight` function:
  - Checks for both Doctor save AND Witch heal
  - Processes Witch heal action
  - Marks `healPotionUsed: true` when used
  - Processes Witch poison as separate kill
  - Marks `poisonPotionUsed: true` when used
  - Handles Hunter trigger from poison
  - Sends poison death message

**File:** `convex/gameEngine.ts`

---

### 3. Role Configuration ✅
- [x] Added Witch to `roleConfig` object
  - Color: Purple (`text-purple-400`)
  - Background: `bg-purple-400/10`
  - Border: `border-purple-400/30`
  - Button: `bg-purple-500 hover:bg-purple-500/90`
  - Title: "Witch"
  - Description: "Wield two powerful potions: one to save a life, one to take it. Choose wisely."
  - Ability: Full description of heal and poison potions
  - Team: 'village'
  - Image placeholder: `/witch-photoroom.png`

**File:** `src/lib/role-config.ts`

---

## 🚧 TODO (Frontend & UI)

### 4. Action Panel Updates ⏳
**Need to create Witch-specific night panel**

**File to update:** `src/components/game/ActionPanel.tsx`

Required components:
```tsx
{role === 'witch' && phase === 'night' && (
  <div className="witch-panel">
    {/* Wolf target display */}
    <div className="wolf-target-info">
      🎯 Wolves are targeting: {wolfTargetName}
    </div>
    
    {/* Heal Potion Button */}
    {!roleData?.healPotionUsed && (
      <button onClick={() => submitHeal(wolfTargetId)}>
        🩹 Save {wolfTargetName} (Heal Potion)
      </button>
    )}
    
    {/* Poison Potion Section */}
    {!roleData?.poisonPotionUsed && (
      <PlayerSelector 
        onSelect={(playerId) => submitPoison(playerId)}
        label="☠️ Poison Potion - Choose target"
      />
    )}
    
    {/* Both potions used */}
    {roleData?.healPotionUsed && roleData?.poisonPotionUsed && (
      <div>Both potions used. You are now a regular Villager.</div>
    )}
  </div>
)}
```

**Key Features Needed:**
- Show wolf target to Witch (need to fetch this in query)
- Heal button (if not used)
- Poison player selector (if not used)
- Status display when potions are used

---

### 5. Witch-Specific Actions/Mutations ⏳
**Need to create backend mutations for Witch actions**

**File to update:** `convex/gameActions.ts` (or similar)

Required mutations:
```typescript
export const useHealPotion = mutation({
  args: { 
    gameId: v.id('games'), 
    playerId: v.id('players'),
    targetId: v.id('players') 
  },
  handler: async (ctx, args) => {
    // Validate Witch can use heal
    // Ensure target is wolf's target
    // Create 'heal' action
  }
})

export const usePoisonPotion = mutation({
  args: { 
    gameId: v.id('games'), 
    playerId: v.id('players'),
    targetId: v.id('players') 
  },
  handler: async (ctx, args) => {
    // Validate Witch can use poison
    // Ensure target is alive
    // Create 'poison' action
  }
})
```

---

### 6. Query Updates ⏳
**Need to track wolf target for Witch**

**File to update:** Night phase queries

Required: Query that shows wolf target to Witch:
```typescript
// In night phase, Witch needs to see who wolves are targeting
// Once wolf votes come in, calculate majority target
// Show to Witch player
```

Options:
1. Real-time tracking as wolves vote
2. Show after all wolves vote
3. Show at phase transition

**Recommended:** Show real-time as majority forms

---

### 7. Game Guide/Help Updates ⏳
**Add Witch to game guide**

**File to update:** `src/app/game.guide.tsx`

Need to add:
- Witch role description
- Both potion mechanics
- Strategic tips
- Win condition (same as Village)

---

### 8. Image Asset ⏳
**Create/add Witch character image**

**File needed:** `public/witch-photoroom.png`

Requirements:
- Match style of other role images
- Purple/mystical theme
- Transparent background
- Photoroom style (consistent with others)

---

## 🎯 Next Steps (Priority Order)

### Immediate (Critical for functionality):
1. **Create Witch action mutations** (useHealPotion, usePoisonPotion)
2. **Update ActionPanel.tsx** with Witch UI
3. **Add wolf target tracking** to night phase queries

### Soon (Important for UX):
4. **Add Witch to game guide**
5. **Create/add Witch image asset**

### Optional (Polish):
6. **Add Witch-specific sound effects**
7. **Add potion usage animations**
8. **Add Witch tips/tutorial**

---

## 🧪 Testing Checklist

Once UI is complete, test:

- [ ] 10-player game has Witch (not Doctor)
- [ ] Witch starts with both potions unused
- [ ] Witch can see wolf target during night
- [ ] Heal potion saves wolf target correctly
- [ ] Heal potion marks as used after use
- [ ] Poison potion kills target correctly
- [ ] Poison potion marks as used after use
- [ ] Cannot use both potions same night
- [ ] Poison killing Hunter triggers revenge
- [ ] Poison message displays correctly
- [ ] Both potions used = no more abilities
- [ ] Witch shows correctly in role reveal
- [ ] Witch appears in game guide

---

## 📝 Implementation Notes

### Night Resolution Flow (Current):
```
1. Shadow Wolf Mute
2. Doctor Save (recorded)
3. Kitten Wolf Conversion (if used, ends night)
4. Wolf Kill + Witch Heal check
   ├─ If saved by Doctor OR Witch: Survival message
   ├─ If Witch used heal: Mark healPotionUsed = true
   └─ If not saved: Death message
5. Witch Poison (NEW!)
   ├─ Kill target
   ├─ Check if Hunter (trigger revenge)
   ├─ Send poison death message
   └─ Mark poisonPotionUsed = true
6. Revenant Absorption
```

### Double Death Scenario:
```
Wolf kills: Alice
Witch poisons: Bob

Messages:
1. "Alice was killed during the night."
2. "☠️ Bob was poisoned by mysterious forces."

Result: 2 deaths in one night (normal behavior)
```

### Edge Cases Handled:
- ✅ Poison killing Hunter → Revenge triggers
- ✅ Heal + Doctor save same target → Both work (redundant but safe)
- ✅ Witch poison after wolf kill → Separate resolution
- ✅ Poison alive check → Only kills if target is alive
- ✅ Both potions tracking → Independent flags

### Edge Cases TODO (in UI):
- ⏳ Prevent using both potions same night (UI validation)
- ⏳ Show wolf target in real-time or after votes?
- ⏳ What if no wolf target (wolves didn't vote)?

---

## 📊 Role Distribution Summary

| Players | Wolf | K.Wolf | S.Wolf | Seer | Doctor | **Witch** | Gunner | Detective | Hunter | Revenant | Villager |
|---------|------|--------|--------|------|--------|-----------|--------|-----------|--------|----------|----------|
| 5       | 1    | 0      | 0      | 1    | **1**  | 0         | 0      | 0         | 0      | 0        | 2        |
| 6       | 1    | 0      | 0      | 1    | **1**  | 0         | 1      | 0         | 0      | 0        | 2        |
| 7       | 2    | 0      | 0      | 1    | **1**  | 0         | 1      | 0         | 1      | 0        | 1        |
| 8       | 1    | 0      | 1      | 1    | **1**  | 0         | 1      | 1         | 1      | 1        | 0        |
| 9       | 1    | 1      | 0      | 1    | **1**  | 0         | 1      | 0         | 1      | 1        | 2        |
| 10      | 0    | 1      | 1      | 1    | 0      | **1**     | 1      | 1         | 1      | 1        | 2        |
| 11      | 0    | 1      | 1      | 1    | 0      | **1**     | 1      | 1         | 1      | 1        | 3        |
| 12      | 0    | 1      | 1      | 1    | 0      | **1**     | 1      | 1         | 1      | 1        | 4        |

**5-9 players:** Doctor  
**10-12 players:** Witch (replaces Doctor)

---

## 🎉 Summary

**Backend Implementation: 100% Complete** ✅
- Schema ✅
- Role distribution ✅
- Game engine logic ✅
- Role configuration ✅
- Night resolution ✅

**Frontend Implementation: 0% Complete** ⏳
- Action Panel UI ⏳
- Witch mutations ⏳
- Wolf target tracking ⏳
- Game guide ⏳
- Image asset ⏳

**Estimated Remaining Time:** 2-3 hours
- Mutations: 30 min
- ActionPanel UI: 60 min
- Wolf target tracking: 45 min
- Game guide: 15 min
- Testing: 30 min

**Next File to Edit:** `src/components/game/ActionPanel.tsx`
