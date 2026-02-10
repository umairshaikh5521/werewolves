import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Shield, Skull, Users, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { roleConfig } from '@/lib/role-config'

export const Route = createFileRoute('/game/guide')({ component: GameGuide })

const roleOrder = ['shadowWolf', 'hunter', 'jester', 'wolf', 'kittenWolf', 'seer', 'doctor', 'gunner', 'detective', 'villager'] as const

const roleDistribution = [
  { players: 5, wolves: 1, kittenWolf: 0, shadowWolf: 0, seer: 1, doctor: 1, gunner: 0, detective: 0, hunter: 0, jester: 0, villagers: 2 },
  { players: 6, wolves: 1, kittenWolf: 0, shadowWolf: 0, seer: 1, doctor: 1, gunner: 1, detective: 0, hunter: 0, jester: 0, villagers: 2 },
  { players: 7, wolves: 2, kittenWolf: 0, shadowWolf: 0, seer: 1, doctor: 1, gunner: 1, detective: 0, hunter: 1, jester: 0, villagers: 1 },
  { players: 8, wolves: 1, kittenWolf: 0, shadowWolf: 1, seer: 1, doctor: 1, gunner: 1, detective: 1, hunter: 1, jester: 0, villagers: 1 },
  { players: 9, wolves: 1, kittenWolf: 1, shadowWolf: 0, seer: 1, doctor: 1, gunner: 1, detective: 0, hunter: 1, jester: 1, villagers: 2 },
  { players: 10, wolves: 0, kittenWolf: 1, shadowWolf: 1, seer: 1, doctor: 1, gunner: 1, detective: 1, hunter: 1, jester: 1, villagers: 2 },
  { players: 11, wolves: 0, kittenWolf: 1, shadowWolf: 1, seer: 1, doctor: 1, gunner: 1, detective: 1, hunter: 1, jester: 1, villagers: 3 },
  { players: 12, wolves: 0, kittenWolf: 1, shadowWolf: 1, seer: 1, doctor: 1, gunner: 1, detective: 1, hunter: 1, jester: 1, villagers: 4 },
]

function GameGuide() {
  const navigate = useNavigate()

  return (
    <div className="stars-bg min-h-[100dvh] px-4 py-6">
      <div className="mx-auto max-w-2xl">
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

        <div className="mb-8 rounded-2xl border-2 border-border bg-card p-4 sm:p-6">
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
            <p>
              <span className="font-semibold text-foreground">Round Limit:</span> The game automatically ends after <span className="font-semibold text-moon-gold">10 rounds</span>. If neither team has won by then, the team with more surviving members wins.
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border-2 border-border bg-card p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-foreground">Role Distribution</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Roles are assigned based on the number of players in the game.
          </p>

          <div className="hidden sm:block">
            <div className="overflow-x-auto overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-2 py-2.5 text-left font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">Players</th>
                    <th className="px-2 py-2.5 text-center font-display text-xs font-bold uppercase tracking-wider text-wolf-red">Wolves</th>
                    <th className="px-2 py-2.5 text-center font-display text-xs font-bold uppercase tracking-wider text-amber-500">Kitten</th>
                    <th className="px-2 py-2.5 text-center font-display text-xs font-bold uppercase tracking-wider text-violet-500">Shadow</th>
                    <th className="px-2 py-2.5 text-center font-display text-xs font-bold uppercase tracking-wider text-seer-blue">Seer</th>
                    <th className="px-2 py-2.5 text-center font-display text-xs font-bold uppercase tracking-wider text-doctor-green">Doctor</th>
                    <th className="px-2 py-2.5 text-center font-display text-xs font-bold uppercase tracking-wider text-moon-gold">Gunner</th>
                    <th className="px-2 py-2.5 text-center font-display text-xs font-bold uppercase tracking-wider text-moon-gold">Detective</th>
                    <th className="px-2 py-2.5 text-center font-display text-xs font-bold uppercase tracking-wider text-orange-500">Hunter</th>
                    <th className="px-2 py-2.5 text-center font-display text-xs font-bold uppercase tracking-wider text-fuchsia-500">Jester</th>
                    <th className="px-2 py-2.5 text-center font-display text-xs font-bold uppercase tracking-wider text-foreground">Villagers</th>
                  </tr>
                </thead>
                <tbody>
                  {roleDistribution.map((row) => (
                    <tr key={row.players} className="border-b border-border/50 last:border-0">
                      <td className="px-2 py-2.5 font-display font-bold text-foreground">{row.players}</td>
                      <td className="px-2 py-2.5 text-center font-semibold text-wolf-red">{row.wolves}</td>
                      <td className="px-2 py-2.5 text-center font-semibold text-amber-500">{row.kittenWolf || '-'}</td>
                      <td className="px-2 py-2.5 text-center font-semibold text-violet-500">{row.shadowWolf || '-'}</td>
                      <td className="px-2 py-2.5 text-center font-semibold text-seer-blue">{row.seer}</td>
                      <td className="px-2 py-2.5 text-center font-semibold text-doctor-green">{row.doctor}</td>
                      <td className="px-2 py-2.5 text-center font-semibold text-moon-gold">{row.gunner || '-'}</td>
                      <td className="px-2 py-2.5 text-center font-semibold text-moon-gold">{row.detective || '-'}</td>
                      <td className="px-2 py-2.5 text-center font-semibold text-orange-500">{row.hunter || '-'}</td>
                      <td className="px-2 py-2.5 text-center font-semibold text-fuchsia-500">{row.jester || '-'}</td>
                      <td className="px-2 py-2.5 text-center font-semibold text-foreground">{row.villagers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 sm:hidden">
            {roleDistribution.map((row) => (
              <div key={row.players} className="rounded-xl border border-border bg-secondary/30 p-3">
                <p className="mb-2 font-display text-sm font-bold text-primary">{row.players} Players</p>
                <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Wolves</span>
                    <span className="font-bold text-wolf-red">{row.wolves}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Kitten</span>
                    <span className="font-bold text-amber-500">{row.kittenWolf || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Shadow</span>
                    <span className="font-bold text-violet-500">{row.shadowWolf || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Seer</span>
                    <span className="font-bold text-seer-blue">{row.seer}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Doctor</span>
                    <span className="font-bold text-doctor-green">{row.doctor}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Gunner</span>
                    <span className="font-bold text-moon-gold">{row.gunner || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Detective</span>
                    <span className="font-bold text-moon-gold">{row.detective || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Hunter</span>
                    <span className="font-bold text-orange-500">{row.hunter || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Jester</span>
                    <span className="font-bold text-fuchsia-500">{row.jester || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Villagers</span>
                    <span className="font-bold text-foreground">{row.villagers}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div id="roles" className="mb-4 flex items-center gap-3 scroll-mt-20">
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
            const isNew = ['jester', 'hunter', 'shadowWolf'].includes(roleKey)

            return (
              <div
                key={roleKey}
                className={cn(
                  'overflow-hidden rounded-2xl border-2 bg-card transition-all',
                  role.border
                )}
              >
                <div className={cn('flex flex-col items-center gap-3 px-4 pt-5 sm:flex-row sm:gap-5 sm:pt-4', role.bg)}>
                  <div className="shrink-0">
                    {role.image ? (
                      <img
                        src={role.image}
                        alt={role.title}
                        className="h-28 w-28 object-contain drop-shadow-lg sm:h-24 sm:w-24"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center">
                        <span className="font-display text-4xl text-muted-foreground">?</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-3 text-center sm:pb-4 sm:text-left">
                    <div className="flex items-center justify-center gap-2 sm:justify-start">
                      <h3 className={cn('font-display text-xl font-bold', role.color)}>
                        {role.title}
                      </h3>
                      {isNew && (
                        <span className="animate-pulse rounded bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                          NEW
                        </span>
                      )}
                      {role.team === 'evil' ? (
                        <Skull className="h-4 w-4 text-wolf-red" />
                      ) : role.team === 'neutral' ? (
                        <Sparkles className="h-4 w-4 text-fuchsia-500" />
                      ) : (
                        <Shield className="h-4 w-4 text-village-green" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        role.team === 'evil'
                          ? 'bg-wolf-red/20 text-wolf-red'
                          : role.team === 'neutral'
                            ? 'bg-fuchsia-500/20 text-fuchsia-500'
                            : 'bg-village-green/20 text-village-green'
                      )}
                    >
                      {role.team === 'evil' ? 'Werewolf Team' : role.team === 'neutral' ? 'Neutral' : 'Village Team'}
                    </span>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-3 sm:px-5">
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
