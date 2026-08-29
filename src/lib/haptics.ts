/**
 * Skills021 Haptic Feedback & Tactile Response Engine
 * 
 * Provides native mobile vibration patterns (navigator.vibrate) and
 * subtle synthesized micro-tactile acoustic feedback for desktop browsers,
 * alongside global automated event delegation for the entire website.
 */

import toast from 'react-hot-toast'

export type HapticFeedbackType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'selection'
  | 'rigid'
  | 'soft'
  | 'success'
  | 'warning'
  | 'error'

// Vibration timing patterns (in milliseconds)
export const HAPTIC_PATTERNS: Record<HapticFeedbackType, number | number[]> = {
  light: 10,
  medium: 22,
  heavy: 45,
  selection: 8,
  rigid: 15,
  soft: 12,
  success: [15, 55, 25],
  warning: [30, 50, 30],
  error: [45, 60, 45, 60, 50],
}

const STORAGE_KEY_HAPTICS = 'skills021_haptics_enabled'
const STORAGE_KEY_SOUND = 'skills021_haptics_sound_enabled'

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        audioCtx = new AudioContextClass()
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
    return audioCtx
  } catch {
    return null
  }
}

/**
 * Synthesizes an ultra-subtle, premium micro-tactile click for desktop or unsupported devices.
 */
function playTactileAudio(type: HapticFeedbackType) {
  if (!isHapticSoundEnabled()) return

  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'

    let freq = 160
    let duration = 0.015
    let volume = 0.025

    switch (type) {
      case 'selection':
        freq = 240
        duration = 0.008
        volume = 0.015
        break
      case 'light':
      case 'soft':
        freq = 190
        duration = 0.012
        volume = 0.02
        break
      case 'medium':
      case 'rigid':
        freq = 150
        duration = 0.018
        volume = 0.03
        break
      case 'heavy':
        freq = 110
        duration = 0.025
        volume = 0.04
        break
      case 'success':
        freq = 320
        duration = 0.03
        volume = 0.035
        break
      case 'warning':
      case 'error':
        freq = 90
        duration = 0.04
        volume = 0.04
        break
    }

    osc.frequency.setValueAtTime(freq, now)
    if (type === 'success') {
      osc.frequency.exponentialRampToValueAtTime(540, now + duration)
    } else if (type === 'error' || type === 'warning') {
      osc.frequency.exponentialRampToValueAtTime(70, now + duration)
    }

    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + duration)
  } catch {
    // AudioContext silently ignored if not permitted yet
  }
}

/**
 * Check if the browser natively supports the Vibration API.
 */
export function isHapticSupported(): boolean {
  return typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function'
}

/**
 * Check if haptic feedback is globally enabled in user settings.
 */
export function isHapticEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const item = localStorage.getItem(STORAGE_KEY_HAPTICS)
  return item !== 'false'
}

/**
 * Enable or disable haptic feedback globally.
 */
export function setHapticEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_HAPTICS, enabled ? 'true' : 'false')
}

/**
 * Check if subtle audio tactile click is enabled for desktop/devices.
 */
export function isHapticSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const item = localStorage.getItem(STORAGE_KEY_SOUND)
  return item !== 'false'
}

/**
 * Enable or disable subtle audio tactile clicks.
 */
export function setHapticSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_SOUND, enabled ? 'true' : 'false')
}

/**
 * Trigger a specific haptic feedback pattern.
 */
export function triggerHaptic(type: HapticFeedbackType = 'light'): boolean {
  if (!isHapticEnabled()) return false

  let didVibrate = false
  const pattern = HAPTIC_PATTERNS[type] || HAPTIC_PATTERNS.light

  if (isHapticSupported()) {
    try {
      didVibrate = navigator.vibrate(pattern)
    } catch {
      didVibrate = false
    }
  }

  // If on desktop or vibration not active, trigger subtle tactile acoustic micro-response
  if (!didVibrate) {
    playTactileAudio(type)
  }

  return true
}

/**
 * Trigger a custom vibration pattern (ms or array of ms).
 */
export function customHaptic(pattern: number | number[]): boolean {
  if (!isHapticEnabled()) return false
  if (isHapticSupported()) {
    try {
      return navigator.vibrate(pattern)
    } catch {
      return false
    }
  }
  return false
}

// ─── Convenient Haptic Object ────────────────────────────────────────────────
export const haptic = {
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  heavy: () => triggerHaptic('heavy'),
  selection: () => triggerHaptic('selection'),
  rigid: () => triggerHaptic('rigid'),
  soft: () => triggerHaptic('soft'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
  trigger: (type: HapticFeedbackType) => triggerHaptic(type),
  custom: (pattern: number | number[]) => customHaptic(pattern),
  isSupported: isHapticSupported,
  isEnabled: isHapticEnabled,
  setEnabled: setHapticEnabled,
  isSoundEnabled: isHapticSoundEnabled,
  setSoundEnabled: setHapticSoundEnabled,
}

// ─── Automatic Toaster Interceptor ───────────────────────────────────────────
let isToasterPatched = false

export function initHapticToaster() {
  if (isToasterPatched || typeof window === 'undefined') return
  isToasterPatched = true

  const originalSuccess = toast.success
  const originalError = toast.error
  const originalCustom = toast.custom

  toast.success = ((message: any, opts?: any) => {
    haptic.success()
    return originalSuccess(message, opts)
  }) as typeof toast.success

  toast.error = ((message: any, opts?: any) => {
    haptic.error()
    return originalError(message, opts)
  }) as typeof toast.error

  toast.custom = ((jsx: any, opts?: any) => {
    haptic.medium()
    return originalCustom(jsx, opts)
  }) as typeof toast.custom
}

// ─── Global Event Delegation Engine ───────────────────────────────────────────
let isGlobalHapticsInitialized = false
let lastHapticTimestamp = 0
const HAPTIC_DEBOUNCE_MS = 60

/**
 * Initializes automatic global haptic feedback on all interactive elements across the entire website.
 */
export function initGlobalHaptics(): () => void {
  if (isGlobalHapticsInitialized || typeof window === 'undefined') {
    return () => {}
  }
  isGlobalHapticsInitialized = true

  initHapticToaster()

  const handlePointerInteraction = (e: Event) => {
    const target = e.target as HTMLElement | null
    if (!target) return

    const now = Date.now()
    if (now - lastHapticTimestamp < HAPTIC_DEBOUNCE_MS) {
      return
    }

    // Find closest interactive element
    const interactive = target.closest(
      'button, a, input, select, textarea, [role="button"], [role="tab"], [role="switch"], [role="menuitem"], [role="checkbox"], [role="radio"], summary, label, [data-haptic]'
    ) as HTMLElement | null

    if (!interactive) return

    // Disabled elements do not emit haptics
    if (
      interactive.hasAttribute('disabled') ||
      interactive.getAttribute('aria-disabled') === 'true' ||
      interactive.classList.contains('disabled') ||
      interactive.classList.contains('pointer-events-none')
    ) {
      return
    }

    // Explicitly opt out
    const explicitHaptic = interactive.getAttribute('data-haptic')
    if (explicitHaptic === 'none') {
      return
    }

    // If explicit type is defined
    if (explicitHaptic && explicitHaptic in HAPTIC_PATTERNS) {
      lastHapticTimestamp = now
      triggerHaptic(explicitHaptic as HapticFeedbackType)
      return
    }

    const tagName = interactive.tagName.toLowerCase()

    // Form selection inputs
    if (tagName === 'input') {
      const type = (interactive as HTMLInputElement).type?.toLowerCase()
      if (type === 'checkbox' || type === 'radio' || type === 'range') {
        lastHapticTimestamp = now
        haptic.selection()
        return
      }
      if (type === 'submit' || type === 'button') {
        lastHapticTimestamp = now
        haptic.medium()
        return
      }
      return
    }

    if (tagName === 'select' || interactive.getAttribute('role') === 'switch') {
      lastHapticTimestamp = now
      haptic.selection()
      return
    }

    // Buttons and destructive actions
    if (tagName === 'button' || interactive.getAttribute('role') === 'button') {
      lastHapticTimestamp = now
      const isSubmit = (interactive as HTMLButtonElement).type === 'submit'
      const isDestructive =
        interactive.classList.contains('btn-danger') ||
        interactive.classList.contains('bg-red-500') ||
        interactive.classList.contains('bg-red-600') ||
        interactive.classList.contains('text-red-500') ||
        interactive.textContent?.toLowerCase().includes('delete') ||
        interactive.textContent?.toLowerCase().includes('remove')

      if (isDestructive) {
        haptic.warning()
      } else if (isSubmit) {
        haptic.medium()
      } else {
        haptic.light()
      }
      return
    }

    // Navigation links, tabs, and summary disclosures
    if (tagName === 'a' || interactive.getAttribute('role') === 'tab' || tagName === 'summary') {
      lastHapticTimestamp = now
      haptic.light()
      return
    }

    // Clickable card or label
    if (tagName === 'label' || interactive.classList.contains('card') || interactive.classList.contains('clickable')) {
      lastHapticTimestamp = now
      haptic.soft()
      return
    }
  }

  // Listen on window for global capture
  window.addEventListener('click', handlePointerInteraction, { capture: true, passive: true })

  // Return cleanup function
  return () => {
    window.removeEventListener('click', handlePointerInteraction, { capture: true })
    isGlobalHapticsInitialized = false
  }
}

/**
 * React hook for consuming haptic feedback inside components.
 */
export function useHaptic() {
  return haptic
}
