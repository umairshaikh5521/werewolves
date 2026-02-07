import { cn } from '@/lib/utils'
import { Crosshair, Eye, ShieldPlus, Vote, Moon } from 'lucide-react'

interface ActionPanelProps {
  role: string
  phase: 'night' | 'day' | 'voting'
  isAlive: boolean
  selectedPlayerName?: string
  selectedPlayerId?: string
  onAction: () => void
  hasActed: boolean
  seerResult?: { targetName: string; team: string } | null
}

export function ActionPanel({
  role,
  phase,
  isAlive,
  selectedPlayerName,
  onAction,
  hasActed,
  seerResult,
}: ActionPanelProps) {
  if (!isAlive) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-dead-gray/20">
          <span className="text-2xl">💀</span>
        </div>
        <p className="font-display text-sm font-semibold text-dead-gray">
          You have been eliminated
        </p>
        <p className="text-xs text-muted-foreground">Watch from the graveyard chat</p>
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
