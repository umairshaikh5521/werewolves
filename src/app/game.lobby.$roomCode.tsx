import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { getGuestId, getGuestName, hasGuestName } from '@/lib/guest-identity'
import { NamePromptDialog } from '@/components/game/NamePromptDialog'
import { RoomCodeDisplay } from '@/components/game/RoomCodeDisplay'
import { PlayerAvatar } from '@/components/game/PlayerAvatar'
import { ArrowLeft, Users, X } from 'lucide-react'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/game/lobby/$roomCode')({
  component: LobbyScreen,
})

function LobbyScreen() {
  const { roomCode } = Route.useParams()
  const navigate = useNavigate()
  const startGameMutation = useMutation(api.gameEngine.startGame)
  const leaveGameMutation = useMutation(api.games.leaveGame)
  const joinGameMutation = useMutation(api.games.joinGame)
  const kickPlayerMutation = useMutation(api.games.kickPlayer)

  const game = useQuery(api.games.getGameByCode, { roomCode: roomCode.toUpperCase() })
  const players = useQuery(
    api.games.getPlayers,
    game ? { gameId: game._id } : 'skip'
  )

  const [needsName, setNeedsName] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState('')
  const [hasJoined, setHasJoined] = useState(false)

  const userId = typeof window !== 'undefined' ? getGuestId() : ''
  const isHost = game?.hostId === userId
  const playerCount = players?.length || 0
  const canStart = playerCount >= 5 && playerCount <= 12

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!hasGuestName()) {
      setNeedsName(true)
      return
    }
    if (game && !hasJoined) {
      const alreadyIn = players?.some((p) => p.userId === userId)
      if (!alreadyIn && game.status === 'lobby') {
        joinGameMutation({
          roomCode: roomCode.toUpperCase(),
          userId,
          name: getGuestName(),
        })
          .then(() => setHasJoined(true))
          .catch(() => {})
      } else {
        setHasJoined(true)
      }
    }
  }, [game, players, hasJoined, userId, roomCode, joinGameMutation])

  useEffect(() => {
    if (game?.status === 'active') {
      navigate({ to: '/game/play/$roomCode', params: { roomCode } })
    }
  }, [game?.status, navigate, roomCode])

  const handleNameComplete = (name: string) => {
    setNeedsName(false)
    if (game) {
      joinGameMutation({
        roomCode: roomCode.toUpperCase(),
        userId: getGuestId(),
        name,
      })
        .then(() => setHasJoined(true))
        .catch(() => {})
    }
  }

  const handleStart = async () => {
    if (!game) return
    setIsStarting(true)
    setError('')
    try {
      await startGameMutation({ gameId: game._id, userId })
    } catch (e: any) {
      setError(e.message || 'Failed to start')
    } finally {
      setIsStarting(false)
    }
  }

  const handleLeave = async () => {
    if (!game) return
    await leaveGameMutation({ gameId: game._id, userId })
    navigate({ to: '/game' })
  }

  const handleKick = async (playerId: Id<'players'>) => {
    if (!game) return
    try {
      await kickPlayerMutation({ gameId: game._id, hostUserId: userId, playerId })
    } catch {
    }
  }

  if (game === undefined) {
    return (
      <div className="stars-bg flex min-h-[100dvh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Finding game...</p>
      </div>
    )
  }

  if (game === null) {
    return (
      <div className="stars-bg flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
          <span className="text-3xl">?</span>
        </div>
        <p className="font-display text-lg font-semibold text-foreground">Room Not Found</p>
        <p className="text-center text-sm text-muted-foreground">
          The room code "{roomCode.toUpperCase()}" doesn't exist or has expired.
        </p>
        <button
          onClick={() => navigate({ to: '/game' })}
          className="game-btn bg-primary px-8 py-3 text-sm text-primary-foreground"
        >
          Go Home
        </button>
      </div>
    )
  }

  if (game.status === 'ended') {
    return (
      <div className="stars-bg flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <span className="text-3xl">🏁</span>
        </div>
        <p className="font-display text-lg font-semibold text-foreground">Game Ended</p>
        <p className="text-center text-sm text-muted-foreground">
          This game has already finished.
        </p>
        <button
          onClick={() => navigate({ to: '/game' })}
          className="game-btn bg-primary px-8 py-3 text-sm text-primary-foreground"
        >
          Go Home
        </button>
      </div>
    )
  }

  const emptySlots = Math.max(0, 12 - playerCount)

  return (
    <div className="stars-bg flex min-h-[100dvh] flex-col px-5 py-6">
      <NamePromptDialog open={needsName} onComplete={handleNameComplete} />

      <div className="flex items-center justify-between">
        <button
          onClick={handleLeave}
          className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground transition-all hover:bg-secondary/80"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Leave
        </button>
        <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">{playerCount}/12</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-6">
        <RoomCodeDisplay code={roomCode.toUpperCase()} />

        <div className="w-full max-w-sm">
          <div className="grid grid-cols-4 gap-3">
            {players?.map((player, i) => (
              <div key={player._id} className="animate-slide-up relative" style={{ animationDelay: `${i * 0.05}s` }}>
                <PlayerAvatar
                  name={player.name}
                  isAlive
                  isHost={player.isHost}
                  isCurrentPlayer={player.userId === userId}
                  size="md"
                />
                {isHost && !player.isHost && (
                  <button
                    onClick={() => handleKick(player._id)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-transform hover:scale-110"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex h-24 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-border/50"
              >
                <span className="animate-pulse text-xs text-muted-foreground/50">
                  ...
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6">
        {error && (
          <div className="mb-3 animate-slide-up rounded-xl bg-destructive/15 px-4 py-2 text-center text-sm font-semibold text-destructive">
            {error}
          </div>
        )}

        {isHost ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleStart}
              disabled={!canStart || isStarting}
              className="game-btn w-full max-w-sm bg-primary py-4 text-lg text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              {isStarting ? 'Starting...' : 'Start Game'}
            </button>
            {!canStart && (
              <p className="text-xs text-muted-foreground">
                Need at least 5 players ({5 - playerCount} more)
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <p className="font-body text-sm text-muted-foreground">
                Waiting for host to start...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
