import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type GuidanceStatus = 'New' | 'Contacted' | 'Session Scheduled' | 'Completed' | 'Closed'

export type GuidanceType =
  | 'Career Guidance'
  | 'College Selection'
  | 'Branch Selection'
  | 'Placement Preparation'
  | 'Internship Guidance'
  | 'Higher Studies Guidance'
  | 'Resume Review'
  | 'LinkedIn Profile Review'
  | 'Mock Interview'
  | 'Skill Roadmap'
  | 'Startup Guidance'
  | 'Study Planning'

export interface GuidanceRequest {
  id: string
  // Personal
  fullName: string
  mobile: string
  whatsapp: string
  email: string
  city: string
  state: string
  // Academic
  classYear: string
  schoolCollege: string
  boardUniversity: string
  stream: string
  percentage: string
  // Guidance
  guidanceTypes: GuidanceType[]
  additionalQuery: string
  // CRM
  status: GuidanceStatus
  assignedMentor: string
  notes: string
  createdAt: string
}

interface GuidanceState {
  requests: GuidanceRequest[]
  addRequest: (r: Omit<GuidanceRequest, 'id' | 'status' | 'assignedMentor' | 'notes' | 'createdAt'>) => void
  updateStatus: (id: string, status: GuidanceStatus) => void
  assignMentor: (id: string, mentor: string) => void
  addNote: (id: string, note: string) => void
  deleteRequest: (id: string) => void
}

const seedRequests: GuidanceRequest[] = [
  {
    id: 'gr1',
    fullName: 'Ananya Sharma',
    mobile: '9876543210',
    whatsapp: '9876543210',
    email: 'ananya@example.com',
    city: 'Delhi',
    state: 'Delhi',
    classYear: 'B.Tech 2nd Year',
    schoolCollege: 'DTU Delhi',
    boardUniversity: 'IP University',
    stream: 'Computer Science',
    percentage: '78%',
    guidanceTypes: ['Career Guidance', 'Placement Preparation', 'Resume Review'],
    additionalQuery: 'I want to crack placements at a product-based company. Need guidance on DSA and system design.',
    status: 'New',
    assignedMentor: '',
    notes: '',
    createdAt: '2026-06-18',
  },
  {
    id: 'gr2',
    fullName: 'Rohit Kumar',
    mobile: '9812345678',
    whatsapp: '9812345678',
    email: 'rohit@example.com',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    classYear: 'Class 12',
    schoolCollege: 'City Montessori School',
    boardUniversity: 'CBSE',
    stream: 'Science (PCM)',
    percentage: '92%',
    guidanceTypes: ['College Selection', 'Branch Selection'],
    additionalQuery: 'I got JEE rank 12000. Need help choosing the right college and branch.',
    status: 'Contacted',
    assignedMentor: 'Dr. Rajesh Sharma',
    notes: 'Called on 19 June. Interested in CS at AKTU colleges.',
    createdAt: '2026-06-17',
  },
]

export const useGuidanceStore = create<GuidanceState>()(
  persist(
    (set) => ({
      requests: seedRequests,
      addRequest: (r) =>
        set((s) => ({
          requests: [
            ...s.requests,
            {
              ...r,
              id: `gr-${Date.now()}`,
              status: 'New',
              assignedMentor: '',
              notes: '',
              createdAt: new Date().toISOString().split('T')[0],
            },
          ],
        })),
      updateStatus: (id, status) =>
        set((s) => ({
          requests: s.requests.map((r) => (r.id === id ? { ...r, status } : r)),
        })),
      assignMentor: (id, mentor) =>
        set((s) => ({
          requests: s.requests.map((r) => (r.id === id ? { ...r, assignedMentor: mentor } : r)),
        })),
      addNote: (id, note) =>
        set((s) => ({
          requests: s.requests.map((r) => (r.id === id ? { ...r, notes: note } : r)),
        })),
      deleteRequest: (id) =>
        set((s) => ({ requests: s.requests.filter((r) => r.id !== id) })),
    }),
    { name: 'skill021_guidance_requests' }
  )
)
