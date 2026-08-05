import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import type { Exam } from '../types'
import ExamDetailsModal from './ExamDetailsModal'

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

const getDaysLeft = (endDateStr: string) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(endDateStr)
  endDate.setHours(0, 0, 0, 0)
  const diffTime = endDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export default function ExamCard({ exam, isEligible }: ExamCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const daysLeft = getDaysLeft(exam.registrationEndDate)
  const isRegistrationClosed = daysLeft < 0 || exam.status === 'Closed'

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -3 }}
        className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border hover:shadow-card-hover transition-all duration-200 overflow-hidden flex flex-col"
      >
        {/* Banner above card content */}
        <div className={`px-5 py-2.5 text-xs font-bold text-center border-b border-gray-100 dark:border-brand-dark-border transition-colors ${
          isRegistrationClosed 
            ? 'bg-gray-50 text-brand-muted dark:bg-white/5 dark:text-brand-dark-muted'
            : daysLeft <= 3
            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
        }`}>
          {isRegistrationClosed ? (
            <span>Registration Closed</span>
          ) : daysLeft === 0 ? (
            <span>⚠️ Registration ends today!</span>
          ) : daysLeft === 1 ? (
            <span>⚠️ 1 day left to register</span>
          ) : (
            <span>⏳ {daysLeft} days left to register</span>
          )}
        </div>

        <div className="p-5 flex-1 flex flex-col justify-between">
          <div>
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

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                ['Registration Start', formatDate(exam.registrationStartDate)],
                ['Exam Date', formatDate(exam.examDate)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-brand-dark-border p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-1">{label}</p>
                  <p className="text-xs font-semibold text-brand-text dark:text-brand-dark-text">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-100 dark:border-brand-dark-border">
            <button
              onClick={() => setIsDetailsOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#0A0A0A] dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
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
        </div>
      </motion.div>

      <AnimatePresence>
        {isDetailsOpen && (
          <ExamDetailsModal
            exam={exam}
            isEligible={isEligible}
            onClose={() => setIsDetailsOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

