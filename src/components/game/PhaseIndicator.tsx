import { cn } from '@/lib/utils'
import { Moon, Sun, Vote } from 'lucide-react'
import { useGameTimer } from '@/hooks/use-game-timer'

interface PhaseIndicatorProps {
  phase: 'night' | 'day' | 'voting'
  phaseEndTime: number
  turnNumber: number
}

const phaseConfig = {
  night: {
    label: 'Night',
    icon: Moon,
    bg: 'bg-night-blue',
    border: 'border-seer-blue/30',
    iconColor: 'text-seer-blue',
    timerColor: 'text-seer-blue',
  },
  day: {
    label: 'Day',
    icon: Sun,
    bg: 'bg-moon-gold/10',
    border: 'border-moon-gold/30',
    iconColor: 'text-moon-gold',
    timerColor: 'text-moon-gold',
  },
  voting: {
    label: 'Vote',
    icon: Vote,
    bg: 'bg-wolf-red/10',
    border: 'border-wolf-red/30',
    iconColor: 'text-wolf-red',
    timerColor: 'text-wolf-red',
  },
}

export function PhaseIndicator({ phase, phaseEndTime, turnNumber }: PhaseIndicatorProps) {
  const timeLeft = useGameTimer(phaseEndTime)
  const config = phaseConfig[phase]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-2xl border-2 px-4 py-2.5',
        config.bg,
        config.border
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn('h-5 w-5', config.iconColor)} />
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-foreground">
          {config.label} {turnNumber}
        </span>
      </div>
      <div
        className={cn(
          'font-display text-2xl font-bold tabular-nums',
          config.timerColor,
          timeLeft <= 5 && 'animate-pulse'
        )}
      >
        {timeLeft > 0 ? `${timeLeft}s` : '...'}
      </div>
    </div>
  )
}
