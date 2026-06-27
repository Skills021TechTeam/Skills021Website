import { motion } from 'framer-motion'
import { Star, Clock, BookOpen, Play, Users } from 'lucide-react'
import { Course } from '../data/courses'
import toast from 'react-hot-toast'

interface CourseCardProps {
  course: Course
  index?: number
}

export default function CourseCard({ course, index = 0 }: CourseCardProps) {
  const handleEnroll = () => {
    toast.success(`Enrolled in "${course.title}"! Check your dashboard.`, {
      duration: 3000,
    })
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        className={`w-3 h-3 ${i < Math.floor(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200 dark:text-gray-700 dark:fill-gray-700'}`}
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border overflow-hidden flex flex-col group hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
    >
      {/* Thumbnail — clean dark */}
      <div className="h-44 flex items-center justify-center relative overflow-hidden bg-gray-900 dark:bg-black">
        <BookOpen size={52} className="text-white/10" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        {course.price === 'FREE' && (
          <div className="absolute top-3 right-3 bg-primary-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
            FREE
          </div>
        )}
        <div className="absolute bottom-3 left-3">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white/10 text-white">
            {course.category}
          </span>
        </div>
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/40">
            <Play size={18} className="text-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Level badge — monochrome */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-brand-muted dark:text-brand-dark-muted">
            {course.level}
          </span>
        </div>

        <h3 className="text-base font-bold text-brand-text dark:text-brand-dark-text mb-1 group-hover:text-primary-500 transition-colors line-clamp-2">
          {course.title}
        </h3>

        <p className="text-xs text-brand-muted dark:text-brand-dark-muted mb-3 line-clamp-2 flex-1">
          {course.description}
        </p>

        <div className="flex items-center gap-1 text-xs text-brand-muted dark:text-brand-dark-muted mb-1">
          <Users size={12} />
          <span>{course.instructor}</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-brand-muted dark:text-brand-dark-muted mb-3">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{course.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen size={12} />
            <span>{course.lectures} lectures</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-0.5">
            {renderStars(course.rating)}
          </div>
          <span className="text-xs font-semibold text-amber-500">{course.rating}</span>
          <span className="text-xs text-brand-muted dark:text-brand-dark-muted">({course.reviews.toLocaleString()})</span>
        </div>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-brand-dark-border">
          <div className="text-xl font-bold text-brand-text dark:text-brand-dark-text">
            {course.price === 'FREE' ? (
              <span className="text-primary-500">FREE</span>
            ) : (
              <span>₹{course.price}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {course.youtubeUrl && (
              <a
                href={course.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                title="Watch on YouTube"
              >
                <Play size={14} className="text-brand-muted dark:text-brand-dark-muted" />
              </a>
            )}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleEnroll}
              className="px-4 py-2 bg-[#0A0A0A] dark:bg-white text-white dark:text-black text-sm font-semibold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200"
            >
              Enroll Now
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
