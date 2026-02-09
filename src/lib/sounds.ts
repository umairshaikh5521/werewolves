// Game sound effects manager

const SOUND_PATHS = {
    countdown: '/assets/game-sounds/countdown-timer.mp3',
    gunshot: '/assets/game-sounds/gunshot.mp3',
    morning: '/assets/game-sounds/morning.mp3',
    night: '/assets/game-sounds/night.mp3',
    levelComplete: '/assets/game-sounds/level-complete.mp3',
    votingStarted: '/assets/game-sounds/voting-started.mp3',
} as const

type SoundName = keyof typeof SOUND_PATHS

class SoundManager {
    private countdownAudio: HTMLAudioElement | null = null

    play(sound: SoundName, volume: number = 0.5): void {
        if (typeof window === 'undefined') return

        try {
            const audio = new Audio(SOUND_PATHS[sound])
            audio.volume = Math.max(0, Math.min(1, volume))
            console.log(`[Sound] Playing: ${sound}`)
            audio.play()
                .then(() => console.log(`[Sound] ${sound} started`))
                .catch((e) => console.warn(`[Sound] ${sound} failed:`, e.message))
        } catch (e) {
            console.error(`[Sound] Error playing ${sound}:`, e)
        }
    }

    stopCountdown(): void {
        if (this.countdownAudio) {
            console.log('[Sound] Stopping countdown')
            this.countdownAudio.pause()
            this.countdownAudio.currentTime = 0
            this.countdownAudio = null
        }
    }

    playCountdown(volume: number = 0.5): void {
        if (typeof window === 'undefined') return

        this.stopCountdown()

        try {
            console.log('[Sound] Playing countdown timer')
            this.countdownAudio = new Audio(SOUND_PATHS.countdown)
            this.countdownAudio.volume = Math.max(0, Math.min(1, volume))

            this.countdownAudio.play()
                .then(() => console.log('[Sound] ✅ Countdown playing!'))
                .catch((e) => console.warn('[Sound] ❌ Countdown failed:', e.message))
        } catch (e) {
            console.error('[Sound] Countdown error:', e)
        }
    }
}

// Singleton instance
export const soundManager = new SoundManager()

// Helper functions
export function playSound(sound: SoundName, volume?: number): void {
    soundManager.play(sound, volume)
}

export function playCountdown(volume?: number): void {
    soundManager.playCountdown(volume)
}

export function stopCountdown(): void {
    soundManager.stopCountdown()
}
