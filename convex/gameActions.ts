import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import { checkWinCondition } from './gameEngine'

export const submitAction = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    targetId: v.id('players'),
    type: v.union(
      v.literal('vote'),
      v.literal('kill'),
      v.literal('save'),
      v.literal('heal'),
      v.literal('poison'),
      v.literal('scan')
    ),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'active') throw new Error('Game not active')

    const actor = await ctx.db.get(args.playerId)
    if (!actor || !actor.isAlive) throw new Error('Player is not alive')

    const target = await ctx.db.get(args.targetId)
    if (!target) throw new Error('Target not found')

    if (args.type === 'kill') {
      if (game.phase !== 'night') throw new Error('Can only kill at night')
      if (actor.role !== 'wolf' && actor.role !== 'kittenWolf' && actor.role !== 'shadowWolf') throw new Error('Only wolves can kill')
      if (target.team === 'bad') throw new Error('Cannot kill fellow wolf')
    } else if (args.type === 'save') {
      if (game.phase !== 'night') throw new Error('Can only save at night')
      if (actor.role !== 'doctor') throw new Error('Only doctor can save')
      if (actor.roleData?.lastProtectedId === args.targetId) {
        throw new Error('Cannot protect the same player two nights in a row')
      }
    } else if (args.type === 'scan') {
      if (game.phase !== 'night') throw new Error('Can only scan at night')
      if (actor.role !== 'seer') throw new Error('Only seer can scan')
    } else if (args.type === 'vote') {
      if (game.phase !== 'voting') throw new Error('Can only vote during voting phase')
      if (!target.isAlive) throw new Error('Cannot vote for dead player')
    }

    const existingAction = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()

    const duplicate = existingAction.find(
      (a) => a.actorId === args.playerId && a.type === args.type
    )
    if (duplicate) {
      await ctx.db.patch(duplicate._id, { targetId: args.targetId })

      if (args.type === 'vote' && game.phase === 'voting') {
        await checkAndTriggerEarlyVotingEnd(ctx, args.gameId, game, existingAction)
      }

      if (game.phase === 'night' && ['kill', 'save', 'heal', 'poison', 'scan'].includes(args.type)) {
        await checkAndTriggerEarlyNightEnd(ctx, args.gameId, game, existingAction)
      }

      return duplicate._id
    }

    const actionId = await ctx.db.insert('actions', {
      gameId: args.gameId,
      turnNumber: game.turnNumber,
      phase: game.phase,
      type: args.type,
      actorId: args.playerId,
      targetId: args.targetId,
    })

    const allActions = [...existingAction, {
      _id: actionId,
      gameId: args.gameId,
      turnNumber: game.turnNumber,
      phase: game.phase,
      type: args.type,
      actorId: args.playerId,
      targetId: args.targetId,
    }]

    if (args.type === 'vote' && game.phase === 'voting') {
      await checkAndTriggerEarlyVotingEnd(ctx, args.gameId, game, allActions)
    }

    if (game.phase === 'night' && ['kill', 'save', 'heal', 'poison', 'scan'].includes(args.type)) {
      await checkAndTriggerEarlyNightEnd(ctx, args.gameId, game, allActions)
    }

    return actionId
  },
})

async function checkAndTriggerEarlyVotingEnd(ctx: any, gameId: any, game: any, actions: any[]) {
  const players = await ctx.db
    .query('players')
    .withIndex('by_game', (q: any) => q.eq('gameId', gameId))
    .collect()

  const alivePlayers = players.filter((p: any) => p.isAlive)
  const votes = actions.filter((a: any) => a.type === 'vote' && a.phase === 'voting')

  const uniqueVoters = new Set(votes.map((v: any) => v.actorId.toString()))

  if (uniqueVoters.size === alivePlayers.length) {
    await ctx.scheduler.runAfter(0, internal.gameEngine.transitionPhase, {
      gameId,
      expectedTurn: game.turnNumber,
      expectedPhase: 'voting',
    })
  }
}

async function checkAndTriggerEarlyNightEnd(ctx: any, gameId: any, game: any, actions: any[]) {
  const players = await ctx.db
    .query('players')
    .withIndex('by_game', (q: any) => q.eq('gameId', gameId))
    .collect()

  const alivePlayers = players.filter((p: any) => p.isAlive)

  // Determine which players need to act at night
  const nightActors = alivePlayers.filter((p: any) => {
    const role = p.role
    if (role === 'wolf' || role === 'kittenWolf' || role === 'shadowWolf' || role === 'seer' || role === 'doctor' || role === 'witch' || role === 'detective') return true
    // Revenant is a night actor from turn 2 onward (turn 1 is Night 2)
    if (role === 'revenant' && game.turnNumber >= 1) return true
    return false
  })

  // Check if each night actor has submitted an action
  // Shadow Wolf needs BOTH a kill vote AND a mute (or skipMute) action
  const nightActionTypes = ['kill', 'save', 'heal', 'poison', 'scan', 'investigate', 'convert', 'mute', 'skipMute', 'absorb']
  const nightActions = actions.filter((a: any) => nightActionTypes.includes(a.type) && a.phase === 'night')

  const allActed = nightActors.every((p: any) => {
    const playerActions = nightActions.filter((a: any) => a.actorId.toString() === p._id.toString())
    if (p.role === 'shadowWolf') {
      // Shadow Wolf needs kill + (mute or skipMute)
      const hasKill = playerActions.some((a: any) => a.type === 'kill')
      const hasMuteAction = playerActions.some((a: any) => a.type === 'mute' || a.type === 'skipMute')
      return hasKill && hasMuteAction
    }
    // Witch is optional - they don't NEED to act (can save potions)
    if (p.role === 'witch') {
      return true // Witch is always "done" (can choose to not act)
    }
    return playerActions.length > 0
  })

  if (allActed && nightActors.length > 0) {
    await ctx.scheduler.runAfter(0, internal.gameEngine.transitionPhase, {
      gameId,
      expectedTurn: game.turnNumber,
      expectedPhase: 'night',
    })
  }
}

export const shootGun = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    targetId: v.id('players'),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'active') throw new Error('Game not active')
    if (game.phase !== 'day') throw new Error('Can only shoot during the day')

    const gunner = await ctx.db.get(args.playerId)
    if (!gunner || !gunner.isAlive) throw new Error('Player is not alive')
    if (gunner.role !== 'gunner') throw new Error('Only gunner can shoot')

    const bullets = gunner.roleData?.bullets ?? 0
    if (bullets <= 0) throw new Error('No ammo remaining')

    const target = await ctx.db.get(args.targetId)
    if (!target || !target.isAlive) throw new Error('Target is not alive')
    if (args.targetId === args.playerId) throw new Error('Cannot shoot yourself')

    // Check if gunner has already shot this turn
    const existingShots = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()

    const hasAlreadyShot = existingShots.some(
      (a) => a.actorId === args.playerId && a.type === 'shoot'
    )
    if (hasAlreadyShot) throw new Error('You can only shoot once per round')

    await ctx.db.patch(gunner._id, {
      roleData: {
        ...gunner.roleData,
        bullets: bullets - 1,
        isRevealed: true,
      },
    })

    await ctx.db.patch(target._id, { isAlive: false })

    await ctx.db.insert('actions', {
      gameId: args.gameId,
      turnNumber: game.turnNumber,
      phase: game.phase,
      type: 'shoot',
      actorId: args.playerId,
      targetId: args.targetId,
    })

    await ctx.db.insert('chat', {
      gameId: args.gameId,
      senderId: args.playerId,
      senderName: 'System',
      content: `BANG! ${gunner.name} shot ${target.name}!`,
      channel: 'global',
      timestamp: Date.now(),
    })

    // Check if the shot target is the Hunter — trigger hunter revenge
    if (target.role === 'hunter') {
      const HUNTER_REVENGE_DURATION = 20_000
      const phaseEndTime = Date.now() + HUNTER_REVENGE_DURATION
      await ctx.db.patch(args.gameId, {
        phase: 'hunter_revenge',
        phaseEndTime,
        hunterRevengePlayerId: target._id,
        previousPhase: 'day',
      })
      await ctx.db.insert('chat', {
        gameId: args.gameId,
        senderId: target._id,
        senderName: 'System',
        content: '🏹 The Hunter has fallen! With their dying breath, they take aim...',
        channel: 'global',
        timestamp: Date.now(),
      })
      await ctx.scheduler.runAfter(HUNTER_REVENGE_DURATION, internal.gameEngine.transitionPhase, {
        gameId: args.gameId,
        expectedTurn: game.turnNumber,
        expectedPhase: 'hunter_revenge',
      })
      return { killed: target.name, hunterRevenge: true }
    }

    // Normal win condition check (non-Hunter target)
    const players = await ctx.db
      .query('players')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect()

    const updatedPlayers = players.map((p) =>
      p._id === target._id ? { ...p, isAlive: false } : p
    )

    const winner = checkWinCondition(updatedPlayers)
    if (winner) {
      const endReason = winner === 'good'
        ? `${gunner.name} shot the last werewolf!`
        : `${gunner.name} shot a villager and the wolves won!`
      await ctx.db.patch(args.gameId, {
        status: 'ended',
        winningTeam: winner,
        endReason
      })
    }

    return { killed: target.name }
  },
})

export const investigatePlayers = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    targetId1: v.id('players'),
    targetId2: v.id('players'),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'active') throw new Error('Game not active')
    if (game.phase !== 'night') throw new Error('Can only investigate at night')

    const detective = await ctx.db.get(args.playerId)
    if (!detective || !detective.isAlive) throw new Error('Player is not alive')
    if (detective.role !== 'detective') throw new Error('Only detective can investigate')

    if (args.targetId1 === args.targetId2) throw new Error('Must select two different players')

    const p1 = await ctx.db.get(args.targetId1)
    const p2 = await ctx.db.get(args.targetId2)
    if (!p1 || !p2) throw new Error('Target not found')

    const existingActions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()

    const existing = existingActions.find(
      (a) => a.actorId === args.playerId && a.type === 'investigate'
    )

    if (existing) {
      await ctx.db.patch(existing._id, {
        targetId: args.targetId1,
        targetId2: args.targetId2,
      })
    } else {
      await ctx.db.insert('actions', {
        gameId: args.gameId,
        turnNumber: game.turnNumber,
        phase: game.phase,
        type: 'investigate',
        actorId: args.playerId,
        targetId: args.targetId1,
        targetId2: args.targetId2,
      })
    }

    // Check for early night end after detective investigates
    const updatedActions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()
    await checkAndTriggerEarlyNightEnd(ctx, args.gameId, game, updatedActions)

    // For detective comparison: Revenant (village team pre-absorb) compares same as villager
    const sameTeam = p1.team === p2.team
    return { sameTeam, target1Name: p1.name, target2Name: p2.name }
  },
})

// Shadow Wolf mute action
export const submitMute = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    targetId: v.id('players'),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'active') throw new Error('Game not active')
    if (game.phase !== 'night') throw new Error('Can only mute at night')

    const actor = await ctx.db.get(args.playerId)
    if (!actor || !actor.isAlive) throw new Error('Player is not alive')
    if (actor.role !== 'shadowWolf') throw new Error('Only Shadow Wolf can mute')

    const target = await ctx.db.get(args.targetId)
    if (!target || !target.isAlive) throw new Error('Target is not alive')
    if (target.team === 'bad') throw new Error('Cannot mute fellow wolves')

    const existingActions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()

    const existing = existingActions.find(
      (a) => a.actorId === args.playerId && a.type === 'mute'
    )

    // Remove any skipMute if switching to mute
    const existingSkip = existingActions.find(
      (a) => a.actorId === args.playerId && a.type === 'skipMute'
    )
    if (existingSkip) {
      await ctx.db.delete(existingSkip._id)
    }

    if (existing) {
      await ctx.db.patch(existing._id, { targetId: args.targetId })

      const updatedActions = await ctx.db
        .query('actions')
        .withIndex('by_game_turn', (q) =>
          q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
        )
        .collect()
      await checkAndTriggerEarlyNightEnd(ctx, args.gameId, game, updatedActions)

      return existing._id
    }

    const actionId = await ctx.db.insert('actions', {
      gameId: args.gameId,
      turnNumber: game.turnNumber,
      phase: game.phase,
      type: 'mute',
      actorId: args.playerId,
      targetId: args.targetId,
    })

    const updatedActions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()
    await checkAndTriggerEarlyNightEnd(ctx, args.gameId, game, updatedActions)

    return actionId
  },
})

// Shadow Wolf skip mute action (choose not to mute anyone)
export const skipMute = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'active') throw new Error('Game not active')
    if (game.phase !== 'night') throw new Error('Can only skip mute at night')

    const actor = await ctx.db.get(args.playerId)
    if (!actor || !actor.isAlive) throw new Error('Player is not alive')
    if (actor.role !== 'shadowWolf') throw new Error('Only Shadow Wolf can skip mute')

    const existingActions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()

    // Remove any existing mute action
    const existingMute = existingActions.find(
      (a) => a.actorId === args.playerId && a.type === 'mute'
    )
    if (existingMute) {
      await ctx.db.delete(existingMute._id)
    }

    const existingSkip = existingActions.find(
      (a) => a.actorId === args.playerId && a.type === 'skipMute'
    )
    if (existingSkip) return existingSkip._id

    // Insert a skipMute action so early night end knows the Shadow Wolf is done
    const actionId = await ctx.db.insert('actions', {
      gameId: args.gameId,
      turnNumber: game.turnNumber,
      phase: game.phase,
      type: 'skipMute',
      actorId: args.playerId,
      targetId: args.playerId, // self-target as placeholder
    })

    const updatedActions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()
    await checkAndTriggerEarlyNightEnd(ctx, args.gameId, game, updatedActions)

    return actionId
  },
})

// Hunter revenge mutation
export const hunterRevenge = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    targetId: v.id('players'),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'active') throw new Error('Game not active')
    if (game.phase !== 'hunter_revenge') throw new Error('Not in hunter revenge phase')
    if (game.hunterRevengePlayerId !== args.playerId) throw new Error('Not the dying Hunter')

    const hunter = await ctx.db.get(args.playerId)
    if (!hunter) throw new Error('Hunter not found')
    if (hunter.role !== 'hunter') throw new Error('Only Hunter can take revenge')

    const target = await ctx.db.get(args.targetId)
    if (!target || !target.isAlive) throw new Error('Target is not alive')

    // Check for existing revenge action
    const existingActions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()

    const existing = existingActions.find(
      (a) => a.actorId === args.playerId && a.type === 'revenge'
    )

    if (existing) {
      await ctx.db.patch(existing._id, { targetId: args.targetId })
    } else {
      await ctx.db.insert('actions', {
        gameId: args.gameId,
        turnNumber: game.turnNumber,
        phase: game.phase,
        type: 'revenge',
        actorId: args.playerId,
        targetId: args.targetId,
      })
    }

    // Trigger immediate phase transition (don't wait for timer)
    await ctx.scheduler.runAfter(0, internal.gameEngine.transitionPhase, {
      gameId: args.gameId,
      expectedTurn: game.turnNumber,
      expectedPhase: 'hunter_revenge',
    })

    return { targetName: target.name }
  },
})

export const getSeerResult = query({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    turnNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId)
    if (!player || player.role !== 'seer') return null

    const actions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', args.turnNumber)
      )
      .collect()

    const scanAction = actions.find(
      (a) => a.actorId === args.playerId && a.type === 'scan'
    )
    if (!scanAction) return null

    const target = await ctx.db.get(scanAction.targetId)
    if (!target) return null

    // Neutral/Revenant shows as "good" to the Seer — they're not a wolf
    const displayTeam = target.team === 'bad' ? 'bad' : 'good'

    return {
      targetId: target._id,
      targetName: target.name,
      team: displayTeam,
    }
  },
})

export const getDetectiveResult = query({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    turnNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId)
    if (!player || player.role !== 'detective') return null

    const actions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', args.turnNumber)
      )
      .collect()

    const action = actions.find(
      (a) => a.actorId === args.playerId && a.type === 'investigate'
    )
    if (!action || !action.targetId2) return null

    const p1 = await ctx.db.get(action.targetId)
    const p2 = await ctx.db.get(action.targetId2)
    if (!p1 || !p2) return null

    return {
      target1Name: p1.name,
      target2Name: p2.name,
      sameTeam: p1.team === p2.team,
    }
  },
})

export const getActionsForTurn = query({
  args: { gameId: v.id('games'), turnNumber: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', args.turnNumber)
      )
      .collect()
  },
})

export const convertPlayer = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    targetId: v.id('players'),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'active') throw new Error('Game not active')
    if (game.phase !== 'night') throw new Error('Can only convert at night')

    const actor = await ctx.db.get(args.playerId)
    if (!actor || !actor.isAlive) throw new Error('Player is not alive')
    if (actor.role !== 'kittenWolf') throw new Error('Only Kitten Wolf can convert')
    if (actor.roleData?.hasBitten) throw new Error('Bite ability already used')

    const target = await ctx.db.get(args.targetId)
    if (!target || !target.isAlive) throw new Error('Target is not alive')
    if (target.team === 'bad') throw new Error('Cannot convert fellow wolves')

    await ctx.db.patch(actor._id, {
      roleData: {
        ...actor.roleData,
        hasBitten: true,
      },
    })

    const existingActions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()

    const existingConvert = existingActions.find(
      (a) => a.actorId === args.playerId && a.type === 'convert'
    )

    if (existingConvert) {
      await ctx.db.patch(existingConvert._id, { targetId: args.targetId })
      return existingConvert._id
    }

    const killActions = existingActions.filter(
      (a) => a.actorId === args.playerId && a.type === 'kill'
    )
    for (const killAction of killActions) {
      await ctx.db.delete(killAction._id)
    }

    const convertId = await ctx.db.insert('actions', {
      gameId: args.gameId,
      turnNumber: game.turnNumber,
      phase: game.phase,
      type: 'convert',
      actorId: args.playerId,
      targetId: args.targetId,
    })

    // Check for early night end after convert
    const updatedActions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()
    await checkAndTriggerEarlyNightEnd(ctx, args.gameId, game, updatedActions)

    return convertId
  },
})

export const getConversionStatus = query({
  args: { gameId: v.id('games'), playerId: v.id('players') },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId)
    if (!player) return null
    return {
      wasConverted: player.wasConverted || false,
      convertedAtTurn: player.convertedAtTurn,
    }
  },
})

export const getVotersThisTurn = query({
  args: { gameId: v.id('games'), turnNumber: v.number() },
  handler: async (ctx, args) => {
    const actions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', args.turnNumber)
      )
      .collect()

    const voteActions = actions.filter((a) => a.type === 'vote' && a.phase === 'voting')
    return voteActions.map((a) => a.actorId)
  },
})

export const getGunnerShotStatus = query({
  args: { gameId: v.id('games'), playerId: v.id('players'), turnNumber: v.number() },
  handler: async (ctx, args) => {
    const actions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', args.turnNumber)
      )
      .collect()

    const hasShot = actions.some(
      (a) => a.actorId === args.playerId && a.type === 'shoot'
    )
    return { hasShot }
  },
})

// Query for all clients to detect when a gunshot happens
export const getShootCount = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const allActions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) => q.eq('gameId', args.gameId))
      .collect()

    const shootActions = allActions.filter((a) => a.type === 'shoot' || a.type === 'revenge')
    return { count: shootActions.length }
  },
})

// Query to check if a player is muted
export const getMuteStatus = query({
  args: { gameId: v.id('games'), playerId: v.id('players') },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId)
    if (!player) return { isMuted: false }
    return { isMuted: player.isMuted || false }
  },
})

// Query to get the hunter revenge state for UI
export const getHunterRevengeState = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.phase !== 'hunter_revenge') return null
    return {
      hunterPlayerId: game.hunterRevengePlayerId,
      phaseEndTime: game.phaseEndTime,
    }
  },
})

// end of file

// Revenant absorb role action
export const absorbRole = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    targetId: v.id('players'),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'active') throw new Error('Game not active')
    if (game.phase !== 'night') throw new Error('Can only absorb at night')
    if (game.turnNumber < 1) throw new Error('Revenant ability activates from Night 2')

    const actor = await ctx.db.get(args.playerId)
    if (!actor || !actor.isAlive) throw new Error('Player is not alive')
    if (actor.role !== 'revenant') throw new Error('Only Revenant can absorb roles')
    if (actor.revenantAbsorbedRole) throw new Error('Already absorbed a role')

    const target = await ctx.db.get(args.targetId)
    if (!target) throw new Error('Target not found')
    if (target.isAlive) throw new Error('Can only absorb dead players\' roles')
    if (target.role === 'revenant') throw new Error('Cannot absorb Revenant role')

    const existingActions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()

    const existing = existingActions.find(
      (a) => a.actorId === args.playerId && a.type === 'absorb'
    )

    if (existing) {
      await ctx.db.patch(existing._id, { targetId: args.targetId })

      const updatedActions = await ctx.db
        .query('actions')
        .withIndex('by_game_turn', (q) =>
          q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
        )
        .collect()
      await checkAndTriggerEarlyNightEnd(ctx, args.gameId, game, updatedActions)

      return existing._id
    }

    const actionId = await ctx.db.insert('actions', {
      gameId: args.gameId,
      turnNumber: game.turnNumber,
      phase: game.phase,
      type: 'absorb',
      actorId: args.playerId,
      targetId: args.targetId,
    })

    const updatedActions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()
    await checkAndTriggerEarlyNightEnd(ctx, args.gameId, game, updatedActions)

    return actionId
  },
})

// Query Revenant status (has absorbed, what role)
export const getRevenantStatus = query({
  args: { gameId: v.id('games'), playerId: v.id('players') },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId)
    if (!player) return null
    return {
      isRevenant: player.role === 'revenant',
      hasAbsorbed: !!player.revenantAbsorbedRole,
      absorbedRole: player.revenantAbsorbedRole || null,
    }
  },
})

// Query dead players for Revenant's graveyard selection
export const getDeadPlayers = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query('players')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect()

    return players
      .filter((p) => !p.isAlive && p.role !== 'revenant')
      .map((p) => ({
        _id: p._id,
        name: p.name,
        role: p.role,
      }))
  },
})

// ======= WITCH ACTIONS =======

// Witch heal potion - save wolf target
export const useHealPotion = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    targetId: v.id('players'),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'active') throw new Error('Game not active')
    if (game.phase !== 'night') throw new Error('Can only heal at night')

    const witch = await ctx.db.get(args.playerId)
    if (!witch || !witch.isAlive) throw new Error('Player is not alive')
    if (witch.role !== 'witch') throw new Error('Only Witch can heal')
    if (witch.roleData?.healPotionUsed) throw new Error('Heal potion already used')

    const target = await ctx.db.get(args.targetId)
    if (!target || !target.isAlive) throw new Error('Target is not alive')

    // Check if Witch already used poison this night
    const existingActions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()

    const usedPoisonThisNight = existingActions.some(
      (a) => a.actorId === args.playerId && a.type === 'poison'
    )
    if (usedPoisonThisNight) throw new Error('Cannot use both potions in the same night')

    // Check if heal action already exists (changing target)
    const existing = existingActions.find(
      (a) => a.actorId === args.playerId && a.type === 'heal'
    )

    if (existing) {
      await ctx.db.patch(existing._id, { targetId: args.targetId })
      return existing._id
    }

    // Insert heal action
    const actionId = await ctx.db.insert('actions', {
      gameId: args.gameId,
      turnNumber: game.turnNumber,
      phase: game.phase,
      type: 'heal',
      actorId: args.playerId,
      targetId: args.targetId,
    })

    // Check for early night end
    const updatedActions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()
    await checkAndTriggerEarlyNightEnd(ctx, args.gameId, game, updatedActions)

    return actionId
  },
})

// Witch poison potion - kill any player
export const usePoisonPotion = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    targetId: v.id('players'),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'active') throw new Error('Game not active')
    if (game.phase !== 'night') throw new Error('Can only poison at night')

    const witch = await ctx.db.get(args.playerId)
    if (!witch || !witch.isAlive) throw new Error('Player is not alive')
    if (witch.role !== 'witch') throw new Error('Only Witch can poison')
    if (witch.roleData?.poisonPotionUsed) throw new Error('Poison potion already used')

    const target = await ctx.db.get(args.targetId)
    if (!target || !target.isAlive) throw new Error('Target is not alive')
    if (args.targetId === args.playerId) throw new Error('Cannot poison yourself')

    // Check if Witch already used heal this night
    const existingActions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()

    const usedHealThisNight = existingActions.some(
      (a) => a.actorId === args.playerId && a.type === 'heal'
    )
    if (usedHealThisNight) throw new Error('Cannot use both potions in the same night')

    // Check if poison action already exists (changing target)
    const existing = existingActions.find(
      (a) => a.actorId === args.playerId && a.type === 'poison'
    )

    if (existing) {
      await ctx.db.patch(existing._id, { targetId: args.targetId })
      return existing._id
    }

    // Insert poison action
    const actionId = await ctx.db.insert('actions', {
      gameId: args.gameId,
      turnNumber: game.turnNumber,
      phase: game.phase,
      type: 'poison',
      actorId: args.playerId,
      targetId: args.targetId,
    })

    // Check for early night end
    const updatedActions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()
    await checkAndTriggerEarlyNightEnd(ctx, args.gameId, game, updatedActions)

    return actionId
  },
})

// Query to get current wolf target (for Witch to see in real-time)
export const getWolfTarget = query({
  args: { gameId: v.id('games'), turnNumber: v.number() },
  handler: async (ctx, args) => {
    const actions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', args.turnNumber)
      )
      .collect()

    const killVotes = actions.filter((a) => a.type === 'kill')
    if (killVotes.length === 0) return null

    // Calculate majority target
    const voteCounts = new Map<string, number>()
    for (const vote of killVotes) {
      const targetKey = vote.targetId.toString()
      voteCounts.set(targetKey, (voteCounts.get(targetKey) || 0) + 1)
    }

    let maxVotes = 0
    let targetIdStr: string | null = null
    let tiedCount = 0

    for (const [id, count] of voteCounts.entries()) {
      if (count > maxVotes) {
        maxVotes = count
        targetIdStr = id
        tiedCount = 1
      } else if (count === maxVotes) {
        tiedCount++
      }
    }

    // If there's a tie (multiple targets with same max votes), indicate uncertainty
    if (tiedCount > 1) {
      return {
        targetId: null as any,
        targetName: '',
        voteCount: maxVotes,
        totalWolves: killVotes.length,
        isTie: true,
        tiedTargetCount: tiedCount,
      }
    }

    if (!targetIdStr) return null

    // Fetch the player using the ID
    const players = await ctx.db
      .query('players')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect()

    const target = players.find((p) => p._id.toString() === targetIdStr)
    if (!target) return null

    return {
      targetId: target._id,
      targetName: target.name,
      voteCount: maxVotes,
      totalWolves: killVotes.length, // How many wolves have voted
    }
  },
})

