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
      if (actor.role !== 'wolf' && actor.role !== 'kittenWolf') throw new Error('Only wolves can kill')
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

    if (args.type === 'vote' && game.phase === 'voting') {
      await checkAndTriggerEarlyVotingEnd(ctx, args.gameId, game, [...existingAction, {
        _id: actionId,
        gameId: args.gameId,
        turnNumber: game.turnNumber,
        phase: game.phase,
        type: args.type,
        actorId: args.playerId,
        targetId: args.targetId,
      }])
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

    const sameTeam = p1.team === p2.team
    return { sameTeam, target1Name: p1.name, target2Name: p2.name }
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

    return {
      targetId: target._id,
      targetName: target.name,
      team: target.team,
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

    return await ctx.db.insert('actions', {
      gameId: args.gameId,
      turnNumber: game.turnNumber,
      phase: game.phase,
      type: 'convert',
      actorId: args.playerId,
      targetId: args.targetId,
    })
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

    const shootActions = allActions.filter((a) => a.type === 'shoot')
    return { count: shootActions.length }
  },
})

