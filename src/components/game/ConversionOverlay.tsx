import { cn } from '@/lib/utils'
import { roleConfig } from '@/lib/role-config'

interface ConversionOverlayProps {
  onDismiss: () => void
}

export function ConversionOverlay({ onDismiss }: ConversionOverlayProps) {
  const wolfConfig = roleConfig.wolf

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 px-6">
        <div className="animate-pulse text-6xl">
          <BloodDropIcon className="h-16 w-16 text-wolf-red" />
        </div>

        <div className="animate-scale-in flex flex-col items-center gap-4">
          <h2 className="font-display text-2xl font-bold text-wolf-red">
            YOU HAVE BEEN BITTEN
          </h2>

          <p className="text-center text-sm leading-relaxed text-muted-foreground">
            The Kitten Wolf found you in the darkness.
            <br />
            You feel the change overtaking you...
          </p>

          <div className="my-4 flex items-center justify-center">
            {wolfConfig.image && (
              <img
                src={wolfConfig.image}
                alt={wolfConfig.title}
                className="h-40 w-40 object-contain drop-shadow-[0_0_30px_rgba(239,68,68,0.4)]"
              />
            )}
          </div>

          <div className="rounded-2xl border-2 border-wolf-red/30 bg-wolf-red/10 p-4 text-center">
            <p className="font-display text-sm font-semibold text-foreground">
              You are now a
            </p>
            <p className={cn('font-display text-2xl font-bold', wolfConfig.color)}>
              {wolfConfig.title}
            </p>
          </div>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Your old role is gone. You now hunt with the pack.
            <br />
            Work with your fellow wolves to eliminate the village.
          </p>

          <button
            onClick={onDismiss}
            className={cn(
              'game-btn mt-4 w-full max-w-xs py-3.5 text-sm font-semibold text-white',
              'bg-wolf-red hover:bg-wolf-red/90'
            )}
          >
            Accept Your Fate
          </button>
        </div>
      </div>
    </div>
  )
}

function BloodDropIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M12 2c-5.33 8.33-8 12.67-8 16 0 4.42 3.58 8 8 8s8-3.58 8-8c0-3.33-2.67-7.67-8-16z" />
    </svg>
  )
}
