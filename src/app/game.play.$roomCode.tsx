import { useState, useEffect, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { getGuestId } from '@/lib/guest-identity'
import { PhaseIndicator } from '@/components/game/PhaseIndicator'
import { PlayerAvatar } from '@/components/game/PlayerAvatar'
import { GameChat } from '@/components/game/GameChat'
import { ActionPanel } from '@/components/game/ActionPanel'
import { GameOverOverlay } from '@/components/game/GameOverOverlay'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageCircle, Zap } from 'lucide-react'
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

  const submitAction = useMutation(api.gameActions.submitAction)
  const sendMessage = useMutation(api.gameChat.sendMessage)

  const [selectedPlayerId, setSelectedPlayerId] = useState<Id<'players'> | null>(null)
  const [hasActed, setHasActed] = useState(false)
  const [activeTab, setActiveTab] = useState('action')

  useEffect(() => {
    setSelectedPlayerId(null)
    setHasActed(false)
  }, [game?.phase, game?.turnNumber])

  const selectedPlayer = players?.find((p) => p._id === selectedPlayerId)

  const handlePlayerSelect = useCallback(
    (playerId: Id<'players'>) => {
      if (!game || !myPlayer || !myPlayer.isAlive) return
      const target = players?.find((p) => p._id === playerId)
      if (!target || !target.isAlive) return
      if (playerId === myPlayer._id && game.phase !== 'night') return
      if (game.phase === 'night' && myPlayer.role === 'wolf' && target.team === 'bad') return

      setSelectedPlayerId((prev) => (prev === playerId ? null : playerId))
    },
    [game, myPlayer, players]
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
      // action failed silently
    }
  }, [game, myPlayer, selectedPlayerId, hasActed, submitAction])

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
        // send failed silently
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

  const canAct =
    myPlayer.isAlive &&
    ((game.phase === 'night' && myPlayer.role !== 'villager') ||
      game.phase === 'voting')

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
          <RoleBadge role={myPlayer.role} />
        </div>
      )}

      <div className="shrink-0 px-4 py-2">
        <div className="flex flex-wrap justify-center gap-2">
          {players.map((player) => (
            <PlayerAvatar
              key={player._id}
              name={player.name}
              isAlive={player.isAlive}
              isHost={player.isHost}
              isSelected={selectedPlayerId === player._id}
              isCurrentPlayer={player._id === myPlayer._id}
              onClick={
                player._id !== myPlayer._id && player.isAlive
                  ? () => handlePlayerSelect(player._id)
                  : undefined
              }
              size="sm"
            />
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-1 flex-col"
        >
          <TabsList className="mx-4 grid w-auto grid-cols-2 bg-secondary">
            <TabsTrigger
              value="action"
              className="gap-1.5 font-display text-xs font-semibold data-[state=active]:bg-card"
            >
              <Zap className="h-3.5 w-3.5" />
              Action
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="gap-1.5 font-display text-xs font-semibold data-[state=active]:bg-card"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
              {currentChannel === 'wolves' && (
                <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-wolf-red" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="action" className="mt-0 flex-1">
            <ActionPanel
              role={myPlayer.role || 'villager'}
              phase={game.phase}
              isAlive={myPlayer.isAlive}
              selectedPlayerName={selectedPlayer?.name}
              selectedPlayerId={selectedPlayerId || undefined}
              onAction={handleAction}
              hasActed={hasActed}
              seerResult={seerResult}
            />
          </TabsContent>

          <TabsContent value="chat" className="mt-0 flex-1" style={{ minHeight: 0 }}>
            <div className="flex h-full flex-col">
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { bg: string; text: string; icon: string }> = {
    wolf: { bg: 'bg-wolf-red/20 border-wolf-red/40', text: 'text-wolf-red', icon: '🐺' },
    seer: { bg: 'bg-seer-blue/20 border-seer-blue/40', text: 'text-seer-blue', icon: '🔮' },
    doctor: { bg: 'bg-doctor-green/20 border-doctor-green/40', text: 'text-doctor-green', icon: '💊' },
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
    </div>
  )
}
