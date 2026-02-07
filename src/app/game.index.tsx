import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { getGuestId, getGuestName, hasGuestName } from '@/lib/guest-identity'
import { NamePromptDialog } from '@/components/game/NamePromptDialog'
import { Input } from '@/components/ui/input'
import { Pencil, BookOpen } from 'lucide-react'

export const Route = createFileRoute('/game/')({ component: GameHome })

function GameHome() {
  const navigate = useNavigate()
  const createGame = useMutation(api.games.createGame)
  const joinGame = useMutation(api.games.joinGame)

  const [needsName, setNeedsName] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  const [pendingAction, setPendingAction] = useState<'create' | 'join' | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!hasGuestName()) {
        setNeedsName(true)
      } else {
        setDisplayName(getGuestName())
      }
    }
  }, [])

  const handleNameComplete = (name: string) => {
    setDisplayName(name)
    setNeedsName(false)
    if (pendingAction === 'create') {
      doCreateGame(name)
    } else if (pendingAction === 'join') {
      doJoinGame(name)
    }
    setPendingAction(null)
  }

  const doCreateGame = async (name?: string) => {
    const playerName = name || getGuestName()
    if (!playerName) {
      setPendingAction('create')
      setNeedsName(true)
      return
    }

    setIsCreating(true)
    setError('')
    try {
      const result = await createGame({
        hostUserId: getGuestId(),
        hostName: playerName,
      })
      navigate({ to: '/game/lobby/$roomCode', params: { roomCode: result.roomCode } })
    } catch (e: any) {
      setError(e.message || 'Failed to create game')
    } finally {
      setIsCreating(false)
    }
  }

  const doJoinGame = async (name?: string) => {
    const playerName = name || getGuestName()
    const code = joinCode.trim().toUpperCase()
    if (!code) {
      setError('Enter a room code')
      return
    }
    if (!playerName) {
      setPendingAction('join')
      setNeedsName(true)
      return
    }

    setIsJoining(true)
    setError('')
    try {
      await joinGame({
        roomCode: code,
        userId: getGuestId(),
        name: playerName,
      })
      navigate({ to: '/game/lobby/$roomCode', params: { roomCode: code } })
    } catch (e: any) {
      setError(e.message || 'Failed to join game')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="stars-bg flex min-h-[100dvh] flex-col items-center justify-center px-5 py-8">
      <NamePromptDialog open={needsName} onComplete={handleNameComplete} />

      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <div className="animate-float flex flex-col items-center gap-3">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/15 shadow-[0_0_40px_rgba(245,166,35,0.15)]">
            <span className="text-5xl">🌕</span>
          </div>
          <h1 className="font-display text-5xl font-bold tracking-tight text-foreground">
            MOONRISE
          </h1>
          <p className="font-body text-sm text-muted-foreground">
            Social Deduction. Trust No One.
          </p>
        </div>

        {displayName && (
          <button
            onClick={() => setNeedsName(true)}
            className="animate-slide-up flex items-center gap-2 rounded-full bg-secondary px-4 py-2 transition-all hover:bg-secondary/80"
          >
            <span className="text-sm text-muted-foreground">Playing as</span>
            <span className="font-display text-sm font-semibold text-foreground">
              {displayName}
            </span>
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        )}

        <div className="flex w-full flex-col gap-3" style={{ animationDelay: '0.1s' }}>
          <button
            onClick={() => doCreateGame()}
            disabled={isCreating}
            className="game-btn w-full bg-primary py-4 text-lg text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {isCreating ? 'Creating...' : 'Create Game'}
          </button>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex gap-2">
            <Input
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase().slice(0, 4))
                setError('')
              }}
              placeholder="CODE"
              maxLength={4}
              className="h-13 flex-1 rounded-xl border-2 border-border bg-secondary text-center font-display text-xl font-bold tracking-[0.3em] text-foreground placeholder:text-muted-foreground placeholder:tracking-[0.3em] focus:border-primary"
            />
            <button
              onClick={() => doJoinGame()}
              disabled={isJoining || joinCode.length < 4}
              className="game-btn h-13 bg-secondary px-6 text-sm text-secondary-foreground hover:bg-secondary/80 disabled:opacity-40"
            >
              {isJoining ? '...' : 'Join'}
            </button>
          </div>
        </div>

        {error && (
          <div className="animate-slide-up rounded-xl bg-destructive/15 px-4 py-2 text-center text-sm font-semibold text-destructive">
            {error}
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground/60">
          5-8 players needed to start a game
        </p>

        <button
          onClick={() => navigate({ to: '/game/guide' })}
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <BookOpen className="h-4 w-4" />
          <span className="font-display font-semibold">Game Guide</span>
        </button>
      </div>
    </div>
  )
}
