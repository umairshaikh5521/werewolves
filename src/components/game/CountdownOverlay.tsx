import { useEffect, useState, useRef } from 'react'
import { playCountdown, stopCountdown } from '@/lib/sounds'

interface CountdownOverlayProps {
    countdownStartTime: number
    durationSeconds?: number
}

export function CountdownOverlay({
    countdownStartTime,
    durationSeconds = 6
}: CountdownOverlayProps) {
    const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
    const soundStarted = useRef(false)

    useEffect(() => {
        // Play countdown sound once
        if (!soundStarted.current) {
            soundStarted.current = true
            playCountdown(0.6)
        }

        const updateTimer = () => {
            const elapsed = (Date.now() - countdownStartTime) / 1000
            const remaining = Math.max(0, Math.ceil(durationSeconds - elapsed))
            setSecondsLeft(remaining)
        }

        updateTimer()
        const interval = setInterval(updateTimer, 100)

        return () => {
            clearInterval(interval)
            stopCountdown()
        }
    }, [countdownStartTime, durationSeconds])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6 animate-pulse-slow">
                {/* Large countdown number */}
                <div className="relative">
                    <div
                        className="font-display text-[12rem] font-bold leading-none tabular-nums"
                        style={{
                            background: 'linear-gradient(180deg, #FFD700 0%, #FF6B00 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: '0 0 80px rgba(255, 107, 0, 0.5)',
                        }}
                    >
                        {secondsLeft}
                    </div>

                    {/* Glow effect */}
                    <div
                        className="absolute inset-0 -z-10 blur-3xl opacity-30"
                        style={{
                            background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)',
                        }}
                    />
                </div>

                {/* Text */}
                <div className="text-center">
                    <p className="font-display text-2xl font-bold text-white/90">
                        Game Starting
                    </p>
                    <p className="mt-1 text-sm text-white/60">
                        Get ready to play!
                    </p>
                </div>

                {/* Animated dots */}
                <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-3 w-3 rounded-full bg-primary animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
