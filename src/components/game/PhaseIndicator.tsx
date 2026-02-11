import { cn } from '@/lib/utils'
import { Moon, Sun, Vote, Target } from 'lucide-react'
import { useGameTimer } from '@/hooks/use-game-timer'

interface PhaseIndicatorProps {
  phase: 'night' | 'day' | 'voting' | 'hunter_revenge'
  phaseEndTime: number
  turnNumber: number
  role?: string
  bullets?: number
  onRoleClick?: () => void
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
  hunter_revenge: {
    label: 'Hunter',
    icon: Target,
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    iconColor: 'text-orange-500',
    timerColor: 'text-orange-500',
  },
}

export function PhaseIndicator({ phase, phaseEndTime, turnNumber, role, bullets, onRoleClick }: PhaseIndicatorProps) {
  const timeLeft = useGameTimer(phaseEndTime)
  const config = phaseConfig[phase]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'relative flex items-center justify-between rounded-xl border-2 px-3 py-2',
        config.bg,
        config.border
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', config.iconColor)} />
        <span className="font-display text-xs font-semibold uppercase tracking-wide text-foreground">
          {config.label} {turnNumber}
        </span>
      </div>

      {role && (
        <button onClick={onRoleClick} className="absolute left-1/2 -translate-x-1/2">
          <RoleBadgeInline role={role} bullets={bullets} />
        </button>
      )}

      <div
        className={cn(
          'font-display text-xl font-bold tabular-nums',
          config.timerColor,
          timeLeft <= 5 && 'animate-pulse'
        )}
      >
        {timeLeft > 0 ? `${timeLeft}s` : '...'}
      </div>
    </div>
  )
}

const roleStyles: Record<string, { bg: string; text: string; icon: string; image?: string }> = {
  wolf: { bg: 'bg-wolf-red/20 border-wolf-red/40', text: 'text-wolf-red', icon: '🐺', image: '/assets/icons/werewolf-icon.webp' },
  kittenWolf: { bg: 'bg-amber-500/20 border-amber-500/40', text: 'text-amber-500', icon: '🐾', image: '/assets/icons/kitten-wolf-icon.webp' },
  shadowWolf: { bg: 'bg-violet-500/20 border-violet-500/40', text: 'text-violet-500', icon: '👤', image: '/assets/icons/shadow-wolf-icon.webp' },
  seer: { bg: 'bg-seer-blue/20 border-seer-blue/40', text: 'text-seer-blue', icon: '🔮', image: '/assets/icons/seer-icon.webp' },
  doctor: { bg: 'bg-doctor-green/20 border-doctor-green/40', text: 'text-doctor-green', icon: '💊', image: '/assets/icons/doctor-icon.webp' },
  gunner: { bg: 'bg-moon-gold/20 border-moon-gold/40', text: 'text-moon-gold', icon: '🔫', image: '/assets/icons/gunner-icon.webp' },
  detective: { bg: 'bg-moon-gold/20 border-moon-gold/40', text: 'text-moon-gold', icon: '🕵️', image: '/assets/icons/detective-icon.webp' },
  hunter: { bg: 'bg-orange-500/20 border-orange-500/40', text: 'text-orange-500', icon: '🏹', image: '/assets/icons/hunter-icon.webp' },
  revenant: { bg: 'bg-teal-400/20 border-teal-400/40', text: 'text-teal-400', icon: '👻', image: '/assets/icons/revenant-icon.webp' },
  villager: { bg: 'bg-secondary border-border', text: 'text-secondary-foreground', icon: '🏠', image: '/assets/icons/villager-icon.webp' },
}

function RoleBadgeInline({ role, bullets }: { role: string; bullets?: number }) {
  const c = roleStyles[role] || roleStyles.villager
  return (
    <div className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 ${c.bg}`}>
      {c.image ? (
        <img src={c.image} alt={role} className="h-3 w-3 object-contain opacity-90" />
      ) : (
        <span className="text-[10px]">{c.icon}</span>
      )}
      <span className={`font-display text-[10px] font-semibold capitalize ${c.text}`}>
        {role === 'kittenWolf' ? 'Kitten' : role === 'shadowWolf' ? 'Shadow' : role}
      </span>
      {role === 'gunner' && bullets !== undefined && (
        <span className="text-[9px] text-muted-foreground">x{bullets}</span>
      )}
    </div>
  )
}
