const USER_ID_KEY = 'moonrise_user_id'
const DISPLAY_NAME_KEY = 'moonrise_display_name'

function generateId(): string {
  return crypto.randomUUID()
}

export function getGuestId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(USER_ID_KEY)
  if (!id) {
    id = generateId()
    localStorage.setItem(USER_ID_KEY, id)
  }
  return id
}

export function getGuestName(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(DISPLAY_NAME_KEY) || ''
}

export function setGuestName(name: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DISPLAY_NAME_KEY, name.trim())
}

export function hasGuestName(): boolean {
  if (typeof window === 'undefined') return false
  const name = localStorage.getItem(DISPLAY_NAME_KEY)
  return !!name && name.trim().length > 0
}
