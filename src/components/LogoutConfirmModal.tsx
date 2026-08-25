import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, X, AlertTriangle } from 'lucide-react'

interface LogoutConfirmModalProps {
  isOpen: boolean
  isAdmin?: boolean
  userNameOrEmail?: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export default function LogoutConfirmModal({
  isOpen,
  isAdmin = false,
  userNameOrEmail,
  onConfirm,
  onCancel,
}: LogoutConfirmModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 max-w-sm w-full shadow-2xl relative text-brand-text dark:text-brand-dark-text"
        >
          {/* Close button */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4 mx-auto sm:mx-0">
            <LogOut size={22} className="ml-0.5" />
          </div>

          {/* Heading */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight text-center sm:text-left">
            {isAdmin ? 'Sign out of Admin Portal?' : 'Sign out of your account?'}
          </h3>

          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1.5 leading-relaxed text-center sm:text-left">
            Are you sure you want to end your current session? You will need to sign back in to access protected features.
          </p>

          {userNameOrEmail && (
            <div className="mt-3.5 p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-zinc-400">Signed in as:</span>
              <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[180px]">
                {userNameOrEmail}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2.5 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 dark:border-zinc-800 text-xs sm:text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs sm:text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
