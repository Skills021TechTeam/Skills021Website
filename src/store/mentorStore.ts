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
  addMentor: (m: Omit<Mentor, 'id' | 'createdAt'>) => void
  updateMentor: (id: string, data: Partial<Mentor>) => void
  deleteMentor: (id: string) => void
  toggleMentorStatus: (id: string) => void
  addSession: (s: Omit<MentorSession, 'id' | 'createdAt'>) => void
  updateSessionStatus: (id: string, status: MentorSession['status']) => void
}

const seedMentors: Mentor[] = [
  {
    id: 'm1', name: 'Arjun Kapoor', designation: 'Senior Software Engineer', company: 'Google',
    expertise: ['DSA', 'System Design', 'Backend Development', 'Interview Prep'],
    experience: '7 years', rating: 4.9, reviews: 340, sessions: 890,
    bio: 'SWE at Google with 7 years experience. IIT Bombay alumni. Helped 200+ students crack FAANG interviews.',
    services: ['One-to-One Mentorship', 'Mock Interview', 'Resume Review', 'Study Roadmap'],
    fees: { 'One-to-One Mentorship': 999, 'Mock Interview': 1499, 'Resume Review': 499, 'Study Roadmap': 799 },
    linkedIn: '#', status: 'Active', createdAt: '2024-06-01',
  },
  {
    id: 'm2', name: 'Sneha Gupta', designation: 'Data Scientist', company: 'Amazon',
    expertise: ['Machine Learning', 'Data Science', 'Python', 'Career Guidance'],
    experience: '5 years', rating: 4.8, reviews: 210, sessions: 560,
    bio: 'Data Scientist at Amazon. M.Tech from IIT Delhi. Passionate about mentoring aspiring data scientists.',
    services: ['Career Guidance', 'Study Roadmap', 'Mock Interview', 'LinkedIn Profile Review'],
    fees: { 'Career Guidance': 799, 'Study Roadmap': 999, 'Mock Interview': 1299, 'LinkedIn Profile Review': 399 },
    linkedIn: '#', status: 'Active', createdAt: '2024-09-01',
  },
  {
    id: 'm3', name: 'Rohan Mishra', designation: 'Product Manager', company: 'Microsoft',
    expertise: ['Product Management', 'MBA Prep', 'Career Transition', 'Resume Writing'],
    experience: '6 years', rating: 4.7, reviews: 180, sessions: 420,
    bio: 'PM at Microsoft, IIM Ahmedabad alumni. Expert in career transitions and PM interviews.',
    services: ['Career Guidance', 'Resume Review', 'Mock Interview', 'Placement Preparation'],
    fees: { 'Career Guidance': 899, 'Resume Review': 599, 'Mock Interview': 1299, 'Placement Preparation': 1999 },
    linkedIn: '#', status: 'Active', createdAt: '2025-01-01',
  },
]

const seedSessions: MentorSession[] = [
  { id: 'ms1', studentName: 'Kavya Reddy', studentEmail: 'kavya@example.com', mentorId: 'm1', serviceType: 'Mock Interview', date: '2026-07-15', time: '3:00 PM', duration: '60 min', fee: 1499, status: 'Confirmed', createdAt: '2026-06-18' },
  { id: 'ms2', studentName: 'Dev Patel', studentEmail: 'dev@example.com', mentorId: 'm2', serviceType: 'Career Guidance', date: '2026-07-18', time: '11:00 AM', duration: '60 min', fee: 799, status: 'Pending', createdAt: '2026-06-19' },
]

export const useMentorStore = create<MentorState>()(
  persist(
    (set) => ({
      mentors: seedMentors,
      sessions: seedSessions,
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
      updateSessionStatus: (id, status) => set((s) => ({
        sessions: s.sessions.map((sess) => sess.id === id ? { ...sess, status } : sess)
      })),
    }),
    { name: 'skill021_mentors' }
  )
)
