import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { playerNameColors } from '@/lib/role-config'

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
  currentChannel: 'global' | 'wolves' | 'dead'
  disabled?: boolean
  placeholder?: string
}

function getNameColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash
  }
  const index = Math.abs(hash) % playerNameColors.length
  return playerNameColors[index]
}

const channelBadges: Record<string, { bg: string; text: string; label: string }> = {
  global: { bg: 'bg-secondary', text: 'text-secondary-foreground', label: 'Global' },
  wolves: { bg: 'bg-wolf-red/20', text: 'text-wolf-red', label: 'Wolves' },
  dead: { bg: 'bg-dead-gray/20', text: 'text-dead-gray', label: 'Dead' },
}

export function GameChat({
  messages,
  onSend,
  currentChannel,
  disabled,
  placeholder = 'Type a message...',
}: GameChatProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

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

  const channelMessages = messages.filter((m) => m.channel === currentChannel)

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-1.5 overflow-y-auto p-3"
        style={{ minHeight: 0 }}
      >
        {channelMessages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet...
          </p>
        )}
        {channelMessages.map((msg) => {
          const isSystem = msg.senderName === 'System'
          return (
            <div
              key={msg._id}
              className={cn(
                'animate-slide-up rounded-xl px-3 py-1.5',
                isSystem ? 'bg-primary/10 text-center' : 'bg-secondary/50'
              )}
            >
              {isSystem ? (
                <p className="text-xs font-semibold text-primary">{msg.content}</p>
              ) : (
                <>
                  <span className={cn('text-xs font-bold', getNameColor(msg.senderName))}>
                    {msg.senderName}
                  </span>
                  {msg.channel !== 'global' && (
                    <span
                      className={cn(
                        'ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase',
                        channelBadges[msg.channel].bg,
                        channelBadges[msg.channel].text
                      )}
                    >
                      {channelBadges[msg.channel].label}
                    </span>
                  )}
                  <p className="text-sm text-foreground">{msg.content}</p>
                </>
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
          className="h-10 rounded-xl border-2 border-border bg-secondary font-body text-sm"
          maxLength={200}
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className="game-btn flex h-10 w-10 shrink-0 items-center justify-center bg-primary text-primary-foreground disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
