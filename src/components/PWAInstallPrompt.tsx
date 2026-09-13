import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  X,
  Share,
  PlusSquare,
  Sparkles,
  CheckCircle2,
  Smartphone,
  Zap,
  WifiOff,
  Layers,
  ArrowDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import { usePWAStore } from '../store/pwaStore'
import { haptic } from '../lib/haptics'

export default function PWAInstallPrompt() {
  const {
    isPromptOpen,
    showIOSGuide,
    isInstalled,
    isIOS,
    isMobile,
    initPWA,
    promptInstall,
    closePrompt,
    setShowIOSGuide,
  } = usePWAStore()

  const [installing, setInstalling] = useState(false)

  // Initialize PWA event listeners on mount
  useEffect(() => {
    const cleanup = initPWA()
    return cleanup
  }, [initPWA])

  // If already installed, don't show prompt
  if (isInstalled) {
    return null
  }

  const handleInstallClick = async () => {
    haptic.medium()
    setInstalling(true)

    try {
      const outcome = await promptInstall()
      if (outcome === 'accepted') {
        toast.success('Skills021 installed! You can now launch it from your home screen.', {
          icon: '📱',
          duration: 4500,
        })
      } else if (outcome === 'unavailable') {
        // Fallback instructions if browser doesn't support prompt
        setShowIOSGuide(true)
      }
    } finally {
      setInstalling(false)
    }
  }

  const handleDismiss = () => {
    haptic.light()
    closePrompt()
  }

  return (
    <>
      {/* ── Main Mobile Install Prompt Floating Card ── */}
      <AnimatePresence>
        {isPromptOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 pointer-events-auto"
            role="dialog"
            aria-label="Install Skills021 Application"
          >
            <div className="relative overflow-hidden rounded-2xl bg-white/95 dark:bg-[#0E1320]/95 backdrop-blur-2xl border border-primary-500/30 dark:border-primary-500/25 shadow-[0_12px_40px_rgba(0,0,0,0.25)] dark:shadow-[0_12px_45px_rgba(0,0,0,0.8)] p-4 text-gray-900 dark:text-white">
              {/* Background ambient glow */}
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-primary-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={handleDismiss}
                aria-label="Dismiss app install banner"
                className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <X size={17} />
              </button>

              <div className="flex items-start gap-3.5 pr-6">
                {/* App Icon */}
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-2xl p-0.5 bg-gradient-to-br from-primary-400 via-primary-600 to-indigo-600 shadow-md shadow-primary-500/20">
                    <img
                      src="/pwa-192x192.png"
                      alt="Skills021 App"
                      className="w-full h-full object-cover rounded-[14px] bg-[#0B0F19]"
                    />
                  </div>
                  <div className="absolute -bottom-1.5 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[9px] font-black text-white shadow-sm flex items-center gap-0.5">
                    <Sparkles size={8} />
                    <span>APP</span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-base tracking-tight text-gray-950 dark:text-white">
                      Install Skills021 App
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-zinc-300 mt-0.5 line-clamp-2 leading-relaxed">
                    Install to your phone for a faster, full-screen app experience. No browser bar needed!
                  </p>
                </div>
              </div>

              {/* Feature Pills */}
              <div className="grid grid-cols-3 gap-1.5 my-3 pt-1 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] text-[10px] font-medium text-gray-700 dark:text-zinc-300">
                  <Zap size={11} className="text-amber-500 shrink-0" />
                  <span>Fast Launch</span>
                </div>
                <div className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] text-[10px] font-medium text-gray-700 dark:text-zinc-300">
                  <WifiOff size={11} className="text-primary-500 shrink-0" />
                  <span>Offline Ready</span>
                </div>
                <div className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] text-[10px] font-medium text-gray-700 dark:text-zinc-300">
                  <Layers size={11} className="text-emerald-500 shrink-0" />
                  <span>Full Screen</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={handleInstallClick}
                  disabled={installing}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-primary-500/25 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Download size={14} className="stroke-[2.5]" />
                  <span>{installing ? 'Preparing...' : isIOS ? 'How to Install on iPhone' : 'Download & Install App'}</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="py-2.5 px-3 rounded-xl text-xs font-medium text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── iOS "Add to Home Screen" Visual Bottom Sheet Modal ── */}
      <AnimatePresence>
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIOSGuide(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full sm:max-w-md bg-white dark:bg-[#0F1422] rounded-t-3xl sm:rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl p-6 text-gray-900 dark:text-white z-10 safe-bottom"
            >
              {/* Drag indicator for mobile bottom sheet */}
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />

              {/* Close Button */}
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-br from-primary-500 to-indigo-600 shrink-0">
                  <img
                    src="/pwa-192x192.png"
                    alt="Skills021"
                    className="w-full h-full object-cover rounded-[14px]"
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold">Install Skills021 on iOS</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Takes 5 seconds • Works just like an App Store app
                  </p>
                </div>
              </div>

              {/* Step-by-step Visual Instructions */}
              <div className="space-y-3 my-5">
                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                  <div className="w-7 h-7 rounded-full bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="flex-1 text-xs leading-relaxed">
                    Tap the <strong className="text-gray-900 dark:text-white font-semibold">Share</strong> button at the bottom of your Safari browser:
                    <div className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                      <Share size={13} />
                      <span>Share</span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                  <div className="w-7 h-7 rounded-full bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="flex-1 text-xs leading-relaxed">
                    Scroll down and tap{' '}
                    <strong className="text-gray-900 dark:text-white font-semibold">
                      Add to Home Screen
                    </strong>
                    :
                    <div className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-medium">
                      <PlusSquare size={13} />
                      <span>Add to Home Screen</span>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                  <div className="w-7 h-7 rounded-full bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div className="flex-1 text-xs leading-relaxed">
                    Tap <strong className="text-gray-900 dark:text-white font-semibold">Add</strong> in the top right corner. Skills021 will now appear on your home screen as a standalone application!
                  </div>
                </div>
              </div>

              {/* Animated pointer indicator down towards Safari toolbar on iOS devices */}
              {isIOS && (
                <div className="flex flex-col items-center justify-center py-2 text-primary-500 animate-bounce">
                  <ArrowDown size={20} />
                  <span className="text-[11px] font-medium">Safari Share button is at the bottom</span>
                </div>
              )}

              {/* Close / Got it */}
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                Got It, Thanks!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
