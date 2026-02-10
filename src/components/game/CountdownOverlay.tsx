import { useEffect, useState, useRef } from 'react'
import { playCountdown, stopCountdown } from '@/lib/sounds'

interface RoleDistEntry {
    role: string
    emoji: string
    count: number
    color: string
}

interface CountdownOverlayProps {
    countdownStartTime: number
    durationSeconds?: number
    playerCount?: number
}

const ROLE_DISTRIBUTION: Record<number, Record<string, number>> = {
    5: { wolf: 1, seer: 1, doctor: 1, villager: 2 },
    6: { wolf: 1, seer: 1, doctor: 1, gunner: 1, villager: 2 },
    7: { wolf: 2, seer: 1, doctor: 1, gunner: 1, hunter: 1, villager: 1 },
    8: { wolf: 1, shadowWolf: 1, seer: 1, doctor: 1, gunner: 1, detective: 1, hunter: 1, villager: 1 },
    9: { wolf: 1, kittenWolf: 1, seer: 1, doctor: 1, gunner: 1, hunter: 1, jester: 1, villager: 2 },
    10: { wolf: 1, kittenWolf: 1, shadowWolf: 1, seer: 1, doctor: 1, gunner: 1, detective: 1, hunter: 1, jester: 1, villager: 1 },
    11: { wolf: 1, kittenWolf: 1, shadowWolf: 1, seer: 1, doctor: 1, gunner: 1, detective: 1, hunter: 1, jester: 1, villager: 2 },
    12: { wolf: 2, kittenWolf: 1, shadowWolf: 1, seer: 1, doctor: 1, gunner: 1, detective: 1, hunter: 1, jester: 1, villager: 2 },
}

const ROLE_META: Record<string, { emoji: string; color: string; label: string }> = {
    wolf: { emoji: '🐺', color: 'text-red-500', label: 'Wolf' },
    kittenWolf: { emoji: '🐾', color: 'text-amber-500', label: 'Kitten' },
    shadowWolf: { emoji: '👤', color: 'text-violet-500', label: 'Shadow' },
    seer: { emoji: '🔮', color: 'text-blue-400', label: 'Seer' },
    doctor: { emoji: '💊', color: 'text-green-400', label: 'Doctor' },
    gunner: { emoji: '🔫', color: 'text-yellow-500', label: 'Gunner' },
    detective: { emoji: '🕵️', color: 'text-yellow-500', label: 'Detective' },
    hunter: { emoji: '🏹', color: 'text-orange-500', label: 'Hunter' },
    jester: { emoji: '🃏', color: 'text-fuchsia-500', label: 'Jester' },
    villager: { emoji: '🏠', color: 'text-gray-400', label: 'Villager' },
}

function getRoleDistribution(playerCount: number): RoleDistEntry[] {
    const dist = ROLE_DISTRIBUTION[playerCount]
    if (!dist) return []

    return Object.entries(dist).map(([role, count]) => {
        const meta = ROLE_META[role] || { emoji: '❓', color: 'text-gray-400', label: role }
        return { role, emoji: meta.emoji, count, color: meta.color }
    })
}

export function CountdownOverlay({
    countdownStartTime,
    durationSeconds = 6,
    playerCount,
}: CountdownOverlayProps) {
    const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
    const soundStarted = useRef(false)

    useEffect(() => {
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

    const roles = playerCount ? getRoleDistribution(playerCount) : []

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-5">
                {/* Countdown number — smaller */}
                <div className="relative">
                    <div
                        className="font-display text-[7rem] font-bold leading-none tabular-nums"
                        style={{
                            background: 'linear-gradient(180deg, #FFD700 0%, #FF6B00 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: '0 0 60px rgba(255, 107, 0, 0.4)',
                        }}
                    >
                        {secondsLeft}
                    </div>
                    <div
                        className="absolute inset-0 -z-10 blur-3xl opacity-20"
                        style={{
                            background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)',
                        }}
                    />
                </div>

                {/* Text */}
                <div className="text-center">
                    <p className="font-display text-xl font-bold text-white/90">
                        Game Starting
                    </p>
                    <p className="mt-1 text-sm text-white/60">
                        Get ready to play!
                    </p>
                </div>

                {/* Role distribution */}
                {roles.length > 0 && (
                    <div className="mt-2 w-full max-w-xs">
                        <p className="mb-2 text-center font-display text-[10px] font-semibold uppercase tracking-widest text-white/40">
                            Roles in this match
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            {roles.map((r) => (
                                <div
                                    key={r.role}
                                    className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1"
                                >
                                    <span className="text-xs">{r.emoji}</span>
                                    <span className={`text-[11px] font-semibold ${r.color}`}>
                                        {ROLE_META[r.role]?.label || r.role}
                                    </span>
                                    {r.count > 1 && (
                                        <span className="text-[10px] text-white/50">×{r.count}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
