import { useState, useEffect } from 'react'

export function useGameTimer(phaseEndTime: number) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = phaseEndTime - Date.now()
    return Math.max(0, Math.ceil(diff / 1000))
  })

  useEffect(() => {
    const update = () => {
      const diff = phaseEndTime - Date.now()
      setTimeLeft(Math.max(0, Math.ceil(diff / 1000)))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [phaseEndTime])

  return timeLeft
}
