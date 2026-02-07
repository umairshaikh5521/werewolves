import { v } from 'convex/values'
import { mutation, internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'

const ROLE_DISTRIBUTION: Record<number, { wolves: number; seer: number; doctor: number; villagers: number }> = {
  5: { wolves: 1, seer: 1, doctor: 0, villagers: 3 },
  6: { wolves: 1, seer: 1, doctor: 1, villagers: 3 },
  7: { wolves: 2, seer: 1, doctor: 1, villagers: 3 },
  8: { wolves: 2, seer: 1, doctor: 1, villagers: 4 },
}

const NIGHT_DURATION = 30_000
const DAY_DURATION = 60_000
const VOTING_DURATION = 15_000

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export const startGame = mutation({
  args: { gameId: v.id('games'), userId: v.string() },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game) throw new Error('Game not found')
    if (game.status !== 'lobby') throw new Error('Game already started')
    if (game.hostId !== args.userId) throw new Error('Only host can start')

    const players = await ctx.db
      .query('players')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect()

    if (players.length < 5 || players.length > 8) {
      throw new Error('Need 5-8 players')
    }

    const dist = ROLE_DISTRIBUTION[players.length]
    const roles: Array<{ role: 'wolf' | 'seer' | 'doctor' | 'villager'; team: 'good' | 'bad' }> = []

    for (let i = 0; i < dist.wolves; i++) roles.push({ role: 'wolf', team: 'bad' })
    for (let i = 0; i < dist.seer; i++) roles.push({ role: 'seer', team: 'good' })
    for (let i = 0; i < dist.doctor; i++) roles.push({ role: 'doctor', team: 'good' })
    for (let i = 0; i < dist.villagers; i++) roles.push({ role: 'villager', team: 'good' })

    const shuffledRoles = shuffle(roles)

    for (let i = 0; i < players.length; i++) {
      await ctx.db.patch(players[i]._id, {
        role: shuffledRoles[i].role,
        team: shuffledRoles[i].team,
      })
    }

    const phaseEndTime = Date.now() + NIGHT_DURATION

    await ctx.db.patch(args.gameId, {
      status: 'active',
      phase: 'night',
      turnNumber: 1,
      phaseEndTime,
    })

    await ctx.scheduler.runAfter(NIGHT_DURATION, internal.gameEngine.transitionPhase, {
      gameId: args.gameId,
      expectedTurn: 1,
      expectedPhase: 'night',
    })
  },
})

export const transitionPhase = internalMutation({
  args: {
    gameId: v.id('games'),
    expectedTurn: v.number(),
    expectedPhase: v.string(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game || game.status !== 'active') return
    if (game.turnNumber !== args.expectedTurn || game.phase !== args.expectedPhase) return

    const players = await ctx.db
      .query('players')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect()

    const actions = await ctx.db
      .query('actions')
      .withIndex('by_game_turn', (q) =>
        q.eq('gameId', args.gameId).eq('turnNumber', game.turnNumber)
      )
      .collect()

    if (game.phase === 'night') {
      await resolveNight(ctx, args.gameId, players, actions)

      const winner = checkWinCondition(
        await ctx.db
          .query('players')
          .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
          .collect()
      )

      if (winner) {
        await ctx.db.patch(args.gameId, { status: 'ended', winningTeam: winner })
        return
      }

      const phaseEndTime = Date.now() + DAY_DURATION
      await ctx.db.patch(args.gameId, { phase: 'day', phaseEndTime })
      await ctx.scheduler.runAfter(DAY_DURATION, internal.gameEngine.transitionPhase, {
        gameId: args.gameId,
        expectedTurn: game.turnNumber,
        expectedPhase: 'day',
      })
    } else if (game.phase === 'day') {
      const phaseEndTime = Date.now() + VOTING_DURATION
      await ctx.db.patch(args.gameId, { phase: 'voting', phaseEndTime })
      await ctx.scheduler.runAfter(VOTING_DURATION, internal.gameEngine.transitionPhase, {
        gameId: args.gameId,
        expectedTurn: game.turnNumber,
        expectedPhase: 'voting',
      })
    } else if (game.phase === 'voting') {
      await resolveVoting(ctx, args.gameId, players, actions)

      const winner = checkWinCondition(
        await ctx.db
          .query('players')
          .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
          .collect()
      )

      if (winner) {
        await ctx.db.patch(args.gameId, { status: 'ended', winningTeam: winner })
        return
      }

      const nextTurn = game.turnNumber + 1
      const phaseEndTime = Date.now() + NIGHT_DURATION
      await ctx.db.patch(args.gameId, {
        phase: 'night',
        turnNumber: nextTurn,
        phaseEndTime,
      })
      await ctx.scheduler.runAfter(NIGHT_DURATION, internal.gameEngine.transitionPhase, {
        gameId: args.gameId,
        expectedTurn: nextTurn,
        expectedPhase: 'night',
      })
    }
  },
})

async function resolveNight(
  ctx: { db: any },
  gameId: Id<'games'>,
  players: any[],
  actions: any[]
) {
  const killVotes = actions.filter((a: any) => a.type === 'kill')
  const saveActions = actions.filter((a: any) => a.type === 'save')

  if (killVotes.length > 0) {
    const voteCounts: Record<string, number> = {}
    for (const vote of killVotes) {
      const targetKey = vote.targetId as string
      voteCounts[targetKey] = (voteCounts[targetKey] || 0) + 1
    }

    let maxVotes = 0
    let targetId: string | null = null
    for (const [id, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count
        targetId = id
      }
    }

    if (targetId) {
      const wasSaved = saveActions.some((a: any) => (a.targetId as string) === targetId)
      if (!wasSaved) {
        await ctx.db.patch(targetId as Id<'players'>, { isAlive: false })

        await ctx.db.insert('chat', {
          gameId,
          senderId: players[0]._id,
          senderName: 'System',
          content: `${players.find((p: any) => p._id === targetId)?.name || 'Someone'} was killed during the night.`,
          channel: 'global',
          timestamp: Date.now(),
        })
        return
      }
    }
  }

  await ctx.db.insert('chat', {
    gameId,
    senderId: players[0]._id,
    senderName: 'System',
    content: 'The village wakes up... No one died last night!',
    channel: 'global',
    timestamp: Date.now(),
  })
}

async function resolveVoting(
  ctx: { db: any },
  gameId: Id<'games'>,
  players: any[],
  actions: any[]
) {
  const votes = actions.filter((a: any) => a.type === 'vote' && a.phase === 'voting')

  if (votes.length === 0) {
    await ctx.db.insert('chat', {
      gameId,
      senderId: players[0]._id,
      senderName: 'System',
      content: 'No votes were cast. No one was eliminated.',
      channel: 'global',
      timestamp: Date.now(),
    })
    return
  }

  const voteCounts: Record<string, number> = {}
  for (const vote of votes) {
    const targetKey = vote.targetId as string
    voteCounts[targetKey] = (voteCounts[targetKey] || 0) + 1
  }

  let maxVotes = 0
  let targetId: string | null = null
  for (const [id, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count
      targetId = id
    }
  }

  const alivePlayers = players.filter((p: any) => p.isAlive)
  const majority = Math.floor(alivePlayers.length / 2) + 1

  if (targetId && maxVotes >= majority) {
    await ctx.db.patch(targetId as Id<'players'>, { isAlive: false })
    const eliminated = players.find((p: any) => p._id === targetId)
    await ctx.db.insert('chat', {
      gameId,
      senderId: players[0]._id,
      senderName: 'System',
      content: `The village has spoken! ${eliminated?.name || 'Someone'} has been eliminated.`,
      channel: 'global',
      timestamp: Date.now(),
    })
  } else {
    await ctx.db.insert('chat', {
      gameId,
      senderId: players[0]._id,
      senderName: 'System',
      content: 'No majority was reached. No one was eliminated.',
      channel: 'global',
      timestamp: Date.now(),
    })
  }
}

function checkWinCondition(players: any[]): string | null {
  const alive = players.filter((p: any) => p.isAlive)
  const wolves = alive.filter((p: any) => p.team === 'bad')
  const villagers = alive.filter((p: any) => p.team === 'good')

  if (wolves.length === 0) return 'good'
  if (wolves.length >= villagers.length) return 'bad'
  return null
}
