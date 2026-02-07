import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export const createGame = mutation({
  args: {
    hostUserId: v.string(),
    hostName: v.string(),
  },
  handler: async (ctx, args) => {
    let roomCode = generateRoomCode()
    let existing = await ctx.db
      .query('games')
      .withIndex('by_code', (q) => q.eq('roomCode', roomCode))
      .first()

    while (existing && existing.status !== 'ended') {
      roomCode = generateRoomCode()
      existing = await ctx.db
        .query('games')
        .withIndex('by_code', (q) => q.eq('roomCode', roomCode))
        .first()
    }

    const gameId = await ctx.db.insert('games', {
      roomCode,
      status: 'lobby',
      hostId: args.hostUserId,
      turnNumber: 0,
      phase: 'night',
      phaseEndTime: 0,
    })

    await ctx.db.insert('players', {
      gameId,
      userId: args.hostUserId,
      name: args.hostName,
      isAlive: true,
      isHost: true,
    })

    return { gameId, roomCode }
  },
})

export const joinGame = mutation({
  args: {
    roomCode: v.string(),
    userId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db
      .query('games')
      .withIndex('by_code', (q) => q.eq('roomCode', args.roomCode.toUpperCase()))
      .first()

    if (!game) {
      throw new Error('Game not found')
    }
    if (game.status !== 'lobby') {
      throw new Error('Game already started')
    }

    const existingPlayer = await ctx.db
      .query('players')
      .withIndex('by_game_user', (q) =>
        q.eq('gameId', game._id).eq('userId', args.userId)
      )
      .first()

    if (existingPlayer) {
      return { gameId: game._id, playerId: existingPlayer._id }
    }

    const players = await ctx.db
      .query('players')
      .withIndex('by_game', (q) => q.eq('gameId', game._id))
      .collect()

    if (players.length >= 8) {
      throw new Error('Game is full')
    }

    const playerId = await ctx.db.insert('players', {
      gameId: game._id,
      userId: args.userId,
      name: args.name,
      isAlive: true,
      isHost: false,
    })

    return { gameId: game._id, playerId }
  },
})

export const getGameByCode = query({
  args: { roomCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('games')
      .withIndex('by_code', (q) => q.eq('roomCode', args.roomCode.toUpperCase()))
      .first()
  },
})

export const getGame = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.gameId)
  },
})

export const getPlayers = query({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('players')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect()
  },
})

export const getMyPlayer = query({
  args: { gameId: v.id('games'), userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('players')
      .withIndex('by_game_user', (q) =>
        q.eq('gameId', args.gameId).eq('userId', args.userId)
      )
      .first()
  },
})

export const leaveGame = mutation({
  args: { gameId: v.id('games'), userId: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'lobby') return

    const player = await ctx.db
      .query('players')
      .withIndex('by_game_user', (q) =>
        q.eq('gameId', args.gameId).eq('userId', args.userId)
      )
      .first()

    if (!player) return

    await ctx.db.delete(player._id)

    if (player.isHost) {
      const remainingPlayers = await ctx.db
        .query('players')
        .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
        .collect()

      if (remainingPlayers.length === 0) {
        await ctx.db.patch(args.gameId, { status: 'ended' })
      } else {
        await ctx.db.patch(remainingPlayers[0]._id, { isHost: true })
        await ctx.db.patch(args.gameId, { hostId: remainingPlayers[0].userId })
      }
    }
  },
})
