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

  // Glitch
  if (lower.includes('system glitch') || lower.includes('leak ho gaya')) {
    return { bg: 'bg-destructive/10', text: 'text-destructive font-bold animate-pulse' }
  }

  // System AI
  if (lower.includes('someone visited') || lower.includes('pssst') || lower.includes('system ai')) {
    return { bg: 'bg-indigo-500/10', text: 'text-indigo-400' }
  }

  // Deaths & eliminations → red
  if (lower.includes('was killed') || lower.includes('has been eliminated') || lower.includes('was the last werewolf') ||
    lower.includes('gaya kaam se') || lower.includes('dukh bhari khabar') || lower.includes('headshot') || lower.includes('tumko bhi le doobenge')) {
    return { bg: 'bg-red-400/10', text: 'text-red-400' }
  }

  // Survived / saved → green
  if (lower.includes('survived') || lower.includes('no one died') || lower.includes('subah ho gayi') || lower.includes('maut ko chhuke')) {
    return { bg: 'bg-village-green/10', text: 'text-village-green' }
  }

  // No action / tie → muted amber
  if (lower.includes('no votes') || lower.includes('no majority') || lower.includes('was quiet') || lower.includes('decision pending') || lower.includes('bade log')) {
    return { bg: 'bg-moon-gold/5', text: 'text-muted-foreground' }
  }

  // Wolf pack / conversion → amber
  if (lower.includes('wolf pack') || lower.includes('converted') || lower.includes('swagat nahi karoge') || lower.includes('has risen')) {
    return { bg: 'bg-amber-500/10', text: 'text-amber-500' }
  }

  // Game end → gold
  if (lower.includes('game ends') || lower.includes('maximum rounds') || lower.includes('lutiya doob gayi') || lower.includes('party to banti hai')) {
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
  const [mentionQuery, setMentionQuery] = useState<{ query: string; start: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const nameToColorIndex = useMemo(() => {
    const map = new Map<string, number>()
    playerNames.forEach((name, index) => {
      map.set(name, index)
    })
    return map
  }, [playerNames])

  const filteredPlayers = useMemo(() => {
    if (!mentionQuery) return []
    const lowerQuery = mentionQuery.query.toLowerCase()
    return playerNames.filter((name) => name.toLowerCase().includes(lowerQuery))
  }, [playerNames, mentionQuery])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const selectionStart = e.target.selectionStart || 0
    setInput(value)

    // Check for mention trigger: look backwards from cursor for @
    const textBeforeCursor = value.slice(0, selectionStart)
    const mentionMatch = textBeforeCursor.match(/@([\w\s]*)$/)

    if (mentionMatch) {
      // Ensure we don't match across multiple words unless it's a name search
      // (Simple check: if there's a space, it might be part of a name, but usually mentions start immediately.
      //  Let's allow spaces for multi-word names search, but restart if @ is far back?
      //  Actually, standard behavior is @term. If term has space, it might break.
      //  Let's restrict to no spaces or strictly check valid name prefixes if needed.
      //  For now, allow \w only to keep it robust like WhatsApp which usually searches handles.
      //  But names here can have spaces. Let's try matching everything after @ until cursor.)

      const query = mentionMatch[1]
      // If query contains newline or specific punctuation, abort.
      // For simplicity, let's stick to alphanumeric + spaces, but maybe limit length?
      setMentionQuery({
        query,
        start: selectionStart - mentionMatch[0].length
      })
    } else {
      setMentionQuery(null)
    }
  }

  const handleSelectMention = (name: string) => {
    if (!mentionQuery) return
    const before = input.slice(0, mentionQuery.start)
    // We replace the text from @ start up to the current cursor position (implied by input state at time of match?)
    // Actually, we should replace up to where the user typed.
    // The mentionMatch was based on cursor position.

    // Let's reconstruct based on current input and correct mentionQuery logic.
    // The mentionQuery.start is the index of '@'.
    // The part to replace is `@` + `mentionQuery.query`.
    // But `mentionQuery.query` updates as they type.

    // Wait, if I type `@Ali`, query is `Ali`.
    // `start` is index of `@`.
    // I want to replace `@Ali` with `@Ali `.
    // But what if they typed `@Ali ` (space)? Then regex /@(\w*)$/ won't match if space is there.
    // So the mention drawer closes on space.
    // This is correct behavior usually.

    // So assume we are replacing `@` + `query`.
    const after = input.slice(mentionQuery.start + mentionQuery.query.length + 1)
    const newValue = `${before}@${name} ${after}`

    setInput(newValue)
    setMentionQuery(null)
    inputRef.current?.focus()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || disabled) return
    onSend(input.trim())
    setInput('')
    setMentionQuery(null)
  }

  const channelMessages = messages.filter((m) => {
    if (m.channel === currentChannel) return true
    // Show global system messages in wolf chat too
    if (currentChannel === 'wolves' && m.channel === 'global' && m.senderName === 'System') return true
    return false
  })

  return (
    <div className={`flex h-full flex-col relative ${currentChannel === 'wolves' ? 'bg-white/[0.06]' : ''}`}>
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
          const isSystem = msg.senderName === 'System' || msg.senderName === 'System AI'
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

      {mentionQuery && filteredPlayers.length > 0 && (
        <div className="absolute bottom-12 left-2 right-2 z-50 animate-slide-up overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          <div className="max-h-40 overflow-y-auto p-1">
            {filteredPlayers.map((name) => (
              <button
                key={name}
                onClick={() => handleSelectMention(name)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-popover-foreground hover:bg-muted"
              >
                <span className={cn('block h-1.5 w-1.5 rounded-full', getPlayerColor(nameToColorIndex.get(name) ?? 0).replace('text-', 'bg-'))} />
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          placeholder={placeholder}
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
