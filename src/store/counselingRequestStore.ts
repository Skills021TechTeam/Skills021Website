import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CounselingRequestStatus =
  | 'New'
  | 'Contacted'
  | 'Counseling Scheduled'
  | 'Counseling Completed'
  | 'Closed'

export type CounselingTypeOption =
  | 'JoSAA Counseling'
  | 'CSAB Counseling'
  | 'JAC Delhi Counseling'
  | 'AKTU Counseling'
  | 'IPU Counseling'
  | 'LPU Counseling'
  | 'VIT Counseling'
  | 'SRM Counseling'
  | 'BITS Counseling'
  | 'COMEDK Counseling'
  | 'KCET Counseling'
  | 'MHT CET Counseling'
  | 'WBJEE Counseling'
  | 'NEET Counseling'
  | 'Medical Counseling'
  | 'Study Abroad Counseling'

export interface CounselingRequest {
  id: string
  // Personal
  fullName: string
  mobile: string
  whatsapp: string
  email: string
  city: string
  state: string
  // Academic
  examName: string
  rank: string
  category: string
  stateQuota: string
  homeState: string
  preferredBranch: string
  preferredCollege: string
  // Counseling
  counselingType: CounselingTypeOption
  additionalQuery: string
  // CRM
  status: CounselingRequestStatus
  assignedCounselor: string
  notes: string
  createdAt: string
}

interface CounselingRequestState {
  requests: CounselingRequest[]
  addRequest: (r: Omit<CounselingRequest, 'id' | 'status' | 'assignedCounselor' | 'notes' | 'createdAt'>) => void
  updateStatus: (id: string, status: CounselingRequestStatus) => void
  assignCounselor: (id: string, counselor: string) => void
  addNote: (id: string, note: string) => void
  deleteRequest: (id: string) => void
}

const seedRequests: CounselingRequest[] = [
  {
    id: 'cr1',
    fullName: 'Priya Verma',
    mobile: '9988776655',
    whatsapp: '9988776655',
    email: 'priya.verma@example.com',
    city: 'Kanpur',
    state: 'Uttar Pradesh',
    examName: 'JEE Main',
    rank: '45000',
    category: 'OBC',
    stateQuota: 'Yes',
    homeState: 'Uttar Pradesh',
    preferredBranch: 'Computer Science',
    preferredCollege: 'AKTU Colleges',
    counselingType: 'AKTU Counseling',
    additionalQuery: 'I want CS branch in a good AKTU college near Lucknow or Kanpur.',
    status: 'New',
    assignedCounselor: '',
    notes: '',
    createdAt: '2026-06-18',
  },
  {
    id: 'cr2',
    fullName: 'Arjun Nair',
    mobile: '9876001122',
    whatsapp: '9876001122',
    email: 'arjun.nair@example.com',
    city: 'Kochi',
    state: 'Kerala',
    examName: 'NEET UG',
    rank: '55000',
    category: 'General',
    stateQuota: 'Yes',
    homeState: 'Kerala',
    preferredBranch: 'MBBS',
    preferredCollege: 'Government Medical College',
    counselingType: 'NEET Counseling',
    additionalQuery: 'Need help with Kerala state quota and AIQ rounds.',
    status: 'Contacted',
    assignedCounselor: 'Dr. Priya Agarwal',
    notes: 'Called on 19 June. Shared cutoff list for Kerala. Follow up on 22 June.',
    createdAt: '2026-06-17',
  },
]

export const useCounselingRequestStore = create<CounselingRequestState>()(
  persist(
    (set) => ({
      requests: seedRequests,
      addRequest: (r) =>
        set((s) => ({
          requests: [
            ...s.requests,
            {
              ...r,
              id: `cr-${Date.now()}`,
              status: 'New',
              assignedCounselor: '',
              notes: '',
              createdAt: new Date().toISOString().split('T')[0],
            },
          ],
        })),
      updateStatus: (id, status) =>
        set((s) => ({
          requests: s.requests.map((r) => (r.id === id ? { ...r, status } : r)),
        })),
      assignCounselor: (id, counselor) =>
        set((s) => ({
          requests: s.requests.map((r) => (r.id === id ? { ...r, assignedCounselor: counselor } : r)),
        })),
      addNote: (id, note) =>
        set((s) => ({
          requests: s.requests.map((r) => (r.id === id ? { ...r, notes: note } : r)),
        })),
      deleteRequest: (id) =>
        set((s) => ({ requests: s.requests.filter((r) => r.id !== id) })),
    }),
    { name: 'skill021_counseling_requests' }
  )
)
