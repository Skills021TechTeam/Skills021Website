import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Lock,
  Database,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
  Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getStoredCookiePreferences,
  saveCookiePreferences,
  DEFAULT_PREFERENCES,
  ESSENTIAL_ONLY_PREFERENCES,
  getActiveStorageDiagnostics,
  clearNonEssentialStorage,
} from '../lib/cookieService'

export default function CookieBanner() {
  const [hasDecided, setHasDecided] = useState<boolean>(true) // default to true to avoid flicker
  const [showPreferencesModal, setShowPreferencesModal] = useState<boolean>(false)
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false)

  // Local state for toggles inside Customize modal
  const [preferences, setPreferences] = useState<{
    preferences: boolean
    analytics: boolean
    marketing: boolean
  }>({
    preferences: true,
    analytics: true,
    marketing: true
  })

  const [diagnostics, setDiagnostics] = useState<{ name: string; type: 'cookie' | 'localStorage'; size: string; category: string }[]>([])

  useEffect(() => {
    const existing = getStoredCookiePreferences()
    if (!existing) {
      setHasDecided(false)
    } else {
      setHasDecided(true)
      setPreferences({
        preferences: existing.preferences,
        analytics: existing.analytics,
        marketing: existing.marketing
      })
    }

    // Global listener for opening cookie settings from Footer, Navbar, etc.
    const handleOpenSettings = () => {
      const current = getStoredCookiePreferences() || DEFAULT_PREFERENCES
      setPreferences({
        preferences: current.preferences,
        analytics: current.analytics,
        marketing: current.marketing
      })
      setShowPreferencesModal(true)
      setDiagnostics(getActiveStorageDiagnostics())
    }

    window.addEventListener('skills021_open_cookie_settings', handleOpenSettings)
    return () => {
      window.removeEventListener('skills021_open_cookie_settings', handleOpenSettings)
    }
  }, [])

  const handleAcceptAll = () => {
    saveCookiePreferences(DEFAULT_PREFERENCES)
    setPreferences({ preferences: true, analytics: true, marketing: true })
    setHasDecided(true)
    setShowPreferencesModal(false)
    toast('All cookies accepted.', {
      style: { background: '#18181b', color: '#f4f4f5', border: '1px solid #27272a' },
      icon: '✓'
    })
  }

  const handleRejectAll = () => {
    saveCookiePreferences(ESSENTIAL_ONLY_PREFERENCES)
    setPreferences({ preferences: false, analytics: false, marketing: false })
    setHasDecided(true)
    setShowPreferencesModal(false)
    toast('Non-essential cookies rejected.', {
      style: { background: '#18181b', color: '#f4f4f5', border: '1px solid #27272a' },
      icon: '✓'
    })
  }

  const handleSaveCustom = () => {
    saveCookiePreferences({
      necessary: true,
      preferences: preferences.preferences,
      analytics: preferences.analytics,
      marketing: preferences.marketing
    })
    setHasDecided(true)
    setShowPreferencesModal(false)
    toast('Cookie settings saved.', {
      style: { background: '#18181b', color: '#f4f4f5', border: '1px solid #27272a' },
      icon: '✓'
    })
  }

  const handleRefreshDiagnostics = () => {
    setDiagnostics(getActiveStorageDiagnostics())
  }

  const handleClearCache = () => {
    clearNonEssentialStorage()
    setDiagnostics(getActiveStorageDiagnostics())
    toast('Non-essential browser cache cleared.', {
      style: { background: '#18181b', color: '#f4f4f5', border: '1px solid #27272a' }
    })
  }

  const toggleCategory = (key: 'preferences' | 'analytics' | 'marketing') => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const openCustomizeModal = () => {
    setDiagnostics(getActiveStorageDiagnostics())
    setShowPreferencesModal(true)
  }

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. FLOATING MINIMAL MONOCHROME COOKIE BANNER
          Matches exact design in user screenshot:
          - Clean dark card (#141414)
          - Serif "Cookie settings" heading
          - Understated monochrome palette
          - "Customize cookie settings" (top full-width outline button)
          - "Reject all cookies" (bottom left outline) & "Accept all cookies" (bottom right white)
          ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!hasDecided && !showPreferencesModal && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed bottom-20 lg:bottom-5 left-4 right-4 sm:left-auto sm:right-5 z-[120] sm:max-w-[360px] w-auto"
          >
            <div className="rounded-xl sm:rounded-2xl border border-zinc-800 bg-[#121212] p-4 sm:p-5 text-white shadow-2xl">
              {/* Title */}
              <h2 className="font-serif text-lg sm:text-xl font-medium tracking-tight text-white mb-2">
                Cookie settings
              </h2>

              {/* Description */}
              <p className="text-[12px] sm:text-[12.5px] leading-relaxed text-zinc-300 mb-3.5">
                We use cookies to deliver and improve our services, analyze site usage, and if you agree, to customize or personalize your experience and market our services to you. You can read our Cookie Policy{' '}
                <button
                  type="button"
                  onClick={openCustomizeModal}
                  className="underline underline-offset-2 hover:text-white font-normal cursor-pointer text-zinc-300"
                >
                  here
                </button>
                .
              </p>

              {/* Buttons */}
              <div className="space-y-2">
                {/* Full-width Customize button */}
                <button
                  type="button"
                  onClick={openCustomizeModal}
                  className="w-full py-2 px-3.5 rounded-lg sm:rounded-xl border border-zinc-700 hover:border-zinc-500 bg-transparent text-white text-xs sm:text-[13px] font-medium transition-colors cursor-pointer text-center"
                >
                  Customize cookie settings
                </button>

                {/* Bottom row: Reject all cookies & Accept all cookies */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRejectAll}
                    className="flex-1 py-2 px-3 rounded-lg sm:rounded-xl border border-zinc-700 hover:border-zinc-500 bg-transparent text-white text-xs sm:text-[13px] font-medium transition-colors cursor-pointer text-center"
                  >
                    Reject all cookies
                  </button>

                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="flex-1 py-2 px-3 rounded-lg sm:rounded-xl bg-white hover:bg-zinc-200 text-black text-xs sm:text-[13px] font-semibold transition-colors cursor-pointer text-center"
                  >
                    Accept all cookies
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          2. CUSTOMIZE COOKIE SETTINGS MODAL (MONOCHROME & CLEAN)
          ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPreferencesModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full max-w-lg max-h-[88vh] flex flex-col rounded-xl sm:rounded-2xl border border-zinc-800 bg-[#121212] text-white shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="border-b border-zinc-800 px-5 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="font-serif text-xl font-medium tracking-tight text-white">
                    Cookie settings
                  </h2>
                  <p className="text-[11.5px] text-zinc-400 mt-0.5">
                    Manage how we use cookies and personal data on this device
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPreferencesModal(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  We use cookies and local storage to personalize content, retain your preferences such as dark mode and video playback speeds, and analyze platform traffic. You can choose which cookies to allow below.
                </p>

                {/* 1. Necessary Cookies */}
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Strictly Necessary</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Required for account login, session security, and basic navigation</p>
                    </div>
                    <span className="text-[11px] font-medium text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-md">
                      Always active
                    </span>
                  </div>
                </div>

                {/* 2. Experience & Personalization */}
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Experience & Personalization</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Remembers dark/light mode, video playback speeds, and volume settings</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCategory('preferences')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        preferences.preferences ? 'bg-white' : 'bg-zinc-800'
                      }`}
                      aria-label="Toggle Preferences"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow transition duration-200 ease-in-out ${
                          preferences.preferences ? 'translate-x-5 bg-black' : 'translate-x-0 bg-zinc-400'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 3. Performance & Analytics */}
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Analytics & Performance</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Helps measure page performance, video engagement, and quiz telemetry</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCategory('analytics')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        preferences.analytics ? 'bg-white' : 'bg-zinc-800'
                      }`}
                      aria-label="Toggle Analytics"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow transition duration-200 ease-in-out ${
                          preferences.analytics ? 'translate-x-5 bg-black' : 'translate-x-0 bg-zinc-400'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 4. Marketing & Notifications */}
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Marketing & Live Alerts</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Alerts for upcoming live webinars and hackathon registration announcements</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCategory('marketing')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        preferences.marketing ? 'bg-white' : 'bg-zinc-800'
                      }`}
                      aria-label="Toggle Marketing"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow transition duration-200 ease-in-out ${
                          preferences.marketing ? 'translate-x-5 bg-black' : 'translate-x-0 bg-zinc-400'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Browser Storage Diagnostic Toggle */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDiagnostics(!showDiagnostics)
                      if (!showDiagnostics) setDiagnostics(getActiveStorageDiagnostics())
                    }}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    <span>Inspect active storage keys ({diagnostics.length})</span>
                    {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showDiagnostics && (
                    <div className="mt-2 p-3 rounded-lg bg-black border border-zinc-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-zinc-500 text-[11px]">
                        <span>Active cookies & localStorage keys:</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleRefreshDiagnostics}
                            className="hover:text-zinc-300 flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" /> Refresh
                          </button>
                          <button
                            type="button"
                            onClick={handleClearCache}
                            className="hover:text-zinc-300 flex items-center gap-1 text-zinc-400"
                          >
                            <Trash2 className="w-3 h-3" /> Clear cached
                          </button>
                        </div>
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                        {diagnostics.length === 0 ? (
                          <p className="text-zinc-600 text-center py-2">No custom storage items found</p>
                        ) : (
                          diagnostics.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between py-1 px-2 rounded bg-zinc-900/50 text-zinc-400">
                              <span className="truncate max-w-[220px]">{item.name}</span>
                              <span className="text-[10px] text-zinc-500">{item.type}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="border-t border-zinc-800 px-5 py-3.5 bg-[#121212] flex flex-col sm:flex-row items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className="w-full sm:w-auto px-3.5 py-2 rounded-lg sm:rounded-xl border border-zinc-700 hover:border-zinc-500 text-white text-xs sm:text-[13px] font-medium transition-colors cursor-pointer text-center"
                >
                  Reject all cookies
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="w-full sm:w-auto px-3.5 py-2 rounded-lg sm:rounded-xl border border-zinc-700 hover:border-zinc-500 text-white text-xs sm:text-[13px] font-medium transition-colors cursor-pointer text-center"
                >
                  Save settings
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="w-full sm:w-auto px-3.5 py-2 rounded-lg sm:rounded-xl bg-white hover:bg-zinc-200 text-black text-xs sm:text-[13px] font-semibold transition-colors cursor-pointer text-center"
                >
                  Accept all cookies
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
