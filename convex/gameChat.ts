import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const sendMessage = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    content: v.string(),
    channel: v.union(v.literal('global'), v.literal('wolves'), v.literal('dead')),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'active') throw new Error('Game not active')

    const player = await ctx.db.get(args.playerId)
    if (!player) throw new Error('Player not found')

    if (args.channel === 'global') {
      if (!player.isAlive) throw new Error('Dead players cannot use global chat')
      if (game.phase === 'night') throw new Error('Cannot chat during night')
    } else if (args.channel === 'wolves') {
      if (game.phase !== 'night') throw new Error('Wolf chat only during night')
      if (player.role !== 'wolf') throw new Error('Only wolves can use wolf chat')
    } else if (args.channel === 'dead') {
      if (player.isAlive) throw new Error('Only dead players can use dead chat')
    }

    return await ctx.db.insert('chat', {
      gameId: args.gameId,
      senderId: args.playerId,
      senderName: player.name,
      content: args.content,
      channel: args.channel,
      timestamp: Date.now(),
    })
  },
})

export const getMessages = query({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId)
    if (!player) return []

    const allMessages = await ctx.db
      .query('chat')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect()

    return allMessages.filter((msg) => {
      if (msg.channel === 'global') return true
      if (msg.channel === 'wolves' && player.role === 'wolf') return true
      if (msg.channel === 'dead' && !player.isAlive) return true
      return false
    })
  },
})
