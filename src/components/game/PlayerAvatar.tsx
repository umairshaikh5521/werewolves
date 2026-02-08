import { cn } from '@/lib/utils'
import { Skull, Crown, User, Check } from 'lucide-react'
import { getPlayerColor } from '@/lib/role-config'

interface PlayerAvatarProps {
  name: string
  isAlive: boolean
  isHost?: boolean
  isSelected?: boolean
  isCurrentPlayer?: boolean
  isReady?: boolean
  showReadyStatus?: boolean
  hasVoted?: boolean
  role?: string
  showRole?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
  playerIndex?: number
}

const roleColors: Record<string, string> = {
  wolf: 'bg-wolf-red/20 border-wolf-red',
  kittenWolf: 'bg-amber-500/20 border-amber-500',
  seer: 'bg-seer-blue/20 border-seer-blue',
  doctor: 'bg-doctor-green/20 border-doctor-green',
  gunner: 'bg-moon-gold/20 border-moon-gold',
  detective: 'bg-moon-gold/20 border-moon-gold',
  villager: 'bg-secondary border-border',
}

const roleIcons: Record<string, string> = {
  wolf: '🐺',
  kittenWolf: '🐱',
  seer: '🔮',
  doctor: '💊',
  gunner: '🔫',
  detective: '🕵️',
  villager: '🏠',
}

export function PlayerAvatar({
  name,
  isAlive,
  isHost,
  isSelected,
  isCurrentPlayer,
  isReady,
  showReadyStatus,
  hasVoted,
  role,
  showRole,
  onClick,
  size = 'md',
  playerIndex = 0,
}: PlayerAvatarProps) {
  const sizeClasses = {
    sm: 'w-16 h-20',
    md: 'w-20 h-24',
    lg: 'w-24 h-28',
  }

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 rounded-2xl border-2 p-2 transition-all',
        sizeClasses[size],
        isAlive ? 'border-border bg-card' : 'border-dead-gray/50 bg-dead-gray/20 opacity-60',
        isSelected && isAlive && 'border-primary animate-pulse-glow',
        isCurrentPlayer && isAlive && 'ring-2 ring-moon-gold/40',
        onClick && isAlive && 'cursor-pointer hover:border-primary/60 active:scale-95',
        !onClick && 'cursor-default'
      )}
    >
      {isHost && (
        <Crown className="absolute -top-2 -right-1 h-4 w-4 text-moon-gold" />
      )}

      {showReadyStatus && (isReady || isHost) && (
        <div className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}

      {hasVoted && (
        <div className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}

      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full border',
          showRole && role
            ? roleColors[role]
            : isAlive
              ? 'bg-secondary border-border'
              : 'bg-dead-gray/30 border-dead-gray/50'
        )}
      >
        {showRole && role ? (
          <span className="text-sm">{roleIcons[role]}</span>
        ) : !isAlive ? (
          <Skull className="h-4 w-4 text-dead-gray" />
        ) : (
          <User className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <span
        className={cn(
          'max-w-full truncate text-xs font-semibold',
          isCurrentPlayer && isAlive
            ? 'text-moon-gold'
            : isAlive
              ? getPlayerColor(playerIndex)
              : 'text-dead-gray line-through'
        )}
      >
        {isCurrentPlayer ? 'YOU' : name}
      </span>

      {showRole && role && (
        <span className="text-[10px] capitalize text-muted-foreground">{role}</span>
      )}
    </button>
  )
}
