import { motion } from 'framer-motion'
import { CalendarDays, ExternalLink, Info, IndianRupee, ListChecks } from 'lucide-react'
import type { Exam } from '../types'

interface ExamCardProps {
  exam: Exam
  isEligible: boolean
}

const statusClass: Record<Exam['status'], string> = {
  Open: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400',
  'Closing Soon': 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400',
  Upcoming: 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400',
  Closed: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-brand-dark-muted',
}

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))

export default function ExamCard({ exam, isEligible }: ExamCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border p-5 hover:shadow-card-hover transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusClass[exam.status]}`}>{exam.status}</span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-white/10 text-brand-muted dark:text-brand-dark-muted">{exam.type}</span>
            {isEligible && <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">Eligible</span>}
          </div>
          <h3 className="text-lg font-bold text-brand-text dark:text-brand-dark-text leading-tight">{exam.name}</h3>
          <p className="text-sm text-brand-muted dark:text-brand-dark-muted mt-1">{exam.conductingOrganization}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          ['Registration Start', formatDate(exam.registrationStartDate)],
          ['Registration End', formatDate(exam.registrationEndDate)],
          ['Exam Date', formatDate(exam.examDate)],
          ['Result Date', formatDate(exam.resultDate)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-brand-dark-border p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-1">{label}</p>
            <p className="text-xs font-semibold text-brand-text dark:text-brand-dark-text">{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 text-sm text-brand-muted dark:text-brand-dark-muted mb-5">
        <p className="flex gap-2 leading-relaxed"><Info size={15} className="text-primary-500 flex-shrink-0 mt-0.5" /> {exam.eligibilitySummary}</p>
        <p className="flex gap-2"><IndianRupee size={15} className="text-primary-500 flex-shrink-0 mt-0.5" /> {exam.applicationFee}</p>
        <p className="flex gap-2 leading-relaxed"><ListChecks size={15} className="text-primary-500 flex-shrink-0 mt-0.5" /> {exam.selectionProcess}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-100 dark:border-brand-dark-border">
        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#0A0A0A] dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
          View Details
        </button>
        <a
          href={exam.officialWebsite}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 dark:border-brand-dark-border text-brand-text dark:text-brand-dark-text hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          Visit Official Website <ExternalLink size={13} />
        </a>
      </div>
    </motion.div>
  )
}

