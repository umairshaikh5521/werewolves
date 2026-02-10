import { useState, useRef, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { getPlayerColor } from '@/lib/role-config'

interface Message {
  _id: string
  senderName: string
  content: string
  channel: 'global' | 'wolves' | 'dead'
  timestamp: number
}

interface GameChatProps {
  messages: Message[]
  onSend: (content: string) => void
  currentChannel: 'global' | 'wolves'
  disabled?: boolean
  placeholder?: string
  playerNames?: string[]
}

const channelBadges: Record<string, { bg: string; text: string; label: string }> = {
  global: { bg: 'bg-secondary', text: 'text-secondary-foreground', label: 'Global' },
  wolves: { bg: 'bg-wolf-red/20', text: 'text-wolf-red', label: 'Wolves' },
}

function getSystemMessageStyle(content: string): { bg: string; text: string } {
  const lower = content.toLowerCase()

  // Deaths & eliminations → red
  if (lower.includes('was killed') || lower.includes('has been eliminated') || lower.includes('was the last werewolf')) {
    return { bg: 'bg-red-400/10', text: 'text-red-400' }
  }

  // Survived / saved → green
  if (lower.includes('survived') || lower.includes('no one died')) {
    return { bg: 'bg-village-green/10', text: 'text-village-green' }
  }

  // No action / tie → muted amber
  if (lower.includes('no votes') || lower.includes('no majority') || lower.includes('was quiet')) {
    return { bg: 'bg-moon-gold/5', text: 'text-muted-foreground' }
  }

  // Wolf pack / conversion → amber
  if (lower.includes('wolf pack') || lower.includes('converted')) {
    return { bg: 'bg-amber-500/10', text: 'text-amber-500' }
  }

  // Game end → gold
  if (lower.includes('game ends') || lower.includes('maximum rounds')) {
    return { bg: 'bg-moon-gold/10', text: 'text-moon-gold' }
  }

  // Gunner revealed
  if (lower.includes('shot') || lower.includes('missed') || lower.includes('gunner')) {
    return { bg: 'bg-moon-gold/10', text: 'text-moon-gold' }
  }

  // Default
  return { bg: 'bg-primary/10', text: 'text-primary' }
}

export function GameChat({
  messages,
  onSend,
  currentChannel,
  disabled,
  placeholder = 'Type a message...',
  playerNames = [],
}: GameChatProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const nameToColorIndex = useMemo(() => {
    const map = new Map<string, number>()
    playerNames.forEach((name, index) => {
      map.set(name, index)
    })
    return map
  }, [playerNames])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || disabled) return
    onSend(input.trim())
    setInput('')
  }

  const channelMessages = messages.filter((m) => {
    if (m.channel === currentChannel) return true
    // Show global system messages in wolf chat too
    if (currentChannel === 'wolves' && m.channel === 'global' && m.senderName === 'System') return true
    return false
  })

  return (
    <div className={`flex h-full flex-col ${currentChannel === 'wolves' ? 'bg-white/[0.06]' : ''}`}>
      <div
        ref={scrollRef}
        className="flex-1 space-y-1 overflow-y-auto px-3 py-2"
        style={{ minHeight: 0 }}
      >
        {channelMessages.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No messages yet...
          </p>
        )}
        {channelMessages.map((msg) => {
          const isSystem = msg.senderName === 'System'
          const systemStyle = isSystem ? getSystemMessageStyle(msg.content) : null
          return (
            <div
              key={msg._id}
              className={cn(
                'animate-slide-up rounded px-2.5 py-1',
                isSystem ? cn('text-center', systemStyle?.bg) : 'bg-secondary/50'
              )}
            >
              {isSystem ? (
                <p className={cn('text-[11px] font-semibold', systemStyle?.text)}>{msg.content}</p>
              ) : (
                <p className="text-xs text-foreground">
                  <span className={cn('font-bold', getPlayerColor(nameToColorIndex.get(msg.senderName) ?? 0))}>
                    {msg.senderName}
                  </span>
                  {msg.channel !== 'global' && (
                    <span
                      className={cn(
                        'ml-1 inline-block rounded-full px-1.5 py-0.5 text-[8px] font-semibold uppercase leading-none',
                        channelBadges[msg.channel].bg,
                        channelBadges[msg.channel].text
                      )}
                    >
                      {channelBadges[msg.channel].label}
                    </span>
                  )}
                  <span className="ml-1.5 font-normal text-foreground/90">{msg.content}</span>
                </p>
              )}
            </div>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={disabled ? 'Chat disabled' : placeholder}
          disabled={disabled}
          className="h-8 rounded-lg border border-border bg-secondary font-body text-xs"
          maxLength={200}
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="game-btn flex h-8 w-8 shrink-0 items-center justify-center bg-primary text-primary-foreground disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  )
}
