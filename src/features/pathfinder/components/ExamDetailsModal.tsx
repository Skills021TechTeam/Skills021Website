import { motion } from 'framer-motion'
import { CalendarDays, ExternalLink, Info, IndianRupee, ListChecks, X, Building2, CheckCircle2 } from 'lucide-react'
import type { Exam } from '../types'

interface ExamDetailsModalProps {
  exam: Exam
  isEligible: boolean
  onClose: () => void
}

const statusClass: Record<Exam['status'], string> = {
  Open: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400',
  'Closing Soon': 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400',
  Upcoming: 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400',
  Closed: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-brand-dark-muted',
}

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))

export default function ExamDetailsModal({ exam, isEligible, onClose }: ExamDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal Dialog Container */}
      <motion.div
        className="relative w-full max-w-2xl bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-brand-dark-border">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusClass[exam.status]}`}>
                {exam.status}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-white/10 text-brand-muted dark:text-brand-dark-muted">
                {exam.type}
              </span>
              {isEligible && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Eligible
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-black text-brand-text dark:text-brand-dark-text leading-tight">
              {exam.name}
            </h2>
            <p className="text-sm font-medium text-brand-muted dark:text-brand-dark-muted flex items-center gap-1.5">
              <Building2 size={14} className="text-primary-500" /> {exam.conductingOrganization}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-brand-muted dark:text-brand-dark-muted hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="px-6 py-6 overflow-y-auto space-y-6 max-h-[60vh] no-scrollbar">
          {/* Important Dates */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-3 flex items-center gap-2">
              <CalendarDays size={14} className="text-primary-500" /> Key Dates & Schedule
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ['Registration Start', formatDate(exam.registrationStartDate)],
                ['Registration End', formatDate(exam.registrationEndDate)],
                ['Exam Date', formatDate(exam.examDate)],
                ['Result Date', formatDate(exam.resultDate)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-brand-dark-border p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-1">{label}</p>
                  <p className="text-sm font-semibold text-brand-text dark:text-brand-dark-text">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Info Cards */}
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-100 dark:border-brand-dark-border p-4 space-y-4">
              {/* Eligibility Summary */}
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Info size={16} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-1">Eligibility Details</h4>
                  <p className="text-sm text-brand-text dark:text-brand-dark-text leading-relaxed">{exam.eligibilitySummary}</p>
                </div>
              </div>

              {/* Selection Process */}
              <div className="flex gap-3 items-start border-t border-gray-100 dark:border-brand-dark-border pt-4">
                <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ListChecks size={16} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-1">Selection Process</h4>
                  <p className="text-sm text-brand-text dark:text-brand-dark-text leading-relaxed">{exam.selectionProcess}</p>
                </div>
              </div>

              {/* Application Fee */}
              <div className="flex gap-3 items-start border-t border-gray-100 dark:border-brand-dark-border pt-4">
                <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <IndianRupee size={16} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-1">Application Fee</h4>
                  <p className="text-sm text-brand-text dark:text-brand-dark-text leading-relaxed">{exam.applicationFee}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-brand-dark-border flex flex-col sm:flex-row items-center gap-3">
          <a
            href={exam.officialWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-[#0A0A0A] dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            Visit Official Website <ExternalLink size={15} />
          </a>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-semibold border border-gray-200 dark:border-brand-dark-border text-brand-text dark:text-brand-dark-text hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            Close Details
          </button>
        </div>
      </motion.div>
    </div>
  )
}
