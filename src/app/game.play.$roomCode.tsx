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
import { ConversionOverlay } from '@/components/game/ConversionOverlay'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { MessageCircle, ChevronUp } from 'lucide-react'
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
  const convertPlayer = useMutation(api.gameActions.convertPlayer)
  const sendMessage = useMutation(api.gameChat.sendMessage)
  const resetToLobby = useMutation(api.games.resetToLobby)

  const conversionStatus = useQuery(
    api.gameActions.getConversionStatus,
    game && myPlayer ? { gameId: game._id, playerId: myPlayer._id } : 'skip'
  )
  const voters = useQuery(
    api.gameActions.getVotersThisTurn,
    game && game.phase === 'voting' ? { gameId: game._id, turnNumber: game.turnNumber } : 'skip'
  )

  const [selectedPlayerId, setSelectedPlayerId] = useState<Id<'players'> | null>(null)
  const [selectedPlayerId2, setSelectedPlayerId2] = useState<Id<'players'> | null>(null)
  const [hasActed, setHasActed] = useState(false)
  const [hasConverted, setHasConverted] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [showRoleReveal, setShowRoleReveal] = useState(false)
  const [showConversionOverlay, setShowConversionOverlay] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const roleRevealShown = useRef(false)
  const conversionShown = useRef(false)

  useEffect(() => {
    if (myPlayer?.role && !roleRevealShown.current) {
      roleRevealShown.current = true
      setShowRoleReveal(true)
    }
  }, [myPlayer?.role])

  useEffect(() => {
    if (conversionStatus?.wasConverted && !conversionShown.current) {
      conversionShown.current = true
      setShowConversionOverlay(true)
    }
  }, [conversionStatus?.wasConverted])

  useEffect(() => {
    setSelectedPlayerId(null)
    setSelectedPlayerId2(null)
    setHasActed(false)
    setHasConverted(false)
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
      const isWolfRole = myPlayer.role === 'wolf' || myPlayer.role === 'kittenWolf'
      if (game.phase === 'night' && isWolfRole && target.team === 'bad') return

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
      if (myPlayer.role === 'wolf' || myPlayer.role === 'kittenWolf') actionType = 'kill'
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

  const handleConvert = useCallback(async () => {
    if (!game || !myPlayer || !selectedPlayerId || hasConverted) return
    if (myPlayer.role !== 'kittenWolf') return
    if (myPlayer.roleData?.hasBitten) return

    try {
      await convertPlayer({
        gameId: game._id,
        playerId: myPlayer._id,
        targetId: selectedPlayerId,
      })
      setHasConverted(true)
    } catch {
      // convert failed
    }
  }, [game, myPlayer, selectedPlayerId, hasConverted, convertPlayer])

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

  const handleBackToRoom = () => {
    navigate({ to: '/game/lobby/$roomCode', params: { roomCode } })
  }

  const handleBackToLobby = useCallback(async () => {
    if (!game) return
    setIsResetting(true)
    try {
      await resetToLobby({ gameId: game._id, userId })
    } catch {
      setIsResetting(false)
    }
  }, [game, userId, resetToLobby])

  useEffect(() => {
    if (game?.status === 'lobby') {
      navigate({ to: '/game/lobby/$roomCode', params: { roomCode } })
    }
  }, [game?.status, navigate, roomCode])

  if (game === undefined || players === undefined) {
    return (
      <div className="stars-bg flex min-h-[100dvh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading game...</p>
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
          onClick={handleBackToHome}
          className="game-btn bg-primary px-8 py-3 text-sm text-primary-foreground"
        >
          Go Home
        </button>
      </div>
    )
  }

  if (game.status === 'lobby') {
    return (
      <div className="stars-bg flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-moon-gold/20">
          <span className="text-3xl">⏳</span>
        </div>
        <p className="font-display text-lg font-semibold text-foreground">Game Not Started</p>
        <p className="text-center text-sm text-muted-foreground">
          This game hasn't started yet. Wait for the host or join the lobby.
        </p>
        <button
          onClick={() => navigate({ to: '/game/lobby/$roomCode', params: { roomCode } })}
          className="game-btn bg-primary px-8 py-3 text-sm text-primary-foreground"
        >
          Go to Lobby
        </button>
      </div>
    )
  }

  if (myPlayer === null) {
    return (
      <div className="stars-bg flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
          <span className="text-3xl">🚫</span>
        </div>
        <p className="font-display text-lg font-semibold text-foreground">Not in This Game</p>
        <p className="text-center text-sm text-muted-foreground">
          You are not a participant in this game. You cannot join a game that's already in progress.
        </p>
        <button
          onClick={handleBackToHome}
          className="game-btn bg-primary px-8 py-3 text-sm text-primary-foreground"
        >
          Go Home
        </button>
      </div>
    )
  }

  if (!myPlayer) {
    return (
      <div className="stars-bg flex min-h-[100dvh] flex-col items-center justify-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading player...</p>
      </div>
    )
  }

  if (game.status === 'ended' && game.winningTeam) {
    return (
      <GameOverOverlay
        winningTeam={game.winningTeam}
        players={players}
        onBackToHome={handleBackToHome}
        onBackToLobby={handleBackToLobby}
        onBackToRoom={handleBackToRoom}
        isHost={myPlayer?.isHost}
        isResetting={isResetting}
      />
    )
  }

  const isWolfTeam = myPlayer.team === 'bad'
  const chatDisabled =
    (game.phase === 'night' && !isWolfTeam && myPlayer.isAlive) ||
    false

  const currentChannel: 'global' | 'wolves' | 'dead' = !myPlayer.isAlive
    ? 'dead'
    : game.phase === 'night' && isWolfTeam
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
          <button onClick={() => setShowRoleReveal(true)}>
            <RoleBadge role={myPlayer.role} bullets={myPlayer.roleData?.bullets} />
          </button>
        </div>
      )}

      <div className="shrink-0 px-4 py-2">
        <div className="flex flex-wrap justify-center gap-2">
          {players.map((player, index) => {
            const isSecondSelected = isDetective && selectedPlayerId2 === player._id
            const isRevealed = player.roleData?.isRevealed
            const hasVoted = game.phase === 'voting' && voters?.some((id) => id === player._id)
            return (
              <PlayerAvatar
                key={player._id}
                name={player.name}
                isAlive={player.isAlive}
                isHost={player.isHost}
                isSelected={selectedPlayerId === player._id || isSecondSelected}
                isCurrentPlayer={player._id === myPlayer._id}
                hasVoted={hasVoted}
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
                playerIndex={index}
              />
            )
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 overflow-y-auto">
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
            hasBitten={myPlayer.roleData?.hasBitten}
            onConvert={handleConvert}
            hasConverted={hasConverted}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col border-t border-border">
          <button
            onClick={() => setChatOpen(true)}
            className="flex w-full items-center justify-between bg-secondary/60 px-4 py-1.5 text-xs transition-colors hover:bg-secondary/80"
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="font-display font-semibold">
                {currentChannel === 'wolves' ? 'Wolf Chat' : currentChannel === 'dead' ? 'Graveyard' : 'Chat'}
              </span>
              {currentChannel === 'wolves' && (
                <span className="h-2 w-2 rounded-full bg-wolf-red animate-pulse" />
              )}
            </div>
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </button>
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
              playerNames={players?.map((p) => p.name) ?? []}
            />
          </div>
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
              playerNames={players?.map((p) => p.name) ?? []}
            />
          </div>
        </SheetContent>
      </Sheet>

      {showRoleReveal && myPlayer.role && (
        <RoleReveal
          role={myPlayer.role}
          onDismiss={() => setShowRoleReveal(false)}
          skipReveal={roleRevealShown.current}
        />
      )}

      {showConversionOverlay && (
        <ConversionOverlay onDismiss={() => setShowConversionOverlay(false)} />
      )}
    </div>
  )
}

function RoleBadge({ role, bullets }: { role: string; bullets?: number }) {
  const config: Record<string, { bg: string; text: string; icon: string }> = {
    wolf: { bg: 'bg-wolf-red/20 border-wolf-red/40', text: 'text-wolf-red', icon: '🐺' },
    kittenWolf: { bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-500', icon: '🐾' },
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
