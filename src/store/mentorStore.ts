import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type MentorshipServiceType =
  | 'One-to-One Mentorship' | 'Career Guidance' | 'Resume Review'
  | 'LinkedIn Profile Review' | 'Mock Interview' | 'Placement Preparation' | 'Study Roadmap'

export interface Mentor {
  id: string
  name: string
  designation: string
  company: string
  expertise: string[]
  experience: string
  rating: number
  reviews: number
  sessions: number
  photo?: string
  bio: string
  services: MentorshipServiceType[]
  fees: Record<string, number>
  linkedIn?: string
  status: 'Active' | 'Inactive'
  createdAt: string
}

export type GuidanceRequestStatus = 'New' | 'In Progress' | 'Contacted' | 'Completed'

export interface GuidanceRequest {
  id: string
  fullName: string
  mobile: string
  whatsapp: string
  email: string
  city: string
  state: string
  classYear: string
  schoolCollege: string
  boardUniversity: string
  stream: string
  percentage: string
  guidanceTypes: string[]
  preferredMentors: string[]
  additionalQuery: string
  status: GuidanceRequestStatus
  createdAt: string
}

export interface MentorSession {
  id: string
  studentName: string
  studentEmail: string
  mentorId: string
  serviceType: MentorshipServiceType
  date: string
  time: string
  duration: string
  fee: number
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
  notes?: string
  createdAt: string
}

interface MentorState {
  mentors: Mentor[]
  sessions: MentorSession[]
  guidanceRequests: GuidanceRequest[]
  addMentor: (m: Omit<Mentor, 'id' | 'createdAt'>) => void
  updateMentor: (id: string, data: Partial<Mentor>) => void
  deleteMentor: (id: string) => void
  toggleMentorStatus: (id: string) => void
  addSession: (s: Omit<MentorSession, 'id' | 'createdAt'>) => void
  updateSession: (id: string, data: Partial<MentorSession>) => void
  updateSessionStatus: (id: string, status: MentorSession['status']) => void
  deleteSession: (id: string) => void
  addGuidanceRequest: (r: Omit<GuidanceRequest, 'id' | 'createdAt' | 'status'>) => void
  updateGuidanceRequestStatus: (id: string, status: GuidanceRequestStatus) => void
  deleteGuidanceRequest: (id: string) => void
}

const seedMentors: Mentor[] = []

const seedSessions: MentorSession[] = []

const seedGuidanceRequests: GuidanceRequest[] = []

export const useMentorStore = create<MentorState>()(
  persist(
    (set) => ({
      mentors: seedMentors,
      sessions: seedSessions,
      guidanceRequests: seedGuidanceRequests,
      addMentor: (m) => set((s) => ({
        mentors: [...s.mentors, { ...m, id: `m-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] }]
      })),
      updateMentor: (id, data) => set((s) => ({
        mentors: s.mentors.map((m) => m.id === id ? { ...m, ...data } : m)
      })),
      deleteMentor: (id) => set((s) => ({ mentors: s.mentors.filter((m) => m.id !== id) })),
      toggleMentorStatus: (id) => set((s) => ({
        mentors: s.mentors.map((m) => m.id === id ? { ...m, status: m.status === 'Active' ? 'Inactive' : 'Active' } : m)
      })),
      addSession: (sess) => set((s) => ({
        sessions: [...s.sessions, { ...sess, id: `ms-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] }]
      })),
      updateSession: (id, data) => set((s) => ({
        sessions: s.sessions.map((sess) => sess.id === id ? { ...sess, ...data } : sess)
      })),
      updateSessionStatus: (id, status) => set((s) => ({
        sessions: s.sessions.map((sess) => sess.id === id ? { ...sess, status } : sess)
      })),
      deleteSession: (id) => set((s) => ({
        sessions: s.sessions.filter((sess) => sess.id !== id)
      })),
      addGuidanceRequest: (r) => set((s) => ({
        guidanceRequests: [
          { ...r, id: `gr-${Date.now()}`, status: 'New', createdAt: new Date().toISOString() },
          ...s.guidanceRequests,
        ]
      })),
      updateGuidanceRequestStatus: (id, status) => set((s) => ({
        guidanceRequests: s.guidanceRequests.map((r) => r.id === id ? { ...r, status } : r)
      })),
      deleteGuidanceRequest: (id) => set((s) => ({
        guidanceRequests: s.guidanceRequests.filter((r) => r.id !== id)
      })),
    }),
    { name: 'skill021_mentors' }
  )
)
