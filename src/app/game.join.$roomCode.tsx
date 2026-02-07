import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { getGuestId, getGuestName, hasGuestName } from '@/lib/guest-identity'
import { NamePromptDialog } from '@/components/game/NamePromptDialog'

export const Route = createFileRoute('/game/join/$roomCode')({
  component: JoinScreen,
})

function JoinScreen() {
  const { roomCode } = Route.useParams()
  const navigate = useNavigate()
  const joinGame = useMutation(api.games.joinGame)

  const [needsName, setNeedsName] = useState(false)
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)

  const doJoin = async (name: string) => {
    setJoining(true)
    setError('')
    try {
      await joinGame({
        roomCode: roomCode.toUpperCase(),
        userId: getGuestId(),
        name,
      })
      navigate({ to: '/game/lobby/$roomCode', params: { roomCode: roomCode.toUpperCase() } })
    } catch (e: any) {
      const msg = e.message || 'Failed to join game'
      if (msg.includes('not found')) {
        setError('Room not found. Please check the code and try again.')
      } else if (msg.includes('already started')) {
        setError('This game has already started. You cannot join mid-game.')
      } else if (msg.includes('full')) {
        setError('This game is full (8 players max).')
      } else {
        setError(msg)
      }
      setJoining(false)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!hasGuestName()) {
      setNeedsName(true)
    } else {
      doJoin(getGuestName())
    }
  }, [])

  const handleNameComplete = (name: string) => {
    setNeedsName(false)
    doJoin(name)
  }

  if (error) {
    return (
      <div className="stars-bg flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
          <span className="text-3xl">!</span>
        </div>
        <p className="font-display text-lg font-semibold text-foreground">{error}</p>
        <button
          onClick={() => navigate({ to: '/game' })}
          className="game-btn bg-primary px-8 py-3 text-sm text-primary-foreground"
        >
          Go Home
        </button>
      </div>
    )
  }

  return (
    <div className="stars-bg flex min-h-[100dvh] flex-col items-center justify-center gap-4">
      <NamePromptDialog open={needsName} onComplete={handleNameComplete} />
      {joining && (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Joining game {roomCode.toUpperCase()}...</p>
        </>
      )}
    </div>
  )
}
