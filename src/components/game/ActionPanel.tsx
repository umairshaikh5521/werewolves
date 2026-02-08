import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Crosshair, Eye, ShieldPlus, Vote, Moon, Search } from 'lucide-react'
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
  phase: 'night' | 'day' | 'voting'
  isAlive: boolean
  selectedPlayerName?: string
  selectedPlayerId?: string
  onAction: () => void
  hasActed: boolean
  seerResult?: { targetName: string; team: string } | null
  detectiveResult?: { target1Name: string; target2Name: string; sameTeam: boolean } | null
  bullets?: number
  onShoot?: () => void
  selectedPlayerName2?: string
  onInvestigate?: () => void
  lastProtectedId?: string
  selectedPlayerId2?: string
  hasBitten?: boolean
  onConvert?: () => void
  hasConverted?: boolean
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
  selectedPlayerName2,
  onInvestigate,
  hasBitten,
  onConvert,
  hasConverted,
}: ActionPanelProps) {
  const [showBiteConfirm, setShowBiteConfirm] = useState(false)
  if (!isAlive) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-dead-gray/20">
          <span className="text-2xl">💀</span>
        </div>
        <p className="font-display text-sm font-semibold text-dead-gray">
          You have been eliminated
        </p>
        <p className="text-xs text-muted-foreground">Watch your team's chat</p>
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
        <div className="flex flex-col items-center gap-4 p-4">
          <div className="flex items-center gap-2 text-amber-500">
            <FangIcon className="h-5 w-5" />
            <span className="font-display text-sm font-semibold">Kitten Wolf</span>
          </div>

          {hasConverted ? (
            <div className="animate-bounce-in rounded-xl bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-500">
              Bite submitted - target will be converted
            </div>
          ) : hasActed ? (
            <div className="animate-bounce-in rounded-xl bg-village-green/20 px-4 py-2 text-sm font-semibold text-village-green">
              Kill vote submitted
            </div>
          ) : (
            <>
              <p className="text-center text-xs text-muted-foreground">
                {canBite
                  ? 'Choose to kill or use your one-time bite to convert a villager'
                  : 'Your bite ability has been used. Vote to kill.'}
              </p>

              <div className="flex w-full max-w-xs flex-col gap-2">
                <button
                  onClick={onAction}
                  disabled={!selectedPlayerName}
                  className={cn(
                    'game-btn w-full py-3 text-sm font-semibold disabled:opacity-40',
                    'bg-wolf-red hover:bg-wolf-red/90 text-white'
                  )}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Crosshair className="h-4 w-4" />
                    {selectedPlayerName ? `Kill ${selectedPlayerName}` : 'Select a target'}
                  </span>
                </button>

                {canBite && (
                  <button
                    onClick={() => setShowBiteConfirm(true)}
                    disabled={!selectedPlayerName}
                    className={cn(
                      'game-btn w-full py-3 text-sm font-semibold disabled:opacity-40',
                      'bg-amber-500 hover:bg-amber-500/90 text-white',
                      'border-2 border-amber-400/50'
                    )}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <FangIcon className="h-4 w-4" />
                      {selectedPlayerName ? `Bite ${selectedPlayerName}` : 'Select a target'}
                    </span>
                  </button>
                )}
              </div>

              {canBite && (
                <p className="text-center text-xs text-amber-500/70">
                  Bite converts a villager to your team (one-time use)
                </p>
              )}
            </>
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

    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <div className="animate-float flex h-14 w-14 items-center justify-center rounded-full bg-seer-blue/10">
          <Moon className="h-7 w-7 text-seer-blue" />
        </div>
        <p className="font-display text-sm font-semibold text-foreground">Sleeping...</p>
        <p className="text-xs text-muted-foreground">
          The night is dark. Wait for dawn.
        </p>
      </div>
    )
  }

  if (phase === 'voting') {
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

  if (role === 'gunner' && (bullets ?? 0) > 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-4">
        <div className="flex items-center gap-2 text-foreground">
          <GunIcon className="h-5 w-5" />
          <span className="font-display text-sm font-semibold">Armed & Dangerous</span>
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: bullets ?? 0 }).map((_, i) => (
            <div key={i} className="h-3 w-1.5 rounded-full bg-moon-gold" />
          ))}
          <span className="ml-1 text-xs text-muted-foreground">
            {bullets} bullet{(bullets ?? 0) !== 1 ? 's' : ''} remaining
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Select a player and shoot during discussion</p>
        <button
          onClick={onShoot}
          disabled={!selectedPlayerName}
          className={cn(
            'game-btn w-full max-w-xs py-3 text-sm font-semibold disabled:opacity-40',
            'bg-wolf-red hover:bg-wolf-red/90 text-white'
          )}
        >
          {selectedPlayerName ? `Shoot ${selectedPlayerName}` : 'Select a target'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-moon-gold/10">
        <Sun className="h-7 w-7 text-moon-gold" />
      </div>
      <p className="font-display text-sm font-semibold text-foreground">Discussion Time</p>
      <p className="text-xs text-muted-foreground">
        Talk with the village. Who seems suspicious?
      </p>
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
    <div className="flex flex-col items-center gap-3 p-4">
      <div className="flex items-center gap-2 text-foreground">
        {icon}
        <span className="font-display text-sm font-semibold">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {hasActed ? (
        <div className="animate-bounce-in rounded-xl bg-village-green/20 px-4 py-2 text-sm font-semibold text-village-green">
          {actedMessage}
        </div>
      ) : (
        <button
          onClick={onAction}
          disabled={!selectedPlayerName}
          className={cn(
            'game-btn w-full max-w-xs py-3 text-sm font-semibold disabled:opacity-40',
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
    <div className="flex flex-col items-center gap-3 p-4">
      <div className="flex items-center gap-2 text-foreground">
        <Search className="h-5 w-5" />
        <span className="font-display text-sm font-semibold">Investigate</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Select two players to compare their allegiance
      </p>
      <div className="flex items-center gap-2 text-xs">
        <span className={cn(
          'rounded-lg border px-3 py-1.5 font-semibold',
          selectedPlayerName ? 'border-moon-gold/50 bg-moon-gold/10 text-moon-gold' : 'border-border bg-secondary text-muted-foreground'
        )}>
          {selectedPlayerName || 'Player 1'}
        </span>
        <span className="text-muted-foreground">vs</span>
        <span className={cn(
          'rounded-lg border px-3 py-1.5 font-semibold',
          selectedPlayerName2 ? 'border-moon-gold/50 bg-moon-gold/10 text-moon-gold' : 'border-border bg-secondary text-muted-foreground'
        )}>
          {selectedPlayerName2 || 'Player 2'}
        </span>
      </div>
      {hasActed ? (
        <div className="animate-bounce-in rounded-xl bg-village-green/20 px-4 py-2 text-sm font-semibold text-village-green">
          Investigation submitted
        </div>
      ) : (
        <button
          onClick={onInvestigate}
          disabled={!bothSelected}
          className={cn(
            'game-btn w-full max-w-xs py-3 text-sm font-semibold disabled:opacity-40',
            'bg-moon-gold hover:bg-moon-gold/90 text-primary-foreground'
          )}
        >
          {bothSelected ? `Investigate` : 'Select two players'}
        </button>
      )}
    </div>
  )
}
