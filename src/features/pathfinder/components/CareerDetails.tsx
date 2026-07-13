import { motion } from 'framer-motion'
import { Briefcase, GraduationCap, IndianRupee, Sparkles, TrendingUp } from 'lucide-react'
import type { Career } from '../types'

interface CareerDetailsProps {
  career: Career
}

export default function CareerDetails({ career }: CareerDetailsProps) {
  const Icon = career.icon
  const details = [
    { label: 'Average Salary', value: career.averageSalary, icon: IndianRupee },
    { label: 'Career Growth', value: career.careerGrowth, icon: TrendingUp },
    { label: 'Education Required', value: career.educationRequired, icon: GraduationCap },
    { label: 'Eligibility Overview', value: career.eligibilityOverview, icon: Sparkles },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden"
    >
      <div className={`bg-gradient-to-r ${career.accent} p-6 text-white`}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
            <Icon size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-1">Career Overview</p>
            <h2 className="text-2xl md:text-3xl font-black text-white">{career.title}</h2>
            <p className="text-white/80 mt-2 max-w-3xl leading-relaxed">{career.description}</p>
          </div>
        </div>
      </div>
      <div className="p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {details.map(({ label, value, icon: DetailIcon }) => (
            <div key={label} className="rounded-2xl border border-gray-100 dark:border-brand-dark-border bg-gray-50 dark:bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-muted dark:text-brand-dark-muted mb-2">
                <DetailIcon size={13} className="text-primary-500" /> {label}
              </div>
              <p className="text-sm font-semibold text-brand-text dark:text-brand-dark-text leading-relaxed">{value}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-gray-100 dark:border-brand-dark-border p-4">
            <h3 className="text-sm font-bold text-brand-text dark:text-brand-dark-text mb-3">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {career.requiredSkills.map((skill) => (
                <span key={skill} className="px-2.5 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-semibold">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 dark:border-brand-dark-border p-4">
            <h3 className="text-sm font-bold text-brand-text dark:text-brand-dark-text mb-3 flex items-center gap-2"><Briefcase size={15} /> Industries Hiring</h3>
            <div className="space-y-2">
              {career.industriesHiring.map((industry) => (
                <p key={industry} className="text-sm text-brand-muted dark:text-brand-dark-muted">{industry}</p>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 dark:border-brand-dark-border p-4">
            <h3 className="text-sm font-bold text-brand-text dark:text-brand-dark-text mb-3">Future Scope</h3>
            <p className="text-sm text-brand-muted dark:text-brand-dark-muted leading-relaxed">{career.futureScope}</p>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

