import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const submitAction = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    targetId: v.id('players'),
    type: v.union(v.literal('vote'), v.literal('kill'), v.literal('save'), v.literal('scan')),
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
      if (actor.role !== 'wolf') throw new Error('Only wolves can kill')
      if (target.team === 'bad') throw new Error('Cannot kill fellow wolf')
    } else if (args.type === 'save') {
      if (game.phase !== 'night') throw new Error('Can only save at night')
      if (actor.role !== 'doctor') throw new Error('Only doctor can save')
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
      return duplicate._id
    }

    return await ctx.db.insert('actions', {
      gameId: args.gameId,
      turnNumber: game.turnNumber,
      phase: game.phase,
      type: args.type,
      actorId: args.playerId,
      targetId: args.targetId,
    })
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
