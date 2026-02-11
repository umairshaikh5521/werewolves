import { useState, useEffect, useCallback, useRef } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { getGuestId } from '@/lib/guest-identity'
import { cn } from '@/lib/utils'
import { playSound, playCountdown, stopCountdown } from '@/lib/sounds'
import { PhaseIndicator } from '@/components/game/PhaseIndicator'
import { PlayerAvatar } from '@/components/game/PlayerAvatar'
import { GameChat } from '@/components/game/GameChat'
import { ActionPanel } from '@/components/game/ActionPanel'
import { GameOverOverlay } from '@/components/game/GameOverOverlay'
import { RoleReveal } from '@/components/game/RoleReveal'
import { ConversionOverlay } from '@/components/game/ConversionOverlay'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { getRoleDistribution, ROLE_META } from '@/components/game/CountdownOverlay'
import { MessageCircle, ChevronUp, Info } from 'lucide-react'
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
  const submitMuteFn = useMutation(api.gameActions.submitMute)
  const skipMuteFn = useMutation(api.gameActions.skipMute)
  const hunterRevengeFn = useMutation(api.gameActions.hunterRevenge)
  const absorbRoleFn = useMutation(api.gameActions.absorbRole)
  const sendMessage = useMutation(api.gameChat.sendMessage)
  const resetToLobby = useMutation(api.games.resetToLobby)

  const muteStatus = useQuery(
    api.gameActions.getMuteStatus,
    game && myPlayer ? { gameId: game._id, playerId: myPlayer._id } : 'skip'
  )
  const hunterRevengeState = useQuery(
    api.gameActions.getHunterRevengeState,
    game ? { gameId: game._id } : 'skip'
  )

  const conversionStatus = useQuery(
    api.gameActions.getConversionStatus,
    game && myPlayer ? { gameId: game._id, playerId: myPlayer._id } : 'skip'
  )
  const deadPlayers = useQuery(
    api.gameActions.getDeadPlayers,
    game && myPlayer && myPlayer.role === 'revenant' && game.phase === 'night' && game.turnNumber >= 1
      ? { gameId: game._id }
      : 'skip'
  )
  const voters = useQuery(
    api.gameActions.getVotersThisTurn,
    game && game.phase === 'voting' ? { gameId: game._id, turnNumber: game.turnNumber } : 'skip'
  )
  const gunnerShotStatus = useQuery(
    api.gameActions.getGunnerShotStatus,
    game && myPlayer && myPlayer.role === 'gunner' && game.phase === 'day'
      ? { gameId: game._id, playerId: myPlayer._id, turnNumber: game.turnNumber }
      : 'skip'
  )
  // Subscribe to shoot count for all players to hear gunshot
  const shootCount = useQuery(
    api.gameActions.getShootCount,
    game ? { gameId: game._id } : 'skip'
  )

  const [selectedPlayerId, setSelectedPlayerId] = useState<Id<'players'> | null>(null)
  const [selectedPlayerId2, setSelectedPlayerId2] = useState<Id<'players'> | null>(null)
  const [hasActed, setHasActed] = useState(false)
  const [hasConverted, setHasConverted] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [showRoleReveal, setShowRoleReveal] = useState(false)
  const [showConversionOverlay, setShowConversionOverlay] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [chatChannel, setChatChannel] = useState<'global' | 'wolves'>('global')
  const roleRevealShown = useRef(false)
  const conversionShown = useRef(false)
  const previousPhase = useRef<string | null>(null)
  const gameEndedSoundPlayed = useRef(false)
  const clockRunning = useRef(false)
  const previousShootCount = useRef<number | null>(null)

  // Auto-switch chat channel for wolves based on phase
  useEffect(() => {
    if (!game || !myPlayer) return
    const isWolf = myPlayer.team === 'bad'
    if (isWolf && game.phase === 'night') {
      setChatChannel('wolves')
    } else if (isWolf && game.phase !== 'night') {
      setChatChannel('global')
    }
  }, [game?.phase, myPlayer?.team])

  // Play gunshot sound when any player shoots (for all clients)
  useEffect(() => {
    if (shootCount?.count === undefined) return

    const currentCount = shootCount.count
    const prevCount = previousShootCount.current

    // Only play sound when count increases (not on initial load)
    if (prevCount !== null && currentCount > prevCount) {
      console.log('[Gunshot] New shoot detected! Playing sound for all players')
      playSound('gunshot', 0.7)
    }

    previousShootCount.current = currentCount
  }, [shootCount?.count])

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

  // Phase change sound effects
  useEffect(() => {
    if (!game?.phase) return

    const currentPhase = game.phase
    const prevPhase = previousPhase.current

    // Only play sound on actual phase changes (not initial load)
    if (prevPhase !== null && prevPhase !== currentPhase) {
      if (currentPhase === 'night') {
        playSound('night', 0.5)
      } else if (currentPhase === 'day') {
        playSound('morning', 0.5)
      } else if (currentPhase === 'voting') {
        playSound('votingStarted', 0.5)
      }
    }

    previousPhase.current = currentPhase
  }, [game?.phase])

  // Countdown sound for last 6 seconds
  const phaseEndTimeRef = useRef<number | null>(null)

  useEffect(() => {
    phaseEndTimeRef.current = game?.phaseEndTime ?? null
  }, [game?.phaseEndTime])

  useEffect(() => {
    if (!game?.phaseEndTime || game?.status !== 'active') {
      stopCountdown()
      clockRunning.current = false
      return
    }

    const checkTimer = () => {
      const endTime = phaseEndTimeRef.current
      if (!endTime) return

      const now = Date.now()
      const timeLeft = endTime - now
      const secondsLeft = Math.ceil(timeLeft / 1000)

      // Play countdown sound when 6 seconds left (only once per phase)
      if (secondsLeft <= 6 && secondsLeft > 0 && !clockRunning.current) {
        console.log('[Countdown] Playing countdown sound!')
        clockRunning.current = true
        playCountdown(0.5)
      } else if (secondsLeft <= 0 && clockRunning.current) {
        clockRunning.current = false
        stopCountdown()
      }
    }

    checkTimer()
    const interval = setInterval(checkTimer, 500)

    return () => {
      clearInterval(interval)
      stopCountdown()
      clockRunning.current = false
    }
  }, [game?.phaseEndTime, game?.status, game?.phase])

  // Game end sound
  useEffect(() => {
    if (game?.status === 'ended' && !gameEndedSoundPlayed.current) {
      gameEndedSoundPlayed.current = true
      stopCountdown()
      playSound('levelComplete', 0.6)
    }
  }, [game?.status])

  const isDetective = myPlayer?.role === 'detective' && game?.phase === 'night'
  const selectedPlayer = players?.find((p) => p._id === selectedPlayerId)
  const selectedPlayer2 = players?.find((p) => p._id === selectedPlayerId2)

  const handlePlayerSelect = useCallback(
    (playerId: Id<'players'>) => {
      if (!game || !myPlayer) return

      // Allow dead hunter to select a target during revenge phase
      const isHunterRevenge = game.phase === 'hunter_revenge' && hunterRevengeState?.hunterPlayerId === myPlayer._id

      if (!myPlayer.isAlive && !isHunterRevenge) return

      const target = players?.find((p) => p._id === playerId)
      if (!target || !target.isAlive) return
      if (playerId === myPlayer._id && game.phase !== 'night') return
      const isWolfRole = myPlayer.role === 'wolf' || myPlayer.role === 'kittenWolf' || myPlayer.role === 'shadowWolf'
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
    [game, myPlayer, players, isDetective, selectedPlayerId, selectedPlayerId2, hunterRevengeState]
  )

  const handleAction = useCallback(async () => {
    if (!game || !myPlayer || !selectedPlayerId || hasActed) return

    let actionType: 'kill' | 'save' | 'scan' | 'vote'
    if (game.phase === 'night') {
      if (myPlayer.role === 'wolf' || myPlayer.role === 'kittenWolf' || myPlayer.role === 'shadowWolf') actionType = 'kill'
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
      // Sound plays via reactive shootCount subscription for all players
      setSelectedPlayerId(null)
    } catch (e) {
      console.log('[Shoot] Failed:', e)
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

  // Shadow Wolf mute handler
  const handleMute = useCallback(async () => {
    if (!game || !myPlayer || !selectedPlayerId) return
    if (myPlayer.role !== 'shadowWolf') return
    try {
      await submitMuteFn({
        gameId: game._id,
        playerId: myPlayer._id,
        targetId: selectedPlayerId,
      })
    } catch {
      // mute failed
    }
  }, [game, myPlayer, selectedPlayerId, submitMuteFn])

  const handleSkipMute = useCallback(async () => {
    if (!game || !myPlayer) return
    if (myPlayer.role !== 'shadowWolf') return
    try {
      await skipMuteFn({
        gameId: game._id,
        playerId: myPlayer._id,
      })
    } catch {
      // skip mute failed
    }
  }, [game, myPlayer, skipMuteFn])

  // Hunter revenge handler
  const handleHunterRevenge = useCallback(async () => {
    if (!game || !myPlayer || !selectedPlayerId) return
    if (game.phase !== 'hunter_revenge') return
    try {
      await hunterRevengeFn({
        gameId: game._id,
        playerId: myPlayer._id,
        targetId: selectedPlayerId,
      })
    } catch {
      // revenge failed
    }
  }, [game, myPlayer, selectedPlayerId, hunterRevengeFn])

  // Revenant absorb handler
  const handleAbsorb = useCallback(async (targetId: Id<'players'>) => {
    if (!game || !myPlayer) return
    if (myPlayer.role !== 'revenant') return
    try {
      await absorbRoleFn({
        gameId: game._id,
        playerId: myPlayer._id,
        targetId,
      })
      setHasActed(true)
    } catch {
      // absorb failed
    }
  }, [game, myPlayer, absorbRoleFn])

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!game || !myPlayer) return

      let channel: 'global' | 'wolves'
      if (!myPlayer.isAlive) {
        return // dead players cannot send messages
      } else if (myPlayer.team === 'bad') {
        channel = chatChannel
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
    [game, myPlayer, sendMessage, chatChannel]
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
        endReason={game.endReason}
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
  const isMuted = muteStatus?.isMuted || false
  const chatDisabled =
    !myPlayer.isAlive ||
    (game.phase === 'night' && !isWolfTeam && myPlayer.isAlive) ||
    (game.phase === 'night' && isWolfTeam && chatChannel === 'global') ||
    (game.phase !== 'night' && isWolfTeam && chatChannel === 'wolves') ||
    (isMuted && (game.phase === 'day' || game.phase === 'voting') && chatChannel === 'global') ||
    game.phase === 'hunter_revenge'

  const currentChannel = isWolfTeam ? chatChannel : 'global'

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <div className="shrink-0 px-4 pt-3 pb-1 flex items-center gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <button className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-border bg-card text-muted-foreground transition-all hover:border-primary/50 hover:bg-secondary hover:text-foreground active:scale-95">
              <Info className="h-5 w-5" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-xs border-2 border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-center font-display text-xl text-primary">Role Distribution</DialogTitle>
            </DialogHeader>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {getRoleDistribution(players.length).map((r) => (
                <div
                  key={r.role}
                  className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 p-2"
                >
                  {r.image ? (
                    <img src={r.image} alt={r.role} className="h-14 w-14 object-contain opacity-90" />
                  ) : (
                    <span className="text-4xl">{r.emoji}</span>
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-foreground">
                      {ROLE_META[r.role]?.label || r.role}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Count: {r.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        <div className="flex-1 min-w-0">
          <PhaseIndicator
            phase={game.phase}
            phaseEndTime={game.phaseEndTime}
            turnNumber={game.turnNumber}
            role={myPlayer.role || undefined}
            bullets={myPlayer.roleData?.bullets}
            onRoleClick={() => setShowRoleReveal(true)}
          />
        </div>
      </div>

      <div className="shrink-0 px-2 py-2">
        <div className={`grid gap-1 justify-items-center ${players.length > 10 ? 'grid-cols-6' : 'grid-cols-5'}`}>
          {players.map((player, index) => {
            const isSecondSelected = isDetective && selectedPlayerId2 === player._id
            const isRevealed = player.roleData?.isRevealed
            const hasVoted = game.phase === 'voting' && voters?.some((id) => id === player._id)
            const isMyWolfTeammate =
              myPlayer.team === 'bad' &&
              player.team === 'bad' &&
              player._id !== myPlayer._id &&
              player.isAlive
            return (
              <PlayerAvatar
                key={player._id}
                name={player.name}
                isAlive={player.isAlive}
                isHost={player.isHost}
                isSelected={selectedPlayerId === player._id || isSecondSelected}
                isCurrentPlayer={player._id === myPlayer._id}
                hasVoted={hasVoted}
                role={isRevealed ? player.role ?? undefined : isMyWolfTeammate ? player.role ?? undefined : player._id === myPlayer._id ? myPlayer.role ?? undefined : undefined}
                showRole={!!isRevealed}
                onClick={
                  player._id !== myPlayer._id && player.isAlive
                    ? () => handlePlayerSelect(player._id)
                    : myPlayer.role === 'doctor' && player._id === myPlayer._id && game.phase === 'night'
                      ? () => handlePlayerSelect(player._id)
                      : undefined
                }
                size="xs"
                playerIndex={index}
                isWolfTeammate={isMyWolfTeammate}
                isSelfWolf={player._id === myPlayer._id && myPlayer.team === 'bad'}
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
            hasShot={gunnerShotStatus?.hasShot}
            selectedPlayerName2={selectedPlayer2?.name}
            onInvestigate={handleInvestigate}
            lastProtectedId={myPlayer.roleData?.lastProtectedId}
            selectedPlayerId2={selectedPlayerId2 || undefined}
            hasBitten={myPlayer.roleData?.hasBitten}
            onConvert={handleConvert}
            hasConverted={hasConverted}
            isMuted={isMuted}
            onMute={handleMute}
            onSkipMute={handleSkipMute}
            isHunterRevenge={game.phase === 'hunter_revenge'}
            isHunterRevengePlayer={game.phase === 'hunter_revenge' && hunterRevengeState?.hunterPlayerId === myPlayer._id}
            onHunterRevenge={handleHunterRevenge}
            deadPlayers={deadPlayers || undefined}
            onAbsorb={handleAbsorb}
            turnNumber={game.turnNumber}
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
                {currentChannel === 'wolves' ? 'Wolf Chat' : 'Chat'}
              </span>
              {currentChannel === 'wolves' && (
                <span className="h-2 w-2 rounded-full bg-wolf-red animate-pulse" />
              )}
            </div>
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </button>

          {isWolfTeam && (
            <div className="flex border-b border-border">
              <button
                onClick={() => setChatChannel('global')}
                className={cn(
                  'flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
                  chatChannel === 'global'
                    ? 'bg-secondary text-foreground'
                    : 'bg-transparent text-muted-foreground hover:text-foreground/70'
                )}
              >
                🏘️ Village
              </button>
              <button
                onClick={() => setChatChannel('wolves')}
                className={cn(
                  'flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors',
                  chatChannel === 'wolves'
                    ? 'bg-wolf-red/20 text-wolf-red'
                    : 'bg-transparent text-muted-foreground hover:text-foreground/70'
                )}
              >
                🐺 Wolves
              </button>
            </div>
          )}

          <div className="flex-1" style={{ minHeight: 0 }}>
            <GameChat
              messages={(messages || []).map((m) => ({ ...m, _id: m._id as string }))}
              onSend={handleSendMessage}
              currentChannel={currentChannel}
              disabled={chatDisabled}
              placeholder={
                isMuted && (game.phase === 'day' || game.phase === 'voting')
                  ? '🔇 You have been silenced'
                  : game.phase === 'hunter_revenge'
                    ? 'Waiting for the Hunter\'s final shot...'
                    : chatDisabled && game.phase === 'night' && isWolfTeam && chatChannel === 'global'
                      ? 'Village chat disabled at night'
                      : chatDisabled && game.phase !== 'night' && isWolfTeam && chatChannel === 'wolves'
                        ? 'Wolf chat disabled during the day'
                        : currentChannel === 'wolves'
                          ? 'Wolf chat (use @ to mention)...'
                          : 'Mention players with @...'
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
              {currentChannel === 'wolves' ? 'Wolf Chat' : 'Village Chat'}
              {currentChannel === 'wolves' && (
                <span className="h-2 w-2 rounded-full bg-wolf-red animate-pulse" />
              )}
            </SheetTitle>
          </SheetHeader>

          {isWolfTeam && (
            <div className="flex border-b border-border">
              <button
                onClick={() => setChatChannel('global')}
                className={cn(
                  'flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors',
                  chatChannel === 'global'
                    ? 'bg-secondary text-foreground'
                    : 'bg-transparent text-muted-foreground hover:text-foreground/70'
                )}
              >
                🏘️ Village
              </button>
              <button
                onClick={() => setChatChannel('wolves')}
                className={cn(
                  'flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors',
                  chatChannel === 'wolves'
                    ? 'bg-wolf-red/20 text-wolf-red'
                    : 'bg-transparent text-muted-foreground hover:text-foreground/70'
                )}
              >
                🐺 Wolves
              </button>
            </div>
          )}

          <div className="flex-1" style={{ minHeight: 0 }}>
            <GameChat
              messages={(messages || []).map((m) => ({ ...m, _id: m._id as string }))}
              onSend={handleSendMessage}
              currentChannel={currentChannel}
              disabled={chatDisabled}
              placeholder={
                isMuted && (game.phase === 'day' || game.phase === 'voting')
                  ? '🔇 You have been silenced'
                  : game.phase === 'hunter_revenge'
                    ? 'Waiting for the Hunter\'s final shot...'
                    : chatDisabled && game.phase === 'night' && isWolfTeam && chatChannel === 'global'
                      ? 'Village chat disabled at night'
                      : chatDisabled && game.phase !== 'night' && isWolfTeam && chatChannel === 'wolves'
                        ? 'Wolf chat disabled during the day'
                        : currentChannel === 'wolves'
                          ? 'Wolf chat (use @ to mention)...'
                          : 'Mention players with @...'
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
