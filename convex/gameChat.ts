import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const sendMessage = mutation({
  args: {
    gameId: v.id('games'),
    playerId: v.id('players'),
    content: v.string(),
    channel: v.union(v.literal('global'), v.literal('wolves')),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'active') throw new Error('Game not active')

    const player = await ctx.db.get(args.playerId)
    if (!player) throw new Error('Player not found')

    if (!player.isAlive) throw new Error('Dead players cannot send messages')

    if (args.channel === 'global') {
      if (game.phase === 'night') throw new Error('Cannot chat during night')
      // Shadow Wolf mute: muted players cannot send global messages during the day
      if ((game.phase === 'day' || game.phase === 'voting') && player.isMuted) {
        throw new Error('You have been silenced and cannot speak during the day')
      }
    } else if (args.channel === 'wolves') {
      if (game.phase !== 'night') throw new Error('Wolf chat only during night')
      if (player.role !== 'wolf' && player.role !== 'kittenWolf' && player.role !== 'shadowWolf') throw new Error('Only wolves can use wolf chat')
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

    const isWolfTeam = player.role === 'wolf' || player.role === 'kittenWolf' || player.role === 'shadowWolf'

    return allMessages.filter((msg) => {
      if (msg.channel === 'global') return true
      if (msg.channel === 'wolves' && isWolfTeam) return true
      return false
    })
  },
})
