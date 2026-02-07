import { useState, useEffect, useCallback, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { getGuestId } from '@/lib/guest-identity'
import { PhaseIndicator } from '@/components/game/PhaseIndicator'
import { PlayerAvatar } from '@/components/game/PlayerAvatar'
import { GameChat } from '@/components/game/GameChat'
import { ActionPanel } from '@/components/game/ActionPanel'
import { GameOverOverlay } from '@/components/game/GameOverOverlay'
import { RoleReveal } from '@/components/game/RoleReveal'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { MessageCircle } from 'lucide-react'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/game/play/$roomCode')({
  component: GamePlayScreen,
})

function GamePlayScreen() {
  const { roomCode } = Route.useParams()
  const navigate = useNavigate()

  const game = useQuery(api.games.getGameByCode, { roomCode: roomCode.toUpperCase() })
  const players = useQuery(api.games.getPlayers, game ? { gameId: game._id } : 'skip')
  const userId = typeof window !== 'undefined' ? getGuestId() : ''
  const myPlayer = useQuery(
    api.games.getMyPlayer,
    game ? { gameId: game._id, userId } : 'skip'
  )
  const messages = useQuery(
    api.gameChat.getMessages,
    game && myPlayer ? { gameId: game._id, playerId: myPlayer._id } : 'skip'
  )
  const seerResult = useQuery(
    api.gameActions.getSeerResult,
    game && myPlayer && myPlayer.role === 'seer'
      ? { gameId: game._id, playerId: myPlayer._id, turnNumber: game.turnNumber }
      : 'skip'
  )
  const detectiveResult = useQuery(
    api.gameActions.getDetectiveResult,
    game && myPlayer && myPlayer.role === 'detective'
      ? { gameId: game._id, playerId: myPlayer._id, turnNumber: game.turnNumber }
      : 'skip'
  )

  const submitAction = useMutation(api.gameActions.submitAction)
  const shootGun = useMutation(api.gameActions.shootGun)
  const investigatePlayers = useMutation(api.gameActions.investigatePlayers)
  const sendMessage = useMutation(api.gameChat.sendMessage)

  const [selectedPlayerId, setSelectedPlayerId] = useState<Id<'players'> | null>(null)
  const [selectedPlayerId2, setSelectedPlayerId2] = useState<Id<'players'> | null>(null)
  const [hasActed, setHasActed] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [showRoleReveal, setShowRoleReveal] = useState(false)
  const roleRevealShown = useRef(false)

  useEffect(() => {
    if (myPlayer?.role && !roleRevealShown.current) {
      roleRevealShown.current = true
      setShowRoleReveal(true)
    }
  }, [myPlayer?.role])

  useEffect(() => {
    setSelectedPlayerId(null)
    setSelectedPlayerId2(null)
    setHasActed(false)
  }, [game?.phase, game?.turnNumber])

  const isDetective = myPlayer?.role === 'detective' && game?.phase === 'night'
  const selectedPlayer = players?.find((p) => p._id === selectedPlayerId)
  const selectedPlayer2 = players?.find((p) => p._id === selectedPlayerId2)

  const handlePlayerSelect = useCallback(
    (playerId: Id<'players'>) => {
      if (!game || !myPlayer || !myPlayer.isAlive) return
      const target = players?.find((p) => p._id === playerId)
      if (!target || !target.isAlive) return
      if (playerId === myPlayer._id && game.phase !== 'night') return
      if (game.phase === 'night' && myPlayer.role === 'wolf' && target.team === 'bad') return

      if (isDetective) {
        if (playerId === myPlayer._id) return
        if (!selectedPlayerId) {
          setSelectedPlayerId(playerId)
        } else if (selectedPlayerId === playerId) {
          setSelectedPlayerId(null)
        } else if (!selectedPlayerId2) {
          setSelectedPlayerId2(playerId)
        } else if (selectedPlayerId2 === playerId) {
          setSelectedPlayerId2(null)
        } else {
          setSelectedPlayerId2(playerId)
        }
        return
      }

      if (myPlayer.role === 'doctor' && game.phase === 'night') {
        if (myPlayer.roleData?.lastProtectedId === playerId) return
      }

      setSelectedPlayerId((prev) => (prev === playerId ? null : playerId))
    },
    [game, myPlayer, players, isDetective, selectedPlayerId, selectedPlayerId2]
  )

  const handleAction = useCallback(async () => {
    if (!game || !myPlayer || !selectedPlayerId || hasActed) return

    let actionType: 'kill' | 'save' | 'scan' | 'vote'
    if (game.phase === 'night') {
      if (myPlayer.role === 'wolf') actionType = 'kill'
      else if (myPlayer.role === 'seer') actionType = 'scan'
      else if (myPlayer.role === 'doctor') actionType = 'save'
      else return
    } else if (game.phase === 'voting') {
      actionType = 'vote'
    } else {
      return
    }

    try {
      await submitAction({
        gameId: game._id,
        playerId: myPlayer._id,
        targetId: selectedPlayerId,
        type: actionType,
      })
      setHasActed(true)
    } catch {
      // action failed
    }
  }, [game, myPlayer, selectedPlayerId, hasActed, submitAction])

  const handleShoot = useCallback(async () => {
    if (!game || !myPlayer || !selectedPlayerId) return
    try {
      await shootGun({
        gameId: game._id,
        playerId: myPlayer._id,
        targetId: selectedPlayerId,
      })
      setSelectedPlayerId(null)
    } catch {
      // shoot failed
    }
  }, [game, myPlayer, selectedPlayerId, shootGun])

  const handleInvestigate = useCallback(async () => {
    if (!game || !myPlayer || !selectedPlayerId || !selectedPlayerId2 || hasActed) return
    try {
      await investigatePlayers({
        gameId: game._id,
        playerId: myPlayer._id,
        targetId1: selectedPlayerId,
        targetId2: selectedPlayerId2,
      })
      setHasActed(true)
    } catch {
      // investigate failed
    }
  }, [game, myPlayer, selectedPlayerId, selectedPlayerId2, hasActed, investigatePlayers])

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!game || !myPlayer) return

      let channel: 'global' | 'wolves' | 'dead'
      if (!myPlayer.isAlive) {
        channel = 'dead'
      } else if (game.phase === 'night' && myPlayer.role === 'wolf') {
        channel = 'wolves'
      } else {
        channel = 'global'
      }

      try {
        await sendMessage({
          gameId: game._id,
          playerId: myPlayer._id,
          content,
          channel,
        })
      } catch {
        // send failed
      }
    },
    [game, myPlayer, sendMessage]
  )

  const handleBackToHome = () => {
    navigate({ to: '/game' })
  }

  if (!game || !players || !myPlayer) {
    return (
      <div className="stars-bg flex min-h-[100dvh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading game...</p>
      </div>
    )
  }

  if (game.status === 'ended' && game.winningTeam) {
    return (
      <GameOverOverlay
        winningTeam={game.winningTeam}
        players={players}
        onBackToHome={handleBackToHome}
      />
    )
  }

  const chatDisabled =
    (game.phase === 'night' && myPlayer.role !== 'wolf' && myPlayer.isAlive) ||
    false

  const currentChannel: 'global' | 'wolves' | 'dead' = !myPlayer.isAlive
    ? 'dead'
    : game.phase === 'night' && myPlayer.role === 'wolf'
      ? 'wolves'
      : 'global'

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <div className="shrink-0 px-4 pt-4 pb-2">
        <PhaseIndicator
          phase={game.phase}
          phaseEndTime={game.phaseEndTime}
          turnNumber={game.turnNumber}
        />
      </div>

      {myPlayer.isAlive && myPlayer.role && (
        <div className="flex justify-center pb-1">
          <RoleBadge role={myPlayer.role} bullets={myPlayer.roleData?.bullets} />
        </div>
      )}

      <div className="shrink-0 px-4 py-2">
        <div className="flex flex-wrap justify-center gap-2">
          {players.map((player) => {
            const isSecondSelected = isDetective && selectedPlayerId2 === player._id
            const isRevealed = player.roleData?.isRevealed
            return (
              <PlayerAvatar
                key={player._id}
                name={player.name}
                isAlive={player.isAlive}
                isHost={player.isHost}
                isSelected={selectedPlayerId === player._id || isSecondSelected}
                isCurrentPlayer={player._id === myPlayer._id}
                role={isRevealed ? player.role ?? undefined : undefined}
                showRole={!!isRevealed}
                onClick={
                  player._id !== myPlayer._id && player.isAlive
                    ? () => handlePlayerSelect(player._id)
                    : myPlayer.role === 'doctor' && player._id === myPlayer._id && game.phase === 'night'
                      ? () => handlePlayerSelect(player._id)
                      : undefined
                }
                size="sm"
              />
            )
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto">
          <ActionPanel
            role={myPlayer.role || 'villager'}
            phase={game.phase}
            isAlive={myPlayer.isAlive}
            selectedPlayerName={selectedPlayer?.name}
            selectedPlayerId={selectedPlayerId || undefined}
            onAction={handleAction}
            hasActed={hasActed}
            seerResult={seerResult}
            detectiveResult={detectiveResult}
            bullets={myPlayer.roleData?.bullets}
            onShoot={handleShoot}
            selectedPlayerName2={selectedPlayer2?.name}
            onInvestigate={handleInvestigate}
            lastProtectedId={myPlayer.roleData?.lastProtectedId}
            selectedPlayerId2={selectedPlayerId2 || undefined}
          />
        </div>

        <div className="shrink-0 border-t border-border">
          <button
            onClick={() => setChatOpen(true)}
            className="flex w-full items-center justify-between bg-secondary px-4 py-3 text-sm font-semibold transition-colors hover:bg-secondary/80"
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="font-display">
                {currentChannel === 'wolves' ? 'Wolf Chat' : currentChannel === 'dead' ? 'Graveyard' : 'Chat'}
              </span>
              {currentChannel === 'wolves' && (
                <span className="h-2 w-2 rounded-full bg-wolf-red animate-pulse" />
              )}
            </div>
            <span className="text-xs text-muted-foreground">Tap to open</span>
          </button>
        </div>
      </div>

      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="flex h-[60dvh] flex-col gap-0 rounded-t-2xl p-0"
        >
          <SheetHeader className="shrink-0 border-b border-border px-4 py-3">
            <SheetTitle className="flex items-center gap-2 font-display text-sm">
              <MessageCircle className="h-4 w-4" />
              {currentChannel === 'wolves' ? 'Wolf Chat' : currentChannel === 'dead' ? 'Graveyard' : 'Village Chat'}
              {currentChannel === 'wolves' && (
                <span className="h-2 w-2 rounded-full bg-wolf-red animate-pulse" />
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1" style={{ minHeight: 0 }}>
            <GameChat
              messages={(messages || []).map((m) => ({ ...m, _id: m._id as string }))}
              onSend={handleSendMessage}
              currentChannel={currentChannel}
              disabled={chatDisabled}
              placeholder={
                currentChannel === 'wolves'
                  ? 'Wolf chat...'
                  : currentChannel === 'dead'
                    ? 'Graveyard chat...'
                    : 'Message the village...'
              }
            />
          </div>
        </SheetContent>
      </Sheet>

      {showRoleReveal && myPlayer.role && (
        <RoleReveal
          role={myPlayer.role}
          onDismiss={() => setShowRoleReveal(false)}
        />
      )}
    </div>
  )
}

function RoleBadge({ role, bullets }: { role: string; bullets?: number }) {
  const config: Record<string, { bg: string; text: string; icon: string }> = {
    wolf: { bg: 'bg-wolf-red/20 border-wolf-red/40', text: 'text-wolf-red', icon: '🐺' },
    seer: { bg: 'bg-seer-blue/20 border-seer-blue/40', text: 'text-seer-blue', icon: '🔮' },
    doctor: { bg: 'bg-doctor-green/20 border-doctor-green/40', text: 'text-doctor-green', icon: '💊' },
    gunner: { bg: 'bg-moon-gold/20 border-moon-gold/40', text: 'text-moon-gold', icon: '🔫' },
    detective: { bg: 'bg-moon-gold/20 border-moon-gold/40', text: 'text-moon-gold', icon: '🕵️' },
    villager: { bg: 'bg-secondary border-border', text: 'text-secondary-foreground', icon: '🏠' },
  }
  const c = config[role] || config.villager
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${c.bg}`}
    >
      <span className="text-xs">{c.icon}</span>
      <span className={`font-display text-xs font-semibold capitalize ${c.text}`}>
        {role}
      </span>
      {role === 'gunner' && bullets !== undefined && (
        <span className="ml-0.5 text-[10px] text-muted-foreground">x{bullets}</span>
      )}
    </div>
  )
}
