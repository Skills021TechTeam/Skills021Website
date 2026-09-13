import { create } from 'zustand'

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAState {
  deferredPrompt: BeforeInstallPromptEvent | null
  isInstallable: boolean
  isInstalled: boolean
  isIOS: boolean
  isMobile: boolean
  isPromptOpen: boolean
  showIOSGuide: boolean
  dismissCooldownMs: number

  initPWA: () => () => void
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'ios' | 'unavailable'>
  openPrompt: () => void
  closePrompt: () => void
  setShowIOSGuide: (show: boolean) => void
}

const DISMISS_STORAGE_KEY = 'skills021_pwa_prompt_dismissed_at'
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000 // 3 days cooldown after manual dismissal

export const usePWAStore = create<PWAState>((set, get) => ({
  deferredPrompt: null,
  isInstallable: false,
  isInstalled: false,
  isIOS: false,
  isMobile: false,
  isPromptOpen: false,
  showIOSGuide: false,
  dismissCooldownMs: COOLDOWN_MS,

  initPWA: () => {
    if (typeof window === 'undefined') return () => {}

    const ua = navigator.userAgent || ''
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
      (window.innerWidth <= 820 && ('ontouchstart' in window || navigator.maxTouchPoints > 0))

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://')

    set({
      isIOS,
      isMobile: isMobileDevice,
      isInstalled: isStandalone,
    })

    // If already installed/opened in standalone app, don't show prompts
    if (isStandalone) {
      set({ isPromptOpen: false })
      return () => {}
    }

    const checkShouldShowPrompt = () => {
      const lastDismissed = localStorage.getItem(DISMISS_STORAGE_KEY)
      if (lastDismissed) {
        const timeSince = Date.now() - parseInt(lastDismissed, 10)
        if (timeSince < COOLDOWN_MS) {
          return false
        }
      }
      return true
    }

    // Capture Chrome / Edge / Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      set({
        deferredPrompt: promptEvent,
        isInstallable: true,
      })

      if (isMobileDevice && checkShouldShowPrompt()) {
        // Subtle delay for smooth page entry
        setTimeout(() => {
          if (!get().isInstalled) {
            set({ isPromptOpen: true })
          }
        }, 2200)
      }
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      set({
        isInstalled: true,
        isInstallable: false,
        deferredPrompt: null,
        isPromptOpen: false,
        showIOSGuide: false,
      })
      localStorage.removeItem(DISMISS_STORAGE_KEY)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // For iOS Safari: it doesn't support beforeinstallprompt, but is installable via Add to Home Screen
    if (isIOS && isMobileDevice && !isStandalone) {
      set({ isInstallable: true })
      if (checkShouldShowPrompt()) {
        setTimeout(() => {
          if (!get().isInstalled) {
            set({ isPromptOpen: true })
          }
        }, 2500)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  },

  promptInstall: async () => {
    const { deferredPrompt, isIOS } = get()

    if (isIOS) {
      set({ showIOSGuide: true, isPromptOpen: false })
      return 'ios'
    }

    if (!deferredPrompt) {
      return 'unavailable'
    }

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        set({ deferredPrompt: null, isPromptOpen: false, isInstalled: true })
      }
      return choice.outcome
    } catch (err) {
      console.error('Error prompting PWA install:', err)
      return 'unavailable'
    }
  },

  openPrompt: () => {
    const { isIOS, deferredPrompt } = get()
    if (isIOS) {
      set({ showIOSGuide: true })
    } else if (deferredPrompt) {
      set({ isPromptOpen: true })
    } else {
      // Direct trigger or fallback
      set({ isPromptOpen: true })
    }
  },

  closePrompt: () => {
    set({ isPromptOpen: false })
    localStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString())
  },

  setShowIOSGuide: (show: boolean) => {
    set({ showIOSGuide: show })
  },
}))
