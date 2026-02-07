import { useState } from 'react'
import { cn } from '@/lib/utils'

interface RoleRevealProps {
  role: string
  onDismiss: () => void
}

const roleConfig: Record<string, { color: string; bg: string; border: string; title: string; description: string }> = {
  wolf: {
    color: 'text-wolf-red',
    bg: 'bg-wolf-red/10',
    border: 'border-wolf-red/30',
    title: 'Werewolf',
    description: 'Eliminate villagers under the cover of night. Blend in during the day.',
  },
  seer: {
    color: 'text-seer-blue',
    bg: 'bg-seer-blue/10',
    border: 'border-seer-blue/30',
    title: 'Seer',
    description: 'Each night, reveal the true nature of one player. Use your visions wisely.',
  },
  doctor: {
    color: 'text-doctor-green',
    bg: 'bg-doctor-green/10',
    border: 'border-doctor-green/30',
    title: 'Doctor',
    description: 'Protect one player each night from the wolves. You can even save yourself.',
  },
  villager: {
    color: 'text-foreground',
    bg: 'bg-secondary',
    border: 'border-border',
    title: 'Villager',
    description: 'Find the wolves among you. Discuss, deduce, and vote to protect the village.',
  },
}

export function RoleReveal({ role, onDismiss }: RoleRevealProps) {
  const [stage, setStage] = useState<'reveal' | 'shown'>('reveal')
  const config = roleConfig[role] || roleConfig.villager

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 px-6">
        {stage === 'reveal' ? (
          <div className="animate-fade-in flex flex-col items-center gap-6">
            <p className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Your role is...
            </p>
            <button
              onClick={() => setStage('shown')}
              className="group relative flex h-40 w-40 items-center justify-center"
            >
              <div className="absolute inset-0 animate-pulse rounded-3xl border-2 border-dashed border-muted-foreground/30" />
              <span className="font-display text-sm font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
                Tap to reveal
              </span>
            </button>
          </div>
        ) : (
          <div className="animate-scale-in flex flex-col items-center gap-6">
            <p className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              You are
            </p>

            <div
              className={cn(
                'flex h-40 w-40 items-center justify-center rounded-3xl border-2',
                config.bg,
                config.border
              )}
            >
              {/* Asset placeholder - will be replaced with role artwork */}
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-black/20">
                <span className="text-xs text-muted-foreground">Role Art</span>
              </div>
            </div>

            <h2 className={cn('font-display text-3xl font-bold', config.color)}>
              {config.title}
            </h2>

            <p className="text-center text-sm leading-relaxed text-muted-foreground">
              {config.description}
            </p>

            <button
              onClick={onDismiss}
              className={cn(
                'game-btn mt-2 w-full max-w-xs py-3.5 text-sm font-semibold text-white',
                role === 'wolf' && 'bg-wolf-red hover:bg-wolf-red/90',
                role === 'seer' && 'bg-seer-blue hover:bg-seer-blue/90',
                role === 'doctor' && 'bg-doctor-green hover:bg-doctor-green/90',
                role === 'villager' && 'bg-primary hover:bg-primary/90'
              )}
            >
              I understand my role
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
