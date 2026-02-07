import { v } from 'convex/values'
import { mutation, internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'

type GameRole = 'wolf' | 'seer' | 'doctor' | 'gunner' | 'detective' | 'villager'
type Team = 'good' | 'bad'

interface RoleDist {
  wolves: number
  seer: number
  doctor: number
  gunner: number
  detective: number
  villagers: number
}

const ROLE_DISTRIBUTION: Record<number, RoleDist> = {
  5: { wolves: 1, seer: 1, doctor: 1, gunner: 0, detective: 0, villagers: 2 },
  6: { wolves: 1, seer: 1, doctor: 1, gunner: 1, detective: 0, villagers: 2 },
  7: { wolves: 2, seer: 1, doctor: 1, gunner: 1, detective: 0, villagers: 2 },
  8: { wolves: 2, seer: 1, doctor: 1, gunner: 1, detective: 1, villagers: 2 },
}

const NIGHT_DURATION = 30_000
const DAY_DURATION = 60_000
const VOTING_DURATION = 15_000
const MAX_ROUNDS = 10

function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildRoleList(dist: RoleDist, expectedCount: number): Array<{ role: GameRole; team: Team }> {
  const roles: Array<{ role: GameRole; team: Team }> = []

  for (let i = 0; i < dist.wolves; i++) {
    roles.push({ role: 'wolf', team: 'bad' })
  }
  for (let i = 0; i < dist.seer; i++) {
    roles.push({ role: 'seer', team: 'good' })
  }
  for (let i = 0; i < dist.doctor; i++) {
    roles.push({ role: 'doctor', team: 'good' })
  }
  for (let i = 0; i < dist.gunner; i++) {
    roles.push({ role: 'gunner', team: 'good' })
  }
  for (let i = 0; i < dist.detective; i++) {
    roles.push({ role: 'detective', team: 'good' })
  }
  for (let i = 0; i < dist.villagers; i++) {
    roles.push({ role: 'villager', team: 'good' })
  }

  if (roles.length !== expectedCount) {
    throw new Error(`Role distribution error: Expected ${expectedCount} roles but got ${roles.length}`)
  }

  return roles
}

function buildRoleData(role: GameRole) {
  if (role === 'gunner') {
    return { bullets: 2, isRevealed: false }
  }
  if (role === 'doctor') {
    return { lastProtectedId: null }
  }
  return undefined
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
    if (!dist) {
      throw new Error(`No role distribution defined for ${players.length} players`)
    }

    const roles = buildRoleList(dist, players.length)
    const shuffledRoles = shuffle(roles)

    if (shuffledRoles.length !== players.length) {
      throw new Error(`Role count mismatch: ${shuffledRoles.length} roles for ${players.length} players`)
    }

    console.log(`[Game ${args.gameId}] Starting with ${players.length} players`)
    console.log(`[Game ${args.gameId}] Role distribution:`, dist)
    console.log(`[Game ${args.gameId}] Assigning roles:`, shuffledRoles.map(r => r.role).join(', '))

    for (let i = 0; i < players.length; i++) {
      const roleInfo = shuffledRoles[i]
      if (!roleInfo) {
        throw new Error(`Missing role for player ${i}`)
      }

      const patch: Record<string, unknown> = {
        role: roleInfo.role,
        team: roleInfo.team,
        isAlive: true,
      }

      const roleData = buildRoleData(roleInfo.role)
      if (roleData !== undefined) {
        patch.roleData = roleData
      }

      await ctx.db.patch(players[i]._id, patch)
      console.log(`[Game ${args.gameId}] Assigned ${roleInfo.role} (${roleInfo.team}) to player ${players[i].name}`)
    }

    const assignedPlayers = await ctx.db
      .query('players')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect()

    const roleCount: Record<string, number> = {}
    assignedPlayers.forEach((p) => {
      if (p.role) {
        roleCount[p.role] = (roleCount[p.role] || 0) + 1
      }
    })
    console.log(`[Game ${args.gameId}] Final role count:`, roleCount)

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

      if (game.turnNumber >= MAX_ROUNDS) {
        const alivePlayers = (
          await ctx.db
            .query('players')
            .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
            .collect()
        ).filter((p: any) => p.isAlive)

        const wolves = alivePlayers.filter((p: any) => p.team === 'bad')
        const villagers = alivePlayers.filter((p: any) => p.team === 'good')

        const finalWinner = wolves.length >= villagers.length ? 'bad' : 'good'

        await ctx.db.insert('chat', {
          gameId: args.gameId,
          senderId: players[0]._id,
          senderName: 'System',
          content: `Round ${MAX_ROUNDS} reached! The game ends.`,
          channel: 'global',
          timestamp: Date.now(),
        })

        await ctx.db.patch(args.gameId, { status: 'ended', winningTeam: finalWinner })
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

  const doctor = players.find((p: any) => p.role === 'doctor' && p.isAlive)
  if (doctor && saveActions.length > 0) {
    const doctorAction = saveActions.find((a: any) => a.actorId === doctor._id)
    if (doctorAction) {
      await ctx.db.patch(doctor._id, {
        roleData: {
          ...doctor.roleData,
          lastProtectedId: doctorAction.targetId,
        },
      })
    }
  }

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

      await ctx.db.insert('chat', {
        gameId,
        senderId: players[0]._id,
        senderName: 'System',
        content: 'Someone was attacked but survived the night!',
        channel: 'global',
        timestamp: Date.now(),
      })
      return
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

export function checkWinCondition(players: any[]): string | null {
  const alive = players.filter((p: any) => p.isAlive)
  const wolves = alive.filter((p: any) => p.team === 'bad')
  const villagers = alive.filter((p: any) => p.team === 'good')

  if (wolves.length === 0) return 'good'
  if (wolves.length >= villagers.length) return 'bad'
  return null
}
