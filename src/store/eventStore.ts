import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type HackathonCategory = 'School Level' | 'College Level' | 'National' | 'International' | 'Startup Competition' | 'Innovation Challenge'

export interface Hackathon {
  id: string
  name: string
  organizer: string
  description: string
  category: HackathonCategory
  startDate: string
  endDate: string
  registrationDeadline: string
  prize: string
  mode: 'Online' | 'Offline' | 'Hybrid'
  status: 'Upcoming' | 'Ongoing' | 'Completed'
  publishStatus: 'Published' | 'Draft'
  registrations: number
  maxTeamSize: number
  banner?: string
  registrationUrl?: string
  tags: string[]
  createdAt: string
}

interface EventState {
  hackathons: Hackathon[]
  addHackathon: (h: Omit<Hackathon, 'id' | 'createdAt' | 'registrations'>) => void
  updateHackathon: (id: string, data: Partial<Hackathon>) => void
  deleteHackathon: (id: string) => void
  toggleHackathonStatus: (id: string) => void
}

const seedHackathons: Hackathon[] = [
  {
    id: 'h1', name: 'CodeStorm 2025 — National Hackathon', organizer: 'Skills021',
    description: 'Build innovative solutions for real-world problems. Open for all college students across India. Win exciting prizes and get noticed by top companies.',
    category: 'National', startDate: '2025-08-15', endDate: '2025-08-17',
    registrationDeadline: '2025-08-10', prize: '₹5,00,000', mode: 'Online',
    status: 'Upcoming', publishStatus: 'Published', registrations: 1240, maxTeamSize: 4,
    tags: ['Web Dev', 'AI/ML', 'Open Innovation'], createdAt: '2025-06-01',
    registrationUrl: '#',
  },
  {
    id: 'h2', name: 'SchoolHack — Class 9-12 Innovation', organizer: 'Skills021',
    description: 'Exclusive hackathon for school students to showcase their tech talent.',
    category: 'School Level', startDate: '2025-09-05', endDate: '2025-09-06',
    registrationDeadline: '2025-09-01', prize: '₹50,000', mode: 'Online',
    status: 'Upcoming', publishStatus: 'Published', registrations: 340, maxTeamSize: 3,
    tags: ['School', 'Innovation', 'Coding'], createdAt: '2025-06-15',
    registrationUrl: '#',
  },
  {
    id: 'h3', name: 'StartupSprint 2025', organizer: 'Skills021 & IIT Delhi',
    description: 'Pitch your startup idea and build an MVP in 48 hours. Mentorship from top founders.',
    category: 'Startup Competition', startDate: '2025-10-01', endDate: '2025-10-03',
    registrationDeadline: '2025-09-25', prize: '₹10,00,000 + Incubation', mode: 'Hybrid',
    status: 'Upcoming', publishStatus: 'Published', registrations: 890, maxTeamSize: 5,
    tags: ['Startup', 'FinTech', 'EdTech', 'HealthTech'], createdAt: '2025-07-01',
    registrationUrl: '#',
  },
  {
    id: 'h4', name: 'Global AI Challenge 2025', organizer: 'Skills021 & Google',
    description: 'International competition to build AI solutions for sustainable development.',
    category: 'International', startDate: '2025-11-10', endDate: '2025-11-15',
    registrationDeadline: '2025-11-01', prize: '$50,000', mode: 'Online',
    status: 'Upcoming', publishStatus: 'Published', registrations: 2100, maxTeamSize: 4,
    tags: ['AI', 'Sustainability', 'Global'], createdAt: '2025-07-15',
    registrationUrl: '#',
  },
]

export const useEventStore = create<EventState>()(
  persist(
    (set) => ({
      hackathons: seedHackathons,
      addHackathon: (h) => set((s) => ({
        hackathons: [...s.hackathons, { ...h, id: `h-${Date.now()}`, registrations: 0, createdAt: new Date().toISOString().split('T')[0] }]
      })),
      updateHackathon: (id, data) => set((s) => ({
        hackathons: s.hackathons.map((h) => h.id === id ? { ...h, ...data } : h)
      })),
      deleteHackathon: (id) => set((s) => ({ hackathons: s.hackathons.filter((h) => h.id !== id) })),
      toggleHackathonStatus: (id) => set((s) => ({
        hackathons: s.hackathons.map((h) => h.id === id ? { ...h, publishStatus: h.publishStatus === 'Published' ? 'Draft' : 'Published' } : h)
      })),
    }),
    { name: 'skill021_events' }
  )
)
