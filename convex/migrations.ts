import { mutation } from './_generated/server'

export const cleanupDeadChannelMessages = mutation({
  handler: async (ctx) => {
    const deadMessages = await ctx.db
      .query('chat')
      .filter((q) => q.eq(q.field('channel'), 'dead'))
      .collect()

    for (const message of deadMessages) {
      await ctx.db.delete(message._id)
    }

    return { deleted: deadMessages.length }
  },
})
