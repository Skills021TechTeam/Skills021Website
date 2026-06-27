import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CounselingCategory = 'Engineering' | 'Medical' | 'Career' | 'Abroad Study'

export interface CounselingService {
  id: string
  title: string
  description: string
  category: CounselingCategory
  subcategory: string
  counselorIds: string[]
  duration: string
  price: number | 'FREE'
  features: string[]
  status: 'Published' | 'Draft'
  bookings: number
  createdAt: string
}

export interface Counselor {
  id: string
  name: string
  designation: string
  expertise: string[]
  experience: string
  rating: number
  reviews: number
  sessions: number
  photo?: string
  bio: string
  status: 'Active' | 'Inactive'
  createdAt: string
}

export interface CounselingBooking {
  id: string
  studentName: string
  studentEmail: string
  serviceId: string
  counselorId: string
  date: string
  time: string
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
  notes?: string
  createdAt: string
}

interface CounselingState {
  services: CounselingService[]
  counselors: Counselor[]
  bookings: CounselingBooking[]
  addService: (s: Omit<CounselingService, 'id' | 'createdAt' | 'bookings'>) => void
  updateService: (id: string, data: Partial<CounselingService>) => void
  deleteService: (id: string) => void
  toggleServiceStatus: (id: string) => void
  addCounselor: (c: Omit<Counselor, 'id' | 'createdAt'>) => void
  updateCounselor: (id: string, data: Partial<Counselor>) => void
  deleteCounselor: (id: string) => void
  addBooking: (b: Omit<CounselingBooking, 'id' | 'createdAt'>) => void
  updateBookingStatus: (id: string, status: CounselingBooking['status']) => void
}

const seedServices: CounselingService[] = [
  {
    id: 'cs1', title: 'JoSAA Counseling Guidance', description: 'Complete end-to-end support for JoSAA counseling — choice filling, seat allotment strategy, and document verification.',
    category: 'Engineering', subcategory: 'JoSAA Counseling', counselorIds: ['cn1'],
    duration: '3 sessions (90 min each)', price: 1999,
    features: ['Choice Filling Strategy', 'Seat Matrix Analysis', 'Cutoff Prediction', 'Mock Rounds', 'Document Checklist', '24/7 Support'],
    status: 'Published', bookings: 340, createdAt: '2025-01-01',
  },
  {
    id: 'cs2', title: 'NEET UG Counseling Support', description: 'Expert guidance for NEET UG counseling — AIQ, state quota, deemed universities and private medical colleges.',
    category: 'Medical', subcategory: 'NEET UG Counseling', counselorIds: ['cn2'],
    duration: '4 sessions (60 min each)', price: 2499,
    features: ['AIQ vs State Quota', 'College Selection', 'Cutoff Analysis', 'Deemed University Guide', 'Seat Matrix', 'Admission Process'],
    status: 'Published', bookings: 210, createdAt: '2025-01-01',
  },
  {
    id: 'cs3', title: 'Career Guidance Session', description: 'One-on-one career counseling to help you choose the right path — stream selection, skill assessment, and goal setting.',
    category: 'Career', subcategory: 'Career Guidance', counselorIds: ['cn1', 'cn3'],
    duration: '1 session (60 min)', price: 499,
    features: ['Skill Assessment', 'Stream Selection', 'Career Roadmap', 'College Selection', 'Personality Analysis'],
    status: 'Published', bookings: 890, createdAt: '2025-01-01',
  },
  {
    id: 'cs4', title: 'USA Admissions Counseling', description: 'Complete guidance for US university applications — profile building, SOP writing, LOR, and scholarship guidance.',
    category: 'Abroad Study', subcategory: 'USA Admissions', counselorIds: ['cn4'],
    duration: '5 sessions (60 min each)', price: 4999,
    features: ['University Shortlisting', 'SOP Writing', 'LOR Guidance', 'Application Review', 'Scholarship Search', 'Visa Process'],
    status: 'Published', bookings: 120, createdAt: '2025-02-01',
  },
  {
    id: 'cs5', title: 'AKTU Counseling Guidance', description: 'Expert support for AKTU (Dr. APJ Abdul Kalam Technical University) counseling process.',
    category: 'Engineering', subcategory: 'AKTU Counseling', counselorIds: ['cn1'],
    duration: '2 sessions (60 min each)', price: 999,
    features: ['College Ranking', 'Branch Selection', 'Cutoff Analysis', 'Choice Filling'],
    status: 'Published', bookings: 450, createdAt: '2025-01-15',
  },
]

const seedCounselors: Counselor[] = [
  {
    id: 'cn1', name: 'Dr. Rajesh Sharma', designation: 'Senior Education Counselor',
    expertise: ['JEE Counseling', 'JoSAA', 'AKTU', 'Career Guidance'],
    experience: '12 years', rating: 4.9, reviews: 890, sessions: 2400,
    bio: 'Former IIT Delhi alumni with 12 years of experience in engineering admissions counseling.',
    status: 'Active', createdAt: '2024-01-01',
  },
  {
    id: 'cn2', name: 'Dr. Priya Agarwal', designation: 'NEET Counseling Specialist',
    expertise: ['NEET UG', 'Medical Admissions', 'AIQ Counseling'],
    experience: '8 years', rating: 4.8, reviews: 560, sessions: 1200,
    bio: 'MBBS from AIIMS with extensive experience in NEET counseling and medical college admissions.',
    status: 'Active', createdAt: '2024-01-01',
  },
  {
    id: 'cn3', name: 'Ms. Anita Singh', designation: 'Career Counselor',
    expertise: ['Career Guidance', 'Stream Selection', 'Skill Assessment'],
    experience: '6 years', rating: 4.7, reviews: 340, sessions: 900,
    bio: 'Certified career counselor helping students find their ideal career paths.',
    status: 'Active', createdAt: '2024-06-01',
  },
  {
    id: 'cn4', name: 'Mr. Vikram Mehta', designation: 'Abroad Study Consultant',
    expertise: ['USA Admissions', 'Canada', 'UK Universities', 'Scholarships'],
    experience: '10 years', rating: 4.9, reviews: 420, sessions: 800,
    bio: 'MS from Stanford University. Helped 500+ students get into top global universities.',
    status: 'Active', createdAt: '2024-03-01',
  },
]

const seedBookings: CounselingBooking[] = [
  { id: 'cb1', studentName: 'Rahul Kumar', studentEmail: 'rahul@example.com', serviceId: 'cs1', counselorId: 'cn1', date: '2026-07-10', time: '11:00 AM', status: 'Confirmed', createdAt: '2026-06-15' },
  { id: 'cb2', studentName: 'Priya Sharma', studentEmail: 'priya@example.com', serviceId: 'cs2', counselorId: 'cn2', date: '2026-07-12', time: '2:00 PM', status: 'Pending', createdAt: '2026-06-16' },
  { id: 'cb3', studentName: 'Amit Verma', studentEmail: 'amit@example.com', serviceId: 'cs3', counselorId: 'cn1', date: '2026-07-08', time: '4:00 PM', status: 'Completed', createdAt: '2026-06-10' },
]

export const useCounselingStore = create<CounselingState>()(
  persist(
    (set) => ({
      services: seedServices,
      counselors: seedCounselors,
      bookings: seedBookings,
      addService: (s) => set((st) => ({
        services: [...st.services, { ...s, id: `cs-${Date.now()}`, bookings: 0, createdAt: new Date().toISOString().split('T')[0] }]
      })),
      updateService: (id, data) => set((st) => ({
        services: st.services.map((s) => s.id === id ? { ...s, ...data } : s)
      })),
      deleteService: (id) => set((st) => ({ services: st.services.filter((s) => s.id !== id) })),
      toggleServiceStatus: (id) => set((st) => ({
        services: st.services.map((s) => s.id === id ? { ...s, status: s.status === 'Published' ? 'Draft' : 'Published' } : s)
      })),
      addCounselor: (c) => set((st) => ({
        counselors: [...st.counselors, { ...c, id: `cn-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] }]
      })),
      updateCounselor: (id, data) => set((st) => ({
        counselors: st.counselors.map((c) => c.id === id ? { ...c, ...data } : c)
      })),
      deleteCounselor: (id) => set((st) => ({ counselors: st.counselors.filter((c) => c.id !== id) })),
      addBooking: (b) => set((st) => ({
        bookings: [...st.bookings, { ...b, id: `cb-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0] }]
      })),
      updateBookingStatus: (id, status) => set((st) => ({
        bookings: st.bookings.map((b) => b.id === id ? { ...b, status } : b)
      })),
    }),
    { name: 'skill021_counseling' }
  )
)
