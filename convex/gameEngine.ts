import { v } from 'convex/values'
import { mutation, internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'

type GameRole = 'wolf' | 'kittenWolf' | 'seer' | 'doctor' | 'gunner' | 'detective' | 'villager'
type Team = 'good' | 'bad'

interface RoleDist {
  wolves: number
  kittenWolf: number
  seer: number
  doctor: number
  gunner: number
  detective: number
  villagers: number
}

const ROLE_DISTRIBUTION: Record<number, RoleDist> = {
  5: { wolves: 1, kittenWolf: 0, seer: 1, doctor: 1, gunner: 0, detective: 0, villagers: 2 },
  6: { wolves: 1, kittenWolf: 0, seer: 1, doctor: 1, gunner: 1, detective: 0, villagers: 2 },
  7: { wolves: 2, kittenWolf: 0, seer: 1, doctor: 1, gunner: 1, detective: 0, villagers: 2 },
  8: { wolves: 2, kittenWolf: 0, seer: 1, doctor: 1, gunner: 1, detective: 1, villagers: 2 },
  9: { wolves: 1, kittenWolf: 1, seer: 1, doctor: 1, gunner: 1, detective: 1, villagers: 3 },
  10: { wolves: 1, kittenWolf: 1, seer: 1, doctor: 1, gunner: 1, detective: 1, villagers: 4 },
  11: { wolves: 2, kittenWolf: 1, seer: 1, doctor: 1, gunner: 1, detective: 1, villagers: 4 },
  12: { wolves: 2, kittenWolf: 1, seer: 1, doctor: 1, gunner: 1, detective: 1, villagers: 5 },
}

// Dynamic durations based on player count
function getNightDuration(playerCount: number): number {
  return playerCount > 8 ? 50_000 : 40_000 // 50s if >8 players, else 40s
}

function getVotingDuration(playerCount: number): number {
  return playerCount > 8 ? 35_000 : 25_000 // 35s if >8 players, else 25s
}

const DAY_DURATION = 60_000
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
  for (let i = 0; i < dist.kittenWolf; i++) {
    roles.push({ role: 'kittenWolf', team: 'bad' })
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
    return {}
  }
  if (role === 'kittenWolf') {
    return { hasBitten: false }
  }
  return undefined
}

const COUNTDOWN_DURATION = 6_000 // 6 seconds

export const triggerCountdown = mutation({
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

    if (players.length < 5 || players.length > 12) {
      throw new Error('Need 5-12 players')
    }

    const notReadyPlayers = players.filter((p: any) => !p.isHost && !p.isReady)
    if (notReadyPlayers.length > 0) {
      throw new Error('All players must be ready to start')
    }

    // Set countdown start time
    const countdownAt = Date.now()
    await ctx.db.patch(args.gameId, { startCountdownAt: countdownAt })

    // Schedule actual game start after countdown
    await ctx.scheduler.runAfter(COUNTDOWN_DURATION, internal.gameEngine.executeStartGame, {
      gameId: args.gameId,
    })

    return { countdownAt }
  },
})

export const executeStartGame = internalMutation({
  args: { gameId: v.id('games') },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (!game) throw new Error('Game not found')
    if (game.status !== 'lobby') return // Already started

    // Clear the countdown
    await ctx.db.patch(args.gameId, { startCountdownAt: undefined })

    // Now run the actual start logic
    const players = await ctx.db
      .query('players')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect()

    const dist = ROLE_DISTRIBUTION[players.length]
    if (!dist) {
      throw new Error(`No role distribution defined for ${players.length} players`)
    }

    const roles = buildRoleList(dist, players.length)
    const shuffledRoles = shuffle(roles)

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
    }

    const nightDuration = getNightDuration(players.length)
    const phaseEndTime = Date.now() + nightDuration

    await ctx.db.patch(args.gameId, {
      status: 'active',
      phase: 'night',
      turnNumber: 1,
      phaseEndTime,
    })

    await ctx.scheduler.runAfter(nightDuration, internal.gameEngine.transitionPhase, {
      gameId: args.gameId,
      expectedTurn: 1,
      expectedPhase: 'night',
    })
  },
})

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

    if (players.length < 5 || players.length > 12) {
      throw new Error('Need 5-12 players')
    }

    const notReadyPlayers = players.filter((p: any) => !p.isHost && !p.isReady)
    if (notReadyPlayers.length > 0) {
      throw new Error('All players must be ready to start')
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

    const nightDuration = getNightDuration(players.length)
    const phaseEndTime = Date.now() + nightDuration

    await ctx.db.patch(args.gameId, {
      status: 'active',
      phase: 'night',
      turnNumber: 1,
      phaseEndTime,
    })

    await ctx.scheduler.runAfter(nightDuration, internal.gameEngine.transitionPhase, {
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
      await resolveNight(ctx, args.gameId, players, actions, game)

      const updatedPlayers = await ctx.db
        .query('players')
        .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
        .collect()

      const winner = checkWinCondition(updatedPlayers)

      if (winner) {
        const endReason = winner === 'good'
          ? 'All werewolves have been eliminated'
          : 'The werewolves have overtaken the village'
        await ctx.db.patch(args.gameId, {
          status: 'ended',
          winningTeam: winner,
          endReason
        })
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
      const votingDuration = getVotingDuration(players.length)
      const phaseEndTime = Date.now() + votingDuration
      await ctx.db.patch(args.gameId, { phase: 'voting', phaseEndTime })
      await ctx.scheduler.runAfter(votingDuration, internal.gameEngine.transitionPhase, {
        gameId: args.gameId,
        expectedTurn: game.turnNumber,
        expectedPhase: 'voting',
      })
    } else if (game.phase === 'voting') {
      const eliminatedPlayer = await resolveVoting(ctx, args.gameId, players, actions)

      const updatedPlayers = await ctx.db
        .query('players')
        .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
        .collect()

      const winner = checkWinCondition(updatedPlayers)

      if (winner) {
        const endReason = eliminatedPlayer
          ? winner === 'good'
            ? `${eliminatedPlayer.name} was the last werewolf!`
            : `The werewolves have overtaken the village`
          : winner === 'good'
            ? 'All werewolves have been eliminated'
            : 'The werewolves have overtaken the village'
        await ctx.db.patch(args.gameId, {
          status: 'ended',
          winningTeam: winner,
          endReason
        })
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

        await ctx.db.patch(args.gameId, {
          status: 'ended',
          winningTeam: finalWinner,
          endReason: `Maximum rounds (${MAX_ROUNDS}) reached`
        })
        return
      }

      const nextTurn = game.turnNumber + 1
      const nightDuration = getNightDuration(players.length)
      const phaseEndTime = Date.now() + nightDuration
      await ctx.db.patch(args.gameId, {
        phase: 'night',
        turnNumber: nextTurn,
        phaseEndTime,
      })
      await ctx.scheduler.runAfter(nightDuration, internal.gameEngine.transitionPhase, {
        gameId: args.gameId,
        expectedTurn: nextTurn,
        expectedPhase: 'night',
      })
    }
  },
})

async function resolveNight(
  ctx: { db: any; scheduler: any },
  gameId: Id<'games'>,
  players: any[],
  actions: any[],
  game: any
) {
  const convertAction = actions.find((a: any) => a.type === 'convert')
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

  if (convertAction) {
    const target = players.find((p: any) => p._id === convertAction.targetId)
    if (target && target.isAlive && target.team === 'good') {
      await ctx.db.patch(target._id, {
        role: 'wolf',
        team: 'bad',
        roleData: undefined,
        wasConverted: true,
        convertedAtTurn: game.turnNumber,
      })

      await ctx.db.insert('chat', {
        gameId,
        senderId: players[0]._id,
        senderName: 'System',
        content: 'Strange... the village was quiet last night. No one died.',
        channel: 'global',
        timestamp: Date.now(),
      })

      await ctx.db.insert('chat', {
        gameId,
        senderId: target._id,
        senderName: 'System',
        content: `${target.name} has joined the wolf pack.`,
        channel: 'wolves',
        timestamp: Date.now(),
      })
      return
    }
  }

  if (killVotes.length > 0) {
    const voteCounts: Map<string, number> = new Map()
    for (const vote of killVotes) {
      const targetKey = vote.targetId.toString()
      voteCounts.set(targetKey, (voteCounts.get(targetKey) || 0) + 1)
    }

    let maxVotes = 0
    let targetId: Id<'players'> | null = null
    for (const [id, count] of voteCounts.entries()) {
      if (count > maxVotes) {
        maxVotes = count
        targetId = id as Id<'players'>
      }
    }

    if (targetId) {
      const wasSaved = saveActions.some((a: any) => a.targetId === targetId)
      if (!wasSaved) {
        await ctx.db.patch(targetId, { isAlive: false })

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
): Promise<{ name: string } | null> {
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
    return null
  }

  const voteCounts: Map<string, number> = new Map()
  for (const vote of votes) {
    const targetKey = vote.targetId.toString()
    voteCounts.set(targetKey, (voteCounts.get(targetKey) || 0) + 1)
  }

  let maxVotes = 0
  let targetId: Id<'players'> | null = null
  for (const [id, count] of voteCounts.entries()) {
    if (count > maxVotes) {
      maxVotes = count
      targetId = id as Id<'players'>
    }
  }

  const alivePlayers = players.filter((p: any) => p.isAlive)
  const majority = Math.floor(alivePlayers.length / 2) + 1

  if (targetId && maxVotes >= majority) {
    await ctx.db.patch(targetId, { isAlive: false })
    const eliminated = players.find((p: any) => p._id === targetId)
    await ctx.db.insert('chat', {
      gameId,
      senderId: players[0]._id,
      senderName: 'System',
      content: `The village has spoken! ${eliminated?.name || 'Someone'} has been eliminated.`,
      channel: 'global',
      timestamp: Date.now(),
    })
    return eliminated || null
  } else {
    await ctx.db.insert('chat', {
      gameId,
      senderId: players[0]._id,
      senderName: 'System',
      content: 'No majority was reached. No one was eliminated.',
      channel: 'global',
      timestamp: Date.now(),
    })
    return null
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
