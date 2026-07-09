import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CourseFeedbackType = 'Rating' | 'Comment' | 'Recommend' | 'TeacherRating'

export interface CourseFeedbackEntry {
  id: string
  courseId: string
  courseTitle: string
  type: CourseFeedbackType
  text: string
  stars?: number
  userId: string | null
  userName: string
  createdAt: string
}

interface CourseFeedbackState {
  entries: CourseFeedbackEntry[]
  addEntry: (entry: Omit<CourseFeedbackEntry, 'id' | 'createdAt'>) => void
  deleteEntry: (id: string) => void
  getEntriesForCourse: (courseId: string) => CourseFeedbackEntry[]
}

export const useCourseFeedbackStore = create<CourseFeedbackState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) => set((s) => ({
        entries: [
          ...s.entries,
          { ...entry, id: `cf-${Date.now()}`, createdAt: new Date().toISOString() },
        ],
      })),

      deleteEntry: (id) => set((s) => ({
        entries: s.entries.filter((e) => e.id !== id),
      })),

      getEntriesForCourse: (courseId) => get().entries.filter((e) => e.courseId === courseId),
    }),
    { name: 'skill021_course_feedback' }
  )
)
