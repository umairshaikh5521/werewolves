import { useState } from 'react'
import { cn } from '@/lib/utils'
import { roleConfig } from '@/lib/role-config'

interface RoleRevealProps {
  role: string
  onDismiss: () => void
  skipReveal?: boolean
}

export function RoleReveal({ role, onDismiss, skipReveal }: RoleRevealProps) {
  const [stage, setStage] = useState<'reveal' | 'shown'>(skipReveal ? 'shown' : 'reveal')
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

            <div className="flex items-center justify-center">
              {config.image ? (
                <img
                  src={config.image}
                  alt={config.title}
                  className="h-52 w-52 object-contain drop-shadow-[0_0_30px_rgba(245,166,35,0.3)]"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-black/20">
                  <span className="font-display text-3xl">?</span>
                </div>
              )}
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
                config.btnColor
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
