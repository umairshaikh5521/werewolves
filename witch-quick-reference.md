# Quick Reference: Witch Implementation

## 🎯 TL;DR

**What:** Replace Doctor with Witch at 10-12 player games  
**Why:** More strategic depth, dual ability (heal + poison), information advantage  
**Impact:** 1:1 replacement, no balance disruption, higher skill ceiling  

---

## 📊 Role Distribution Changes

### BEFORE (Current)
```
10 Players:
🐺 Kitten Wolf (1)
🌑 Shadow Wolf (1)
🔮 Seer (1)
💉 Doctor (1)      ← REPLACE THIS
🔫 Gunner (1)
🔍 Detective (1)
🏹 Hunter (1)
👻 Revenant (1)
👤 Villager (2)
```

### AFTER (With Witch)
```
10 Players:
🐺 Kitten Wolf (1)
🌑 Shadow Wolf (1)
🔮 Seer (1)
🧙 Witch (1)       ← NEW!
🔫 Gunner (1)
🔍 Detective (1)
🏹 Hunter (1)
👻 Revenant (1)
👤 Villager (2)
```

**Same applies for 11 and 12 players**

---

## 🧙 Witch Quick Stats

| Feature | Details |
|---------|---------|
| **Team** | Village (Good) |
| **Potions** | 2 total (1 heal, 1 poison) |
| **Heal** | Save one wolf target (one-time) |
| **Poison** | Kill anyone at night (one-time) |
| **Info Gain** | Learns wolf target each night |
| **Usage Rule** | Can't use both potions same night |

---

## ⚖️ Doctor vs Witch

| Aspect | Doctor | Witch |
|--------|--------|-------|
| **Protection Uses** | ♾️ Unlimited | 1️⃣ One-time |
| **Knows Wolf Target?** | ❌ No (guesses) | ✅ Yes (sees it!) |
| **Offensive Ability** | ❌ No | ✅ Poison (kill) |
| **Can Protect Twice in Row** | ❌ No | ✅ Yes |
| **Skill Ceiling** | 🟢 Medium | 🔴 High |
| **Strategic Depth** | 🟢 Medium | 🔴 Very High |

---

## 🎮 Key Gameplay Changes

### 1. **Information Warfare**
```diff
- Doctor: "I protected someone" (vague)
+ Witch: "I know wolves targeted Bob" (specific!)
```

### 2. **Double Death Nights**
```diff
- Before: Max 1 death/night (wolf kill only)
+ Witch: Max 2 deaths/night (wolf kill + poison)
```

### 3. **Offensive Village Power**
```diff
- Before: Village can only kill via votes/Gunner (day)
+ Witch: Village can kill at NIGHT (poison)
```

### 4. **High-Risk Decisions**
```diff
- Doctor: Low risk (just guessing who to protect)
+ Witch: HIGH risk (poison wrong person = help wolves!)
```

---

## ✅ Implementation Checklist

### Code Changes Required:

- [ ] **Schema Updates**
  - [ ] Add `v.literal('witch')` to `gameRoleValidator`
  - [ ] Add `healPotionUsed: v.optional(v.boolean())` to `roleData`
  - [ ] Add `poisonPotionUsed: v.optional(v.boolean())` to `roleData`
  - [ ] Add `wolfTargetId: v.optional(v.id('players'))` to `roleData`
  - [ ] Add `v.literal('heal')` to `actionTypeValidator`
  - [ ] Add `v.literal('poison')` to `actionTypeValidator`

- [ ] **Role Distribution**
  - [ ] Update `ROLE_DISTRIBUTION[10]`: `doctor: 0, witch: 1`
  - [ ] Update `ROLE_DISTRIBUTION[11]`: `doctor: 0, witch: 1`
  - [ ] Update `ROLE_DISTRIBUTION[12]`: `doctor: 0, witch: 1`

- [ ] **Game Engine**
  - [ ] Add wolf target tracking for Witch
  - [ ] Implement heal action resolution
  - [ ] Implement poison action resolution
  - [ ] Update night resolution order
  - [ ] Add Witch notifications

- [ ] **Action Panel UI**
  - [ ] Create Witch night panel
  - [ ] Show wolf target to Witch
  - [ ] Heal potion button (if not used)
  - [ ] Poison potion with player selector
  - [ ] Display potion status

- [ ] **Role Config**
  - [ ] Add Witch to `roleConfig` in `role-config.ts`
  - [ ] Create Witch role card design
  - [ ] Add Witch icon/image
  - [ ] Write ability description

- [ ] **Game Guide**
  - [ ] Add Witch to game guide
  - [ ] Explain both potions
  - [ ] Add strategic tips
  - [ ] Note Doctor replacement

---

## 🧪 Testing Plan

### Test Scenario 1: Basic Heal
```
Setup: 10 players, Witch included
Night 2: Wolves target Seer
Witch: Uses heal potion on Seer
Expected: Seer survives, "Someone was attacked but survived!"
```

### Test Scenario 2: Poison Correct Wolf
```
Setup: Witch has info that Bob is Wolf
Night 3: Witch poisons Bob
Expected: Bob dies, message "X was poisoned", Wolf count decreases
```

### Test Scenario 3: Poison Wrong Target
```
Setup: Witch suspects Alice (actually Villager)
Night 4: Witch poisons Alice
Expected: Alice dies, village loses member (oops!)
```

### Test Scenario 4: Double Death Night
```
Night 5:
- Wolves kill: Carol
- Witch poisons: Bob
Expected: 2 death messages, both players dead
```

### Test Scenario 5: Poison Hunter
```
Night 6: Witch poisons Hunter
Expected: Hunter dies, Hunter Revenge phase triggered
```

---

## 🎯 Success Metrics

After implementing, measure:

1. **Player Engagement**
   - Are players excited about Witch?
   - More chat activity around Witch claims?

2. **Strategic Depth**
   - Are Witch players making interesting decisions?
   - Is poison being used effectively?

3. **Balance**
   - Win rate: Village vs Wolves (should stay ~50/50)
   - Are games ending faster/slower?

4. **Fun Factor**
   - Post-game feedback
   - "Epic moments" from Witch plays
   - Poison success rate

---

## 🚨 Potential Issues & Solutions

### Issue 1: Poison Wasted Too Often
**Solution:** Add tutorial or tip: "Wait for Seer/Detective confirmation before poisoning"

### Issue 2: Witch Too Powerful
**Solution:** Reduce to 1 heal only (remove poison) OR require Witch to decide before seeing wolf target

### Issue 3: Players Confused About Dual Ability
**Solution:** Better UI with clear "Choose ONE action per night" messaging

### Issue 4: Info Leak Creates Meta Issues
**Solution:** Add option to toggle "auto-reveal wolf target" in settings

---

## 📝 Communication Plan

### Before Launch:
```
Update game guide
Add "NEW ROLE" banner
Explain Witch mechanics in lobby
```

### During Rollout:
```
Monitor first 10 games with Witch
Gather player feedback
Watch for balance issues
```

### Post-Launch:
```
Analyze win rates
Adjust if needed
Consider similar dual-ability roles
```

---

## 🏁 Final Recommendation

### **Implement Witch at 10-12 Players** ✅

**Priority Level:** HIGH  
**Complexity:** Medium  
**Impact:** Very Positive  
**Player Demand:** High (classic role)  
**Balance Risk:** Low (1:1 replacement)  

**Next Steps:**
1. Read full analysis in `witch-complete-analysis.md`
2. Review code changes in checklist above
3. Implement schema changes
4. Add Witch to role distribution
5. Create Witch UI components
6. Test thoroughly
7. Deploy to 10+ player games

**Estimated Development Time:** 4-6 hours  
**Expected Player Reception:** Very Positive 🎉
