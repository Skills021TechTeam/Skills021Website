import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Loader2 } from 'lucide-react'

interface ConfirmDownloadDialogProps {
  isOpen: boolean
  resourceTitle: string
  isLoading: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmDownloadDialog({
  isOpen,
  resourceTitle,
  isLoading,
  onCancel,
  onConfirm,
}: ConfirmDownloadDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isLoading ? onCancel : undefined}
          />

          {/* Dialog */}
          <motion.div
            className="relative w-full max-w-md bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                  <Download size={18} className="text-brand-muted dark:text-brand-dark-muted" />
                </div>
                <h2 className="text-lg font-bold text-brand-text dark:text-brand-dark-text">
                  Download Resource
                </h2>
              </div>
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-muted dark:text-brand-dark-muted hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              <p className="text-sm text-brand-muted dark:text-brand-dark-muted leading-relaxed">
                Are you sure you want to download{' '}
                <span className="font-semibold text-brand-text dark:text-brand-dark-text">
                  '{resourceTitle}'
                </span>
                ?
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 px-6 pb-6 pt-2">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-brand-dark-border text-sm font-semibold text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0A0A0A] dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    Download
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
