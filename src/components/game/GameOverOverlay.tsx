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
  players: Player[]
  onBackToHome: () => void
  onBackToLobby?: () => void
  isHost?: boolean
  isResetting?: boolean
}

export function GameOverOverlay({
  winningTeam,
  players,
  onBackToHome,
  onBackToLobby,
  isHost,
  isResetting,
}: GameOverOverlayProps) {
  const isVillageWin = winningTeam === 'good'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 p-6 backdrop-blur-sm">
      <div className="animate-bounce-in flex max-w-sm flex-col items-center gap-6">
        <div
          className={cn(
            'flex h-24 w-24 items-center justify-center rounded-full',
            isVillageWin ? 'bg-village-green/20' : 'bg-wolf-red/20'
          )}
        >
          <span className="text-5xl">{isVillageWin ? '🏘️' : '🐺'}</span>
        </div>

        <div className="text-center">
          <h1
            className={cn(
              'font-display text-3xl font-bold',
              isVillageWin ? 'text-village-green' : 'text-wolf-red'
            )}
          >
            {isVillageWin ? 'Village Wins!' : 'Werewolves Win!'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isVillageWin
              ? 'All the wolves have been eliminated'
              : 'The wolves have overtaken the village'}
          </p>
        </div>

        <div className="w-full space-y-2">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Role Reveal
          </p>
          <div className="grid grid-cols-4 gap-2">
            {players.map((player) => (
              <PlayerAvatar
                key={player._id}
                name={player.name}
                isAlive={player.isAlive}
                role={player.role}
                showRole
                size="sm"
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
          {!isHost && (
            <p className="text-center text-xs text-muted-foreground">
              Waiting for host to start a new game...
            </p>
          )}
          <button
            onClick={onBackToHome}
            className={cn(
              'game-btn w-full py-3.5 text-sm',
              isHost
                ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  )
}
