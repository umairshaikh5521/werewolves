import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Crosshair, Eye, ShieldPlus, Vote, Moon, Search, Target } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ActionPanelProps {
  role: string
  phase: 'night' | 'day' | 'voting' | 'hunter_revenge'
  isAlive: boolean
  selectedPlayerName?: string
  selectedPlayerId?: string
  onAction: () => void
  hasActed: boolean
  seerResult?: { targetName: string; team: string } | null
  detectiveResult?: { target1Name: string; target2Name: string; sameTeam: boolean } | null
  bullets?: number
  onShoot?: () => void
  hasShot?: boolean
  selectedPlayerName2?: string
  onInvestigate?: () => void
  lastProtectedId?: string
  selectedPlayerId2?: string
  hasBitten?: boolean
  onConvert?: () => void
  hasConverted?: boolean
  isMuted?: boolean
  onMute?: () => void
  onSkipMute?: () => void
  isHunterRevenge?: boolean
  isHunterRevengePlayer?: boolean
  onHunterRevenge?: () => void
  deadPlayers?: Array<{ _id: string; name: string; role?: string }>
  onAbsorb?: (targetId: any) => void
  turnNumber?: number
}

export function ActionPanel({
  role,
  phase,
  isAlive,
  selectedPlayerName,
  onAction,
  hasActed,
  seerResult,
  detectiveResult,
  bullets,
  onShoot,
  hasShot,
  selectedPlayerName2,
  onInvestigate,
  hasBitten,
  onConvert,
  hasConverted,
  isMuted,
  onMute,
  onSkipMute,
  isHunterRevengePlayer,
  onHunterRevenge,
  deadPlayers,
  onAbsorb,
  turnNumber,
}: ActionPanelProps) {
  const [showBiteConfirm, setShowBiteConfirm] = useState(false)
  const [hasMuted, setHasMuted] = useState(false)

  // Reset mute state when phase changes (new night)
  useEffect(() => { setHasMuted(false) }, [phase])

  // Hunter Revenge phase — only the dying Hunter acts
  if (phase === 'hunter_revenge') {
    if (isHunterRevengePlayer) {
      return (
        <div className="flex flex-col gap-2 px-4 py-3">
          <div className="flex items-center gap-2 text-orange-500">
            <Target className="h-5 w-5 animate-pulse" />
            <span className="font-display text-sm font-semibold">Your Final Shot</span>
          </div>
          <p className="text-xs text-muted-foreground">
            You have fallen. Choose one player to take down with you!
          </p>
          <button
            onClick={onHunterRevenge}
            disabled={!selectedPlayerName}
            className={cn(
              'game-btn w-full py-2.5 text-xs font-semibold disabled:opacity-40',
              'bg-orange-500 hover:bg-orange-500/90 text-white'
            )}
          >
            {selectedPlayerName ? `🏹 Shoot ${selectedPlayerName}` : 'Select a target'}
          </button>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="animate-pulse flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/20">
          <Target className="h-5 w-5 text-orange-500" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-orange-500">
            Hunter's Last Stand
          </p>
          <p className="text-xs text-muted-foreground">
            The Hunter is taking their final shot...
          </p>
        </div>
      </div>
    )
  }

  if (!isAlive) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dead-gray/20">
          <span className="text-lg">💀</span>
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-dead-gray">
            You have been eliminated
          </p>
          <p className="text-xs text-muted-foreground">Watch your team's chat</p>
        </div>
      </div>
    )
  }

  if (phase === 'night') {
    if (role === 'wolf') {
      return (
        <NightAction
          icon={<Crosshair className="h-5 w-5" />}
          title="Choose a victim"
          description="Select a player to eliminate"
          actionLabel={selectedPlayerName ? `Kill ${selectedPlayerName}` : 'Select a target'}
          actionColor="bg-wolf-red hover:bg-wolf-red/90 text-white"
          selectedPlayerName={selectedPlayerName}
          onAction={onAction}
          hasActed={hasActed}
          actedMessage="Kill vote submitted"
        />
      )
    }

    if (role === 'kittenWolf') {
      const canBite = !hasBitten && !hasConverted

      return (
        <div className="flex flex-col gap-2 px-4 py-3">
          <div className="flex items-center gap-2 text-amber-500">
            <FangIcon className="h-4 w-4" />
            <span className="font-display text-xs font-semibold">Kitten Wolf</span>
            <span className="text-[10px] text-muted-foreground">{canBite ? 'Kill or convert' : 'Vote to kill'}</span>
          </div>

          {hasConverted ? (
            <div className="animate-bounce-in rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-500">
              Bite submitted - target will be converted
            </div>
          ) : hasActed ? (
            <div className="animate-bounce-in rounded-lg bg-village-green/20 px-3 py-1.5 text-xs font-semibold text-village-green">
              Kill vote submitted
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={onAction}
                disabled={!selectedPlayerName}
                className={cn(
                  'game-btn flex-1 py-2 text-xs font-semibold disabled:opacity-40',
                  'bg-wolf-red hover:bg-wolf-red/90 text-white'
                )}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Crosshair className="h-3.5 w-3.5" />
                  {selectedPlayerName ? `Kill ${selectedPlayerName}` : 'Select target'}
                </span>
              </button>

              {canBite && (
                <button
                  onClick={() => setShowBiteConfirm(true)}
                  disabled={!selectedPlayerName}
                  className={cn(
                    'game-btn flex-1 py-2 text-xs font-semibold disabled:opacity-40',
                    'bg-amber-500 hover:bg-amber-500/90 text-white',
                    'border border-amber-400/50'
                  )}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <FangIcon className="h-3.5 w-3.5" />
                    {selectedPlayerName ? `Bite ${selectedPlayerName}` : 'Select target'}
                  </span>
                </button>
              )}
            </div>
          )}

          <AlertDialog open={showBiteConfirm} onOpenChange={setShowBiteConfirm}>
            <AlertDialogContent className="border-amber-500/30 bg-background">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-amber-500">Confirm Bite</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>
                    You are about to use your <strong>one-time bite ability</strong> on{' '}
                    <strong className="text-amber-500">{selectedPlayerName}</strong>.
                  </p>
                  <p>
                    This will convert them to the Werewolf team instead of killing anyone tonight.
                  </p>
                  <p className="text-amber-500/80">This ability cannot be undone!</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onConvert?.()
                    setShowBiteConfirm(false)
                  }}
                  className="bg-amber-500 hover:bg-amber-500/90"
                >
                  Bite & Convert
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )
    }

    if (role === 'shadowWolf') {
      return (
        <div className="flex flex-col gap-2 px-4 py-3">
          <div className="flex items-center gap-2 text-violet-500">
            <ShadowIcon className="h-4 w-4" />
            <span className="font-display text-xs font-semibold">Shadow Wolf</span>
            <span className="text-[10px] text-muted-foreground">Kill & silence</span>
          </div>

          {/* Kill action */}
          {hasActed ? (
            <div className="animate-bounce-in rounded-lg bg-village-green/20 px-3 py-1.5 text-xs font-semibold text-village-green">
              Kill vote submitted
            </div>
          ) : (
            <button
              onClick={onAction}
              disabled={!selectedPlayerName}
              className={cn(
                'game-btn w-full py-2 text-xs font-semibold disabled:opacity-40',
                'bg-wolf-red hover:bg-wolf-red/90 text-white'
              )}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Crosshair className="h-3.5 w-3.5" />
                {selectedPlayerName ? `Kill ${selectedPlayerName}` : 'Select target'}
              </span>
            </button>
          )}

          {/* Mute action */}
          <div className="border-t border-border pt-2">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-semibold text-violet-400">🔇 Silence a player</span>
            </div>
            {hasMuted ? (
              <div className="animate-bounce-in rounded-lg bg-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-400">
                Silence target set
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onMute?.()
                    setHasMuted(true)
                  }}
                  disabled={!selectedPlayerName}
                  className={cn(
                    'game-btn flex-1 py-1.5 text-xs font-semibold disabled:opacity-40',
                    'bg-violet-500 hover:bg-violet-500/90 text-white'
                  )}
                >
                  {selectedPlayerName ? `Silence ${selectedPlayerName}` : 'Select target'}
                </button>
                <button
                  onClick={() => {
                    onSkipMute?.()
                    setHasMuted(true)
                  }}
                  className="game-btn px-3 py-1.5 text-xs font-semibold bg-secondary hover:bg-secondary/80 text-muted-foreground"
                >
                  Skip
                </button>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (role === 'seer') {
      return (
        <div className="space-y-3 p-4">
          <NightAction
            icon={<Eye className="h-5 w-5" />}
            title="Reveal a player"
            description="See if they serve the village or the wolves"
            actionLabel={selectedPlayerName ? `Reveal ${selectedPlayerName}` : 'Select a target'}
            actionColor="bg-seer-blue hover:bg-seer-blue/90 text-white"
            selectedPlayerName={selectedPlayerName}
            onAction={onAction}
            hasActed={hasActed}
            actedMessage="Vision submitted"
          />
          {seerResult && (
            <div
              className={cn(
                'animate-bounce-in rounded-2xl border-2 p-4 text-center',
                seerResult.team === 'bad'
                  ? 'border-wolf-red/50 bg-wolf-red/10'
                  : 'border-village-green/50 bg-village-green/10'
              )}
            >
              <p className="font-display text-sm font-semibold text-foreground">
                {seerResult.targetName} is...
              </p>
              <p
                className={cn(
                  'font-display text-xl font-bold',
                  seerResult.team === 'bad' ? 'text-wolf-red' : 'text-village-green'
                )}
              >
                {seerResult.team === 'bad' ? 'A Werewolf!' : 'A Villager'}
              </p>
            </div>
          )}
        </div>
      )
    }

    if (role === 'doctor') {
      return (
        <NightAction
          icon={<ShieldPlus className="h-5 w-5" />}
          title="Protect someone"
          description="Choose a player to save from the wolves"
          actionLabel={selectedPlayerName ? `Protect ${selectedPlayerName}` : 'Select a target'}
          actionColor="bg-doctor-green hover:bg-doctor-green/90 text-white"
          selectedPlayerName={selectedPlayerName}
          onAction={onAction}
          hasActed={hasActed}
          actedMessage="Protection set"
        />
      )
    }

    if (role === 'detective') {
      return (
        <div className="space-y-3 p-4">
          <DetectiveAction
            selectedPlayerName={selectedPlayerName}
            selectedPlayerName2={selectedPlayerName2}
            onInvestigate={onInvestigate}
            hasActed={hasActed}
          />
          {detectiveResult && (
            <div
              className={cn(
                'animate-bounce-in rounded-2xl border-2 p-4 text-center',
                detectiveResult.sameTeam
                  ? 'border-moon-gold/50 bg-moon-gold/10'
                  : 'border-wolf-red/50 bg-wolf-red/10'
              )}
            >
              <p className="font-display text-sm font-semibold text-foreground">
                {detectiveResult.target1Name} & {detectiveResult.target2Name}
              </p>
              <p
                className={cn(
                  'font-display text-xl font-bold',
                  detectiveResult.sameTeam ? 'text-moon-gold' : 'text-wolf-red'
                )}
              >
                {detectiveResult.sameTeam ? 'SAME team' : 'DIFFERENT teams'}
              </p>
            </div>
          )}
        </div>
      )
    }

    // Revenant graveyard absorption — Night 2+ only
    if (role === 'revenant' && (turnNumber ?? 0) >= 1 && deadPlayers && deadPlayers.length > 0) {
      return (
        <div className="flex flex-col gap-2 px-4 py-3">
          <div className="flex items-center gap-2 text-teal-400">
            <span className="text-base">👻</span>
            <span className="font-display text-xs font-semibold">Revenant — Absorb a Role</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Choose a dead player's role to become. This is permanent.
          </p>
          {hasActed ? (
            <div className="animate-bounce-in rounded-lg bg-teal-400/20 px-3 py-1.5 text-xs font-semibold text-teal-400">
              Absorption target selected — awaiting dawn
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
              {deadPlayers.map((dp) => (
                <button
                  key={dp._id}
                  onClick={() => onAbsorb?.(dp._id as any)}
                  className={cn(
                    'game-btn flex items-center justify-between w-full px-3 py-2 text-xs font-semibold rounded-lg',
                    'bg-teal-500/10 border border-teal-400/30 text-teal-400 hover:bg-teal-500/20 transition-colors'
                  )}
                >
                  <span>👻 {dp.name}</span>
                  <span className="text-[10px] text-teal-400/60 capitalize">
                    {dp.role === 'kittenWolf' ? 'Kitten Wolf' : dp.role === 'shadowWolf' ? 'Shadow Wolf' : dp.role}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }

    // Revenant on Night 1 or with no dead players (or after absorption) — sleeps
    // Also: Hunter, Villager, Gunner — all sleep at night
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="animate-float flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-seer-blue/10">
          <Moon className="h-5 w-5 text-seer-blue" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-foreground">Sleeping...</p>
          <p className="text-xs text-muted-foreground">
            The night is dark. Wait for dawn.
          </p>
        </div>
      </div>
    )
  }

  if (phase === 'voting') {
    // Show muted indicator if player is muted
    if (isMuted) {
      return (
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
            <span className="text-lg">🔇</span>
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-violet-400">
              You have been silenced
            </p>
            <p className="text-xs text-muted-foreground">You can still vote, but cannot speak</p>
          </div>
          <div className="ml-auto">
            <button
              onClick={onAction}
              disabled={!selectedPlayerName || hasActed}
              className={cn(
                'game-btn px-4 py-2 text-xs font-semibold disabled:opacity-40',
                hasActed ? 'bg-village-green/20 text-village-green' : 'bg-moon-gold hover:bg-moon-gold/90 text-primary-foreground'
              )}
            >
              {hasActed ? 'Voted' : selectedPlayerName ? `Vote ${selectedPlayerName}` : 'Select'}
            </button>
          </div>
        </div>
      )
    }

    return (
      <NightAction
        icon={<Vote className="h-5 w-5" />}
        title="Cast your vote"
        description="Who do you think is a werewolf?"
        actionLabel={selectedPlayerName ? `Vote ${selectedPlayerName}` : 'Select a player'}
        actionColor="bg-moon-gold hover:bg-moon-gold/90 text-primary-foreground"
        selectedPlayerName={selectedPlayerName}
        onAction={onAction}
        hasActed={hasActed}
        actedMessage="Vote cast"
      />
    )
  }

  // Day phase
  if (role === 'gunner' && (bullets ?? 0) > 0) {
    return (
      <div className="flex flex-col gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <GunIcon className="h-4 w-4 text-foreground" />
          <span className="font-display text-xs font-semibold text-foreground">Armed & Dangerous</span>
          <div className="flex items-center gap-1 ml-auto">
            {Array.from({ length: bullets ?? 0 }).map((_, i) => (
              <div key={i} className="h-2.5 w-1.5 rounded-full bg-moon-gold" />
            ))}
            <span className="ml-1 text-[10px] text-muted-foreground">
              {bullets} bullet{(bullets ?? 0) !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        {hasShot ? (
          <div className="animate-bounce-in rounded-lg bg-wolf-red/20 px-3 py-1.5 text-xs font-semibold text-wolf-red">
            Shot fired this round
          </div>
        ) : (
          <button
            onClick={onShoot}
            disabled={!selectedPlayerName}
            className={cn(
              'game-btn w-full py-2 text-xs font-semibold disabled:opacity-40',
              'bg-wolf-red hover:bg-wolf-red/90 text-white'
            )}
          >
            {selectedPlayerName ? `Shoot ${selectedPlayerName}` : 'Select a target'}
          </button>
        )}
      </div>
    )
  }

  // Day phase — show muted indicator
  if (isMuted) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
          <span className="text-lg">🔇</span>
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-violet-400">
            Silenced by the Shadow Wolf
          </p>
          <p className="text-xs text-muted-foreground">
            You cannot speak during this day. Your voice will return at night.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-moon-gold/10">
        <Sun className="h-5 w-5 text-moon-gold" />
      </div>
      <div className="min-w-0">
        <p className="font-display text-sm font-semibold text-foreground">Discussion Time</p>
        <p className="text-xs text-muted-foreground">
          Talk with the village. Who seems suspicious?
        </p>
      </div>
    </div>
  )
}

function Sun(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

function GunIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 12h8" />
      <path d="M10 8v8" />
      <path d="M10 12h12" />
      <path d="M18 8l4 4-4 4" />
      <path d="M14 16v4h-4" />
    </svg>
  )
}

function FangIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2C8 2 4 6 4 10c0 2 1 4 2 5l1 7h10l1-7c1-1 2-3 2-5 0-4-4-8-8-8z" />
      <path d="M8 10l1 4" />
      <path d="M16 10l-1 4" />
    </svg>
  )
}

function ShadowIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2a7 7 0 0 0-7 7c0 3 2 5.5 4 7l3 5 3-5c2-1.5 4-4 4-7a7 7 0 0 0-7-7z" />
      <circle cx="10" cy="9" r="1" />
      <circle cx="14" cy="9" r="1" />
    </svg>
  )
}

interface NightActionProps {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel: string
  actionColor: string
  selectedPlayerName?: string
  onAction: () => void
  hasActed: boolean
  actedMessage: string
}

function NightAction({
  icon,
  title,
  description,
  actionLabel,
  actionColor,
  selectedPlayerName,
  onAction,
  hasActed,
  actedMessage,
}: NightActionProps) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-2 text-foreground">
        {icon}
        <span className="font-display text-xs font-semibold">{title}</span>
        <span className="text-[10px] text-muted-foreground">{description}</span>
      </div>
      {hasActed ? (
        <div className="animate-bounce-in rounded-lg bg-village-green/20 px-3 py-1.5 text-xs font-semibold text-village-green">
          {actedMessage}
        </div>
      ) : (
        <button
          onClick={onAction}
          disabled={!selectedPlayerName}
          className={cn(
            'game-btn w-full py-2 text-xs font-semibold disabled:opacity-40',
            actionColor
          )}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

interface DetectiveActionProps {
  selectedPlayerName?: string
  selectedPlayerName2?: string
  onInvestigate?: () => void
  hasActed: boolean
}

function DetectiveAction({
  selectedPlayerName,
  selectedPlayerName2,
  onInvestigate,
  hasActed,
}: DetectiveActionProps) {
  const bothSelected = selectedPlayerName && selectedPlayerName2

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-2 text-foreground">
        <Search className="h-4 w-4" />
        <span className="font-display text-xs font-semibold">Investigate</span>
        <div className="flex items-center gap-1.5 ml-auto text-[10px]">
          <span className={cn(
            'rounded border px-2 py-0.5 font-semibold',
            selectedPlayerName ? 'border-moon-gold/50 bg-moon-gold/10 text-moon-gold' : 'border-border bg-secondary text-muted-foreground'
          )}>
            {selectedPlayerName || 'P1'}
          </span>
          <span className="text-muted-foreground">vs</span>
          <span className={cn(
            'rounded border px-2 py-0.5 font-semibold',
            selectedPlayerName2 ? 'border-moon-gold/50 bg-moon-gold/10 text-moon-gold' : 'border-border bg-secondary text-muted-foreground'
          )}>
            {selectedPlayerName2 || 'P2'}
          </span>
        </div>
      </div>
      {hasActed ? (
        <div className="animate-bounce-in rounded-lg bg-village-green/20 px-3 py-1.5 text-xs font-semibold text-village-green">
          Investigation submitted
        </div>
      ) : (
        <button
          onClick={onInvestigate}
          disabled={!bothSelected}
          className={cn(
            'game-btn w-full py-2 text-xs font-semibold disabled:opacity-40',
            'bg-moon-gold hover:bg-moon-gold/90 text-primary-foreground'
          )}
        >
          {bothSelected ? `Investigate` : 'Select two players'}
        </button>
      )}
    </div>
  )
}
