import { useState } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoomCodeDisplayProps {
  code: string
  showShare?: boolean
}

export function RoomCodeDisplay({ code, showShare = true }: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareLink = async () => {
    const url = `${window.location.origin}/game/join/${code}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join my Moonrise game!', url })
      } catch {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Room Code
      </p>
      <button
        onClick={copyCode}
        className="group flex items-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-6 py-3 transition-all hover:border-primary hover:bg-primary/10"
      >
        <span className="font-display text-3xl font-bold tracking-[0.3em] text-primary">
          {code}
        </span>
        {copied ? (
          <Check className="h-5 w-5 text-village-green" />
        ) : (
          <Copy className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
        )}
      </button>
      {showShare && (
        <button
          onClick={shareLink}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold',
            'bg-secondary text-secondary-foreground transition-all hover:bg-secondary/80'
          )}
        >
          <Share2 className="h-3.5 w-3.5" />
          Share Link
        </button>
      )}
    </div>
  )
}
