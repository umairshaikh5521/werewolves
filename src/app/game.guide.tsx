import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Shield, Skull } from 'lucide-react'
import { cn } from '@/lib/utils'
import { roleConfig } from '@/lib/role-config'

export const Route = createFileRoute('/game/guide')({ component: GameGuide })

const roleOrder = ['wolf', 'seer', 'doctor', 'gunner', 'detective', 'villager'] as const

function GameGuide() {
  const navigate = useNavigate()

  return (
    <div className="stars-bg min-h-[100dvh] px-4 py-6">
      <div className="mx-auto max-w-lg">
        <button
          onClick={() => navigate({ to: '/game' })}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-display font-semibold">Back</span>
        </button>

        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <span className="text-3xl">🌕</span>
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Game Guide</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Learn about each role and their abilities
          </p>
        </div>

        <div className="mb-8 rounded-2xl border-2 border-border bg-card p-4">
          <h2 className="mb-3 font-display text-lg font-bold text-foreground">How to Play</h2>
          <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>
              Moonrise is a game of deception and deduction. The village is divided into two teams:
              the <span className="font-semibold text-village-green">Villagers</span> and the <span className="font-semibold text-wolf-red">Werewolves</span>.
            </p>
            <p>
              The game alternates between <span className="font-semibold text-moon-gold">Day</span> and <span className="font-semibold text-seer-blue">Night</span> phases. During the day, players discuss and vote to eliminate suspects. At night, werewolves choose a victim while special roles use their abilities.
            </p>
            <p>
              The village wins by eliminating all werewolves. The werewolves win when they equal or outnumber the villagers.
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Roles
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-4 pb-8">
          {roleOrder.map((roleKey) => {
            const role = roleConfig[roleKey]
            if (!role) return null
            return (
              <div
                key={roleKey}
                className={cn(
                  'overflow-hidden rounded-2xl border-2 bg-card transition-all',
                  role.border
                )}
              >
                <div className={cn('flex items-center gap-4 p-4', role.bg)}>
                  <div
                    className={cn(
                      'flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2',
                      role.border,
                      'bg-black/10'
                    )}
                  >
                    {role.image ? (
                      <img
                        src={role.image}
                        alt={role.title}
                        className="h-16 w-16 object-contain drop-shadow-md"
                      />
                    ) : (
                      <span className="font-display text-2xl text-muted-foreground">?</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={cn('font-display text-xl font-bold', role.color)}>
                        {role.title}
                      </h3>
                      {role.team === 'evil' ? (
                        <Skull className="h-4 w-4 text-wolf-red" />
                      ) : (
                        <Shield className="h-4 w-4 text-village-green" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        role.team === 'evil'
                          ? 'bg-wolf-red/20 text-wolf-red'
                          : 'bg-village-green/20 text-village-green'
                      )}
                    >
                      {role.team === 'evil' ? 'Werewolf Team' : 'Village Team'}
                    </span>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-3">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {role.ability}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
