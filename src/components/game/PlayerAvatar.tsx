import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Skull, Crown, User, Check } from 'lucide-react'
import { getPlayerColor } from '@/lib/role-config'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

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
  size?: 'xs' | 'sm' | 'md' | 'lg'
  playerIndex?: number
  isWolfTeammate?: boolean
  isSelfWolf?: boolean
}

const roleColors: Record<string, string> = {
  wolf: 'bg-wolf-red/20 border-wolf-red',
  kittenWolf: 'bg-amber-500/20 border-amber-500',
  shadowWolf: 'bg-violet-500/20 border-violet-500',
  seer: 'bg-seer-blue/20 border-seer-blue',
  doctor: 'bg-doctor-green/20 border-doctor-green',
  gunner: 'bg-moon-gold/20 border-moon-gold',
  detective: 'bg-moon-gold/20 border-moon-gold',
  hunter: 'bg-orange-500/20 border-orange-500',
  revenant: 'bg-teal-400/20 border-teal-400',
  villager: 'bg-secondary border-border',
}

const roleIcons: Record<string, string> = {
  wolf: '🐺',
  kittenWolf: '🐱',
  shadowWolf: '👤',
  seer: '🔮',
  doctor: '💊',
  gunner: '🔫',
  detective: '🕵️',
  hunter: '🏹',
  revenant: '👻',
  villager: '🏠',
}

const wolfIcons: Record<string, string> = {
  wolf: '/assets/icons/werewolf-icon.webp',
  kittenWolf: '/assets/icons/kitten-wolf-icon.webp',
  shadowWolf: '/assets/icons/shadow-wolf-icon.webp',
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
  isWolfTeammate = false,
  isSelfWolf = false,
}: PlayerAvatarProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false)

  const sizeClasses = {
    xs: 'w-full h-[4.5rem]',
    sm: 'w-full h-20',
    md: 'w-20 h-24',
    lg: 'w-24 h-28',
  }

  const avatarSizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }

  const textSizeClasses = {
    xs: 'text-[10px]',
    sm: 'text-[11px]',
    md: 'text-xs',
    lg: 'text-sm',
  }

  const iconSizeClasses = {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  return (
    <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
      <TooltipTrigger asChild>
        <button
          onClick={() => {
            setTooltipOpen(true)
            setTimeout(() => setTooltipOpen(false), 2000)
            onClick?.()
          }}
          disabled={!onClick}
          className={cn(
            'relative flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 p-1.5 transition-all',
            sizeClasses[size],
            isWolfTeammate && isAlive
              ? 'border-[#EF4444] bg-[#EF4444]/10 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
              : showReadyStatus && !(isReady || isHost)
                ? 'border-red-500 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.35)] animate-pulse'
                : showReadyStatus && (isReady || isHost)
                  ? 'border-green-500 bg-green-500/5'
                  : isAlive
                    ? 'border-border bg-card'
                    : 'border-dead-gray/50 bg-dead-gray/20 opacity-60',
            isSelected && isAlive && 'border-primary animate-pulse-glow',
            isCurrentPlayer && isAlive && 'ring-2 ring-moon-gold/40',
            onClick && isAlive && 'cursor-pointer hover:border-primary/60 active:scale-95',
            !onClick && 'cursor-default'
          )}
        >
          {isHost && (
            <Crown className="absolute -top-2 -right-1 h-4 w-4 text-moon-gold" />
          )}



          {hasVoted && (
            <div className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}

          <div
            className={cn(
              'flex items-center justify-center rounded-full border',
              avatarSizeClasses[size],
              showRole && role
                ? roleColors[role]
                : (isWolfTeammate || isSelfWolf) && isAlive
                  ? 'bg-wolf-red/20 border-wolf-red'
                  : isAlive
                    ? 'bg-secondary border-border'
                    : 'bg-dead-gray/30 border-dead-gray/50'
            )}
          >
            {showRole && role && wolfIcons[role] ? (
              <img
                src={wolfIcons[role]}
                alt={role}
                className={cn('object-contain opacity-90', size === 'xs' ? 'h-5 w-5' : size === 'sm' ? 'h-6 w-6' : 'h-7 w-7')}
              />
            ) : showRole && role ? (
              <span className={iconSizeClasses[size]}>{roleIcons[role]}</span>
            ) : (isWolfTeammate || isSelfWolf) && isAlive && role && wolfIcons[role] ? (
              <img
                src={wolfIcons[role]}
                alt={role}
                className={cn('object-contain opacity-90', size === 'xs' ? 'h-5 w-5' : size === 'sm' ? 'h-6 w-6' : 'h-7 w-7')}
              />
            ) : (isWolfTeammate || isSelfWolf) && isAlive ? (
              <span className={iconSizeClasses[size]}>{role === 'kittenWolf' ? '🐾' : role === 'shadowWolf' ? '👤' : '🐺'}</span>
            ) : !isAlive ? (
              <Skull className={cn(size === 'xs' ? 'h-3 w-3' : 'h-4 w-4', 'text-dead-gray')} />
            ) : (
              <User className={cn(size === 'xs' ? 'h-3 w-3' : 'h-4 w-4', 'text-muted-foreground')} />
            )}
          </div>

          <span
            className={cn(
              'max-w-full truncate font-semibold',
              textSizeClasses[size],
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
            <span className={cn('capitalize text-muted-foreground', size === 'xs' ? 'text-[8px]' : 'text-[10px]')}>
              {role === 'kittenWolf' ? 'Kitten Wolf' : role === 'shadowWolf' ? 'Shadow Wolf' : role}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        <span className="font-semibold">{name}</span>
        {showRole && role && <span className="ml-1 capitalize text-muted-foreground">({role})</span>}
      </TooltipContent>
    </Tooltip>
  )
}
