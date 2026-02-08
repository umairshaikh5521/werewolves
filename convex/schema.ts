import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const roleValidator = v.union(
  v.literal('customer'),
  v.literal('admin'),
  v.literal('owner')
)

export type Role = 'customer' | 'admin' | 'owner'

export const gamePhaseValidator = v.union(
  v.literal('night'),
  v.literal('day'),
  v.literal('voting')
)

export const gameStatusValidator = v.union(
  v.literal('lobby'),
  v.literal('active'),
  v.literal('ended')
)

export const gameRoleValidator = v.union(
  v.literal('wolf'),
  v.literal('kittenWolf'),
  v.literal('seer'),
  v.literal('doctor'),
  v.literal('gunner'),
  v.literal('detective'),
  v.literal('villager')
)

export const teamValidator = v.union(
  v.literal('good'),
  v.literal('bad')
)

export const actionTypeValidator = v.union(
  v.literal('vote'),
  v.literal('kill'),
  v.literal('save'),
  v.literal('scan'),
  v.literal('shoot'),
  v.literal('investigate'),
  v.literal('convert')
)

export const chatChannelValidator = v.union(
  v.literal('global'),
  v.literal('wolves'),
  v.literal('dead')
)

export default defineSchema({
  userRoles: defineTable({
    userId: v.string(),
    role: roleValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_userId', ['userId']),

  games: defineTable({
    roomCode: v.string(),
    status: gameStatusValidator,
    hostId: v.string(),
    turnNumber: v.number(),
    phase: gamePhaseValidator,
    phaseEndTime: v.number(),
    winningTeam: v.optional(v.string()),
    endReason: v.optional(v.string()),
  }).index('by_code', ['roomCode']),

  players: defineTable({
    gameId: v.id('games'),
    userId: v.string(),
    name: v.string(),
    role: v.optional(gameRoleValidator),
    team: v.optional(teamValidator),
    isAlive: v.boolean(),
    isHost: v.boolean(),
    roleData: v.optional(v.object({
      lastProtectedId: v.optional(v.id('players')),
      bullets: v.optional(v.number()),
      isRevealed: v.optional(v.boolean()),
      hasBitten: v.optional(v.boolean()),
    })),
    wasConverted: v.optional(v.boolean()),
    convertedAtTurn: v.optional(v.number()),
    isReady: v.optional(v.boolean()),
  })
    .index('by_game', ['gameId'])
    .index('by_game_user', ['gameId', 'userId']),

  actions: defineTable({
    gameId: v.id('games'),
    turnNumber: v.number(),
    phase: v.string(),
    type: actionTypeValidator,
    actorId: v.id('players'),
    targetId: v.id('players'),
    targetId2: v.optional(v.id('players')),
  }).index('by_game_turn', ['gameId', 'turnNumber']),

  chat: defineTable({
    gameId: v.id('games'),
    senderId: v.id('players'),
    senderName: v.string(),
    content: v.string(),
    channel: chatChannelValidator,
    timestamp: v.number(),
  }).index('by_game', ['gameId']),
})
