import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { setGuestName } from '@/lib/guest-identity'

interface NamePromptDialogProps {
  open: boolean
  onComplete: (name: string) => void
}

export function NamePromptDialog({ open, onComplete }: NamePromptDialogProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters')
      return
    }
    if (trimmed.length > 12) {
      setError('Name must be 12 characters or less')
      return
    }
    if (!/^[a-zA-Z0-9 ]+$/.test(trimmed)) {
      setError('Letters, numbers, and spaces only')
      return
    }
    setGuestName(trimmed)
    onComplete(trimmed)
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-sm border-2 border-border bg-card" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <span className="text-3xl">🐺</span>
          </div>
          <DialogTitle className="font-display text-2xl text-primary">
            Who goes there?
          </DialogTitle>
          <DialogDescription className="font-body text-muted-foreground">
            Choose a name for the village to know you by
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              placeholder="Enter your name..."
              maxLength={12}
              autoFocus
              className="h-12 rounded-xl border-2 border-border bg-secondary text-center font-body text-lg font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary"
            />
            {error && (
              <p className="mt-1 text-center text-sm text-destructive">{error}</p>
            )}
          </div>
          <button
            type="submit"
            className="game-btn w-full bg-primary py-3.5 text-lg text-primary-foreground hover:bg-primary/90"
          >
            Let's Go!
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
