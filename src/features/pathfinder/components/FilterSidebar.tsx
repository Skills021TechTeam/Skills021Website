import { motion } from 'framer-motion'
import type { ExamType, RegistrationStatus, SortOption } from '../types'

interface FilterSidebarProps {
  showOnlyEligible: boolean
  onShowOnlyEligibleChange: (value: boolean) => void
  examTypes: ExamType[]
  onExamTypesChange: (value: ExamType[]) => void
  statuses: RegistrationStatus[]
  onStatusesChange: (value: RegistrationStatus[]) => void
  sortBy: SortOption
  onSortByChange: (value: SortOption) => void
}

const examTypes: ExamType[] = ['Government', 'Private', 'National', 'State']
const statuses: RegistrationStatus[] = ['Open', 'Closing Soon', 'Upcoming']
const sortOptions: SortOption[] = ['Nearest Registration Deadline', 'Upcoming Exam Date', 'Highest Salary', 'Alphabetical']

export default function FilterSidebar({
  showOnlyEligible,
  onShowOnlyEligibleChange,
  examTypes: activeExamTypes,
  onExamTypesChange,
  statuses: activeStatuses,
  onStatusesChange,
  sortBy,
  onSortByChange,
}: FilterSidebarProps) {
  const toggleExamType = (type: ExamType) => {
    onExamTypesChange(activeExamTypes.includes(type)
      ? activeExamTypes.filter((item) => item !== type)
      : [...activeExamTypes, type])
  }

  const toggleStatus = (status: RegistrationStatus) => {
    onStatusesChange(activeStatuses.includes(status)
      ? activeStatuses.filter((item) => item !== status)
      : [...activeStatuses, status])
  }

  return (
    <motion.aside
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      className="hidden lg:block w-64 flex-shrink-0"
    >
      <div className="sticky top-32 bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border p-4 shadow-card">
        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text dark:text-brand-dark-text mb-4">Filters</h3>

        <div className="space-y-2 mb-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted">Eligibility</p>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer text-sm text-brand-muted dark:text-brand-dark-muted">
            <input
              type="checkbox"
              checked={showOnlyEligible}
              onChange={(event) => onShowOnlyEligibleChange(event.target.checked)}
              className="w-4 h-4 accent-primary-500"
            />
            Show Only Eligible
          </label>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer text-sm text-brand-muted dark:text-brand-dark-muted">
            <input
              type="checkbox"
              checked={!showOnlyEligible}
              onChange={() => onShowOnlyEligibleChange(false)}
              className="w-4 h-4 accent-primary-500"
            />
            Show All Related Exams
          </label>
        </div>

        <div className="space-y-1 mb-5 pt-5 border-t border-gray-100 dark:border-brand-dark-border">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-2">Exam Type</p>
          {examTypes.map((type) => (
            <button
              key={type}
              onClick={() => toggleExamType(type)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeExamTypes.includes(type)
                  ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold'
                  : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="space-y-1 mb-5 pt-5 border-t border-gray-100 dark:border-brand-dark-border">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-2">Registration</p>
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeStatuses.includes(status)
                  ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold'
                  : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="space-y-1 pt-5 border-t border-gray-100 dark:border-brand-dark-border">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-2">Sort By</p>
          {sortOptions.map((option) => (
            <button
              key={option}
              onClick={() => onSortByChange(option)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                sortBy === option
                  ? 'bg-[#0A0A0A] text-white dark:bg-white dark:text-black font-semibold'
                  : 'text-brand-muted dark:text-brand-dark-muted hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </motion.aside>
  )
}

