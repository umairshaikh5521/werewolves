import { cn } from '@/lib/utils'
import { PlayerAvatar } from './PlayerAvatar'

interface Player {
  _id: string
  name: string
  role?: string
  team?: string
  isAlive: boolean
  isHost: boolean
}

interface GameOverOverlayProps {
  winningTeam: string
  endReason?: string
  players: Player[]
  onBackToHome: () => void
  onBackToLobby?: () => void
  onBackToRoom?: () => void
  isHost?: boolean
  isResetting?: boolean
}

export function GameOverOverlay({
  winningTeam,
  endReason,
  players,
  onBackToHome,
  onBackToLobby,
  onBackToRoom,
  isHost,
  isResetting,
}: GameOverOverlayProps) {
  const isVillageWin = winningTeam === 'good'

  const iconBg = isVillageWin ? 'bg-village-green/20' : 'bg-wolf-red/20'
  const icon = isVillageWin ? '🏘️' : '🐺'
  const titleColor = isVillageWin ? 'text-village-green' : 'text-wolf-red'
  const title = isVillageWin ? 'Village Wins!' : 'Werewolves Win!'
  const fallbackReason = isVillageWin
    ? 'All the wolves have been eliminated'
    : 'The wolves have overtaken the village'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-background/95 p-6 py-10 backdrop-blur-sm">
      <div className="animate-bounce-in flex w-full max-w-sm flex-col items-center gap-6">
        <div
          className={cn(
            'flex h-24 w-24 items-center justify-center rounded-full',
            iconBg
          )}
        >
          <span className="text-5xl">{icon}</span>
        </div>

        <div className="text-center">
          <h1
            className={cn(
              'font-display text-3xl font-bold',
              titleColor
            )}
          >
            {title}
          </h1>
          <p className="mt-2 text-sm font-medium text-foreground">
            {endReason || fallbackReason}
          </p>
        </div>

        <div className="w-full space-y-3">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Role Reveal
          </p>
          <div className="grid grid-cols-4 gap-3">
            {players.map((player, index) => (
              <PlayerAvatar
                key={player._id}
                name={player.name}
                isAlive={player.isAlive}
                role={player.role}
                showRole
                size="md"
                playerIndex={index}
              />
            ))}
          </div>
        </div>

        <div className="flex w-full flex-col gap-2">
          {isHost && onBackToLobby && (
            <button
              onClick={onBackToLobby}
              disabled={isResetting}
              className="game-btn w-full bg-primary py-3.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isResetting ? 'Returning to Lobby...' : 'Play Again'}
            </button>
          )}
          {!isHost && onBackToRoom && (
            <>
              <button
                onClick={onBackToRoom}
                className="game-btn w-full bg-primary py-3.5 text-sm text-primary-foreground hover:bg-primary/90"
              >
                Back to Room
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Waiting for host to start a new game...
              </p>
            </>
          )}
          <button
            onClick={onBackToHome}
            className="game-btn w-full bg-secondary py-3.5 text-sm text-secondary-foreground hover:bg-secondary/80"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  )
}
