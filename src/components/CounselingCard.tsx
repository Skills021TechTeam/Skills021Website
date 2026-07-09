import { motion } from 'framer-motion'
import { CheckCircle, ExternalLink, GraduationCap, BookOpen, Award, MapPin } from 'lucide-react'
import { CounselingProgram } from '../data/counseling'

interface CounselingCardProps {
  program: CounselingProgram
  index?: number
}

const iconMap = {
  GraduationCap,
  BookOpen,
  Award,
  MapPin,
}

export default function CounselingCard({ program, index = 0 }: CounselingCardProps) {
  const IconComponent = iconMap[program.icon as keyof typeof iconMap] || GraduationCap

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="card p-6 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: program.bgColor }}
        >
          <IconComponent size={28} style={{ color: program.color }} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-brand-text dark:text-brand-dark-text">{program.university}</h3>
          <div className="flex items-center gap-2 mt-1">
            {program.highlights.map((h) => (
              <span
                key={h}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: program.bgColor, color: program.color }}
              >
                {h}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-brand-muted dark:text-brand-dark-muted mb-5 leading-relaxed">
        {program.description}
      </p>

      {/* Features */}
      <div className="space-y-2.5 mb-6 flex-1">
        {program.features.slice(0, 4).map((feature) => (
          <div key={feature} className="flex items-start gap-2.5">
            <CheckCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: program.color }} />
            <span className="text-sm text-brand-muted dark:text-brand-dark-muted">{feature}</span>
          </div>
        ))}
        {program.features.length > 4 && (
          <p className="text-xs text-brand-muted dark:text-brand-dark-muted pl-6">
            +{program.features.length - 4} more features included
          </p>
        )}
      </div>

      {/* CTA */}
      <a
        href={program.formUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 px-5 py-3 text-white font-semibold rounded-xl transition-all duration-200 hover:opacity-90 hover:shadow-lg"
        style={{ backgroundColor: program.color }}
      >
        <ExternalLink size={16} />
        Apply for Counseling
      </a>
    </motion.div>
  )
}
